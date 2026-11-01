const { OAuth2Client } = require('google-auth-library');

/**
 * The only place that talks to Google's OAuth endpoints for identity. It uses Google's own library, which
 * verifies the ID token's signature, issuer, audience and expiry against Google's published keys.
 * Tests replace the client with setClientFactory().
 */
const SIGN_IN_SCOPES = ['openid', 'email', 'profile'];
// Calendar access is a SEPARATE grant, requested only when a person chooses to connect a calendar.
// calendar.events covers reading and creating events; openid/email only identify which Google account was connected.
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'openid', 'email'];

let factory = () => new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});
function setClientFactory(fn) {
  factory = fn;
}
function resetClientFactory() {
  factory = () => new OAuth2Client({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, redirectUri: process.env.GOOGLE_REDIRECT_URI });
}

class GoogleIdentityError extends Error {
  constructor(message, code = 'GOOGLE_IDENTITY_FAILED') {
    super(message);
    this.name = 'GoogleIdentityError';
    this.code = code;
  }
}

function authUrl({ scopes, state, offline = false, loginHint }) {
  return factory().generateAuthUrl({
    scope: scopes,
    state,
    access_type: offline ? 'offline' : 'online',
    // Consent every time for calendar so Google returns a refresh token; account chooser for sign-in.
    prompt: offline ? 'consent select_account' : 'select_account',
    include_granted_scopes: false,
    login_hint: loginHint,
  });
}

/** Exchanges the authorization code and returns the tokens plus the VERIFIED Google identity. */
async function exchange(code) {
  const client = factory();
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    throw new GoogleIdentityError('Google did not accept the sign-in. Please try again.', 'GOOGLE_CODE_REJECTED');
  }
  if (!tokens || !tokens.id_token) throw new GoogleIdentityError('Google did not return an identity.', 'GOOGLE_NO_IDENTITY');
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new GoogleIdentityError('The Google identity could not be verified.', 'GOOGLE_IDENTITY_INVALID');
  }
  if (!payload || !payload.sub) throw new GoogleIdentityError('The Google identity could not be verified.', 'GOOGLE_IDENTITY_INVALID');
  return {
    tokens,
    claims: {
      sub: String(payload.sub),
      email: String(payload.email || '').toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name || '',
      picture: payload.picture || null,
    },
  };
}

module.exports = { SIGN_IN_SCOPES, CALENDAR_SCOPES, authUrl, exchange, setClientFactory, resetClientFactory, GoogleIdentityError };
