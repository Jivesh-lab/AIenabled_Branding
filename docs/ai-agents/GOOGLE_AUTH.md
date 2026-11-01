# Google sign-in and Google Calendar

Two **separate** features share one Google OAuth client and one callback URL:

| | Google sign-in | Google Calendar |
|---|---|---|
| Purpose | Prove who you are, then use your normal DBIT account | Let the agents read/create events on **your** calendar |
| Scopes | `openid email profile` (non-sensitive) | `calendar.events` (+ `openid email` to identify the Google account) |
| When | Login / sign-up pages: "Continue with Google" | Profile menu -> "Calendar, hours and reminders" -> "Connect Google Calendar" |
| Required? | No. E-mail + password keeps working | No. Everything works without it |

## How sign-in works

The browser never receives a Google token. Google only proves *"this person controls this verified Google account"*; the
account, role and permissions always come from our database.

```
Browser -> GET  /api/auth/google/start            (backend sets a one-time nonce cookie, redirects to Google)
Google  -> GET  /api/integrations/google/callback (code + signed state)
Backend:  verifies state + the cookie, exchanges the code, VERIFIES the ID token with Google's library, then:
   * Google subject already linked  -> /login?googleTicket=...   (returning user: straight in, no password)
   * e-mail matches an unlinked account -> /login?google=link&linkTicket=...  (needs that account's password; never automatic)
   * new person -> /signup?googleTicket=...   (form prefilled from Google; account is created only when the profile is complete)
Frontend: NextAuth credentials provider sends the one-time ticket to POST /api/auth/google/exchange,
          which returns the SAME user object as the password login. The normal NextAuth session is created.
```

* Tickets are random, 2-15 minutes, single-use, stored only as SHA-256 hashes.
* Accounts are matched by the Google `sub`, never by e-mail alone.
* Self-registration offers only student, faculty, mentor and investor. **Students are active at once; every other role is
  created as `pending` and cannot sign in until an administrator approves it** (existing approvals screen).
  Admin / super admin can never be chosen. The role in the database is the only role used after sign-in.
* Google-only accounts have no password (`passwordLoginEnabled: false`), and the development password shortcuts in the
  password login cannot open them.
* Status is checked when the ticket is created *and* again when it is exchanged (pending / inactive / rejected / deleted are refused).

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/auth/google/start?mode=login\|signup&returnTo=` | public | Redirects to Google |
| `GET /api/integrations/google/callback` | public (state-protected) | Single callback for sign-in AND calendar |
| `GET /api/auth/google/pending?ticket=` | ticket | Prefill for the sign-up form |
| `POST /api/auth/google/register` | ticket | Complete a first-time profile |
| `POST /api/auth/google/link` | ticket + account password (+2FA) | Link Google to an existing account |
| `POST /api/auth/google/exchange` | ticket | Ticket -> normal session |
| `GET /api/integrations/google/connect-url` | session | Start the calendar connection |
| `GET /api/integrations/google/connections` | session | List this user's connected Google accounts |
| `DELETE /api/integrations/google[/connections/:id]` | session | Disconnect one or all |
| `GET /api/integrations/calendar/events?from=&to=&connectionId=` | session | Read events (max 62 days) |
| `POST /api/integrations/calendar/events` | session | Create an event (idempotent via `requestId`) |

## Database changes

* `users`: `googleSub` (unique, partial), `authProviders`, `passwordLoginEnabled`, `avatarUrl`; `passwordHash` is optional only when `passwordLoginEnabled` is false.
* `authtickets` (new): hashed one-time tickets with a TTL index.
* `calendarconnections`: `accountSub`, `isPrimary`; uniqueness is now (`userId`, `provider`, `accountSub`) so one person can connect several Google accounts. The old index is dropped on startup (`syncIndexes`).

## Environment (backend/.env - never the frontend)

```
GOOGLE_CLIENT_ID=          # from the existing "Ai_branding" OAuth client
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback
INTEGRATIONS_ENCRYPTION_KEY=   # long random string; encrypts stored calendar tokens
FRONTEND_URL=http://localhost:3000
JWT_SECRET=                    # signs the OAuth state
```

Sign-in needs only the first three + `FRONTEND_URL`; saving calendar tokens also needs `INTEGRATIONS_ENCRYPTION_KEY`.
The frontend needs no Google variables.

## Google Cloud Console (existing project and OAuth client)

1. **Authorized redirect URIs** must contain exactly `http://localhost:5000/api/integrations/google/callback` (development).
2. **Data access / scopes:** `calendar.events` is what the app requests. (`calendar.events.readonly` is covered by it and is not requested separately.) `openid`, `email`, `profile` need no listing.
3. **Audience:** while the app is in *Testing*, **only the test users you list (max 100) can complete OAuth**. Anyone else sees "access blocked".
4. Google shows an "unverified app" warning in Testing; test users click *Advanced -> Continue*.

### Testing-mode limits to know about

* Only listed test users can sign in or connect a calendar - not arbitrary public users.
* For an **external** app in Testing that uses sensitive scopes (Calendar), Google **expires refresh tokens after 7 days**. A user's calendar then shows "needs reconnecting" and they connect again (the app handles this - it never crashes, it asks them to reconnect). Sign-in is unaffected because it does not use refresh tokens.
* Up to 100 test users, and the OAuth client secret / consent configuration changes can take a few minutes to apply.

### Before a public launch

* Publish the app (*In production*). Because `calendar.events` is a **sensitive** scope, Google requires **OAuth app verification**: a verified domain, a public homepage and privacy policy that describes Calendar use, a scope justification, and usually a short demo video. Verification can take days to weeks; until then users see the unverified warning and there is a 100-user cap.
* Register the **production** backend callback, e.g. `https://api.your-domain.edu/api/integrations/google/callback`, in *Authorized redirect URIs*, and set `GOOGLE_REDIRECT_URI` to exactly the same value.
* Set `FRONTEND_URL` to the production frontend origin (`https://app.your-domain.edu`), add it to the backend CORS allow-list, and serve both over **HTTPS** (cookies are `Secure` when `NODE_ENV=production`).
* Keep `NODE_ENV=production`, `DEV_AUTH_FALLBACK` off, and a strong `JWT_SECRET` / `INTEGRATIONS_ENCRYPTION_KEY`.

## Security notes

* Client secret and all tokens stay on the backend. Calendar access/refresh tokens are AES-256-GCM encrypted at rest and are never returned by any API or written to logs (only reason codes are logged).
* OAuth `state` is signed, expires in 10 minutes and is **single-use** (a server-side nonce is spent on the callback). Sign-in additionally binds the callback to the browser that started it via an HttpOnly, SameSite=Lax cookie (prevents login-CSRF).
* Redirects only ever go to fixed frontend paths; `returnTo` must match `/workspace/...` and never admin areas.
* Every calendar call is scoped by the authenticated user id; a `connectionId` that belongs to someone else is treated as "not connected".
* Existing weaknesses in the **password** login that were found while doing this and **not** removed because they are outside this change: built-in development passwords / e-mail aliases are accepted for seeded roles, and a `123456` two-factor shortcut exists outside production. They should be removed before any real deployment. Two related defects were fixed: an administrator's deactivation of a student is no longer undone by typing the e-mail into the login form, and none of these shortcuts can open a Google-only account.
