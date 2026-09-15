# AAI–DBITIC UI Design System

> **Frozen visual foundation for the entire AAI–DBITIC platform.**
> Every future frontend implementation must follow this document.
> Do NOT invent new visual styles without updating this document first.

*Last updated: Design system freeze — all auth pages complete.*

---

## 1. Color System

### 1.1 Tokens

| Token | Hex | CSS Variable (oklch approx.) | Purpose |
|---|---|---|---|
| `PRIMARY_DEEP` | `#03045E` | `oklch(0.20 0.12 260)` | Sidebar, branded panels, dark navigation |
| `PRIMARY` | `#023EBA` | `oklch(0.40 0.20 260)` | Primary buttons, links, active states, focus rings |
| `ACCENT_CYAN` | `#00B4D8` | `oklch(0.65 0.15 230)` | AI features, charts, data visualization |
| `LIGHT_CYAN` | `#CAF0F8` | `oklch(0.92 0.05 230)` | Subtle highlights, soft backgrounds |
| `ACCENT_GOLD` | `#FBB02D` | `oklch(0.78 0.18 75)` | Warm highlights, secondary actions, visual emphasis |
| `SURFACE` | `#FFFFFF` | `oklch(1 0 0)` | Card surfaces |
| `BACKGROUND` | `#F8FAFC` | `oklch(0.985 0 0)` | Page background |
| `TEXT` | `#0F172A` | `oklch(0.145 0 0)` | Primary body text |
| `MUTED_TEXT` | `#64748B` | `oklch(0.556 0 0)` | Supporting / muted text |
| `BORDER` | `#D8EAF0` | `oklch(0.92 0.02 230)` | Borders, dividers, input borders |
| `SUCCESS` | `#16A34A` | `oklch(0.56 0.16 145)` | Success states only |
| `WARNING` | `#D97706` | `oklch(0.64 0.17 70)` | Warning states only |
| `ERROR` | `#DC2626` | `oklch(0.58 0.22 27)` | Error states only |

### 1.2 CSS Variables (globals.css)

`frontend/src/app/globals.css` is the single source of truth. Ocean Royale is
declared once inside `@theme inline`, which generates the Tailwind utilities that
components must use instead of hardcoded hex values.

```css
/* Brand tokens -> utilities: bg-brand, text-brand-deep, border-line, ring-brand/50 ... */
--color-brand-deep: #03045E;       /* PRIMARY_DEEP  - logo mark, auth brand panels */
--color-brand: #023EBA;            /* PRIMARY       - CTAs, links, active, focus */
--color-brand-hover: #023399;
--color-brand-active: #01287A;
--color-brand-cyan: #00B4D8;       /* ACCENT_CYAN   - AI features, charts */
--color-brand-cyan-soft: #CAF0F8;  /* LIGHT_CYAN    - soft backgrounds */
--color-brand-cyan-ink: #0E7490;   /* readable cyan TEXT on a cyan tint */
--color-brand-gold: #FBB02D;       /* ACCENT_GOLD   - warm emphasis */
--color-brand-gold-ink: #A16207;   /* readable gold TEXT on a gold tint */
--color-ink: #0F172A;              /* TEXT */
--color-muted-ink: #64748B;        /* MUTED_TEXT */
--color-line: #D8EAF0;             /* BORDER */
--color-canvas: #F8FAFC;           /* BACKGROUND */
--color-icon: #475569;             /* resting navigation / control icons */
--color-nav-hover: #F1FAFC;        /* navigation row hover on a light surface */
--color-success: #16A34A;          /* APPROVED - state only */
--color-danger: #DC2626;           /* REJECTED, validation errors - state only */
```

The shadcn semantic variables are mapped onto the same palette:

```css
--primary: #023EBA;
--primary-foreground: oklch(0.985 0 0);
--border: #D8EAF0;
--input: #D8EAF0;
--ring: color-mix(in oklch, #023EBA 40%, transparent);
--sidebar: #FFFFFF;
--sidebar-foreground: #0F172A;
--sidebar-primary: #023EBA;
--sidebar-accent: #CAF0F8;
--sidebar-accent-foreground: #023EBA;
--sidebar-border: #D8EAF0;
--radius: 0.5rem;
```

**Usage rule**: write `bg-brand`, `border-line`, `text-muted-ink` — never
`bg-[#023EBA]`. Semantic `SUCCESS` / `WARNING` / `ERROR` keep their own hex values
and are unaffected by the brand palette.

### 1.3 Color Usage Rules

| Color | Use | Never Use For |
|---|---|---|
| `PRIMARY_DEEP` | Sidebar, dark nav, brand panels | General page backgrounds |
| `PRIMARY` | Primary CTA buttons, links, focus, active | Decoration |
| `ACCENT_CYAN / ACCENT_GOLD` | AI features, charts, secondary buttons, visual emphasis | Primary actions |
| `SUCCESS / WARNING / ERROR` | Semantic state only | Visual decoration |

> **Rule**: Do not use arbitrary colors for decoration. Every color decision must have a semantic reason. AI features must use the Ocean Royale palette (mainly `#00B4D8` and `#023EBA`), not a separate purple/violet palette.

---

## 2. Typography

### 2.1 Font Family

- **Primary**: Inter, sans-serif (`--font-inter`) via `next/font/google`
- **Rule**: Use ONE primary font throughout the entire application. Do NOT introduce additional font families (e.g. Space Grotesk, Outfit, etc.) unless explicitly approved.
- **Allowed Weights**: 400 Regular, 500 Medium, 600 Semibold, 700 Bold

### 2.2 Typography Hierarchy

| Role | Size | Weight | Line Height | Color | Tailwind Class Example |
|---|---|---|---|---|---|
| Page Title | `32px` | 700 (Bold) | 1.2 | `#0F172A` | `text-[32px] font-bold leading-[1.2] text-slate-900` |
| Section Heading | `20–22px` | 600 (Semibold) | 1.3 | `#0F172A` | `text-xl font-semibold leading-[1.3] text-slate-900` |
| Card Title | `16–18px` | 600 (Semibold) | normal | `#0F172A` | `text-base font-semibold text-slate-900` |
| Body | `14–16px` | 400 (Regular) | 1.5–1.6 | `#0F172A` | `text-sm leading-relaxed text-slate-900` |
| Supporting Text | `13–14px` | 400 (Regular) | normal | `#64748B` | `text-[13px] text-slate-500` or `text-sm text-slate-500` |
| Labels | `13–14px` | 500 (Medium) | normal | `#0F172A` | `text-sm font-medium text-slate-900` |
| Metadata | `12–13px` | 400–500 | normal | `#64748B` | `text-xs text-slate-500` |
| Buttons | `14px` | 500–600 | normal | context | `text-sm font-semibold` |
| Sidebar Labels | `11–12px` | 600 (Semibold) | normal | `#64748B` | `text-xs font-semibold uppercase tracking-[0.08em] text-slate-500` |

> **Rule**: Never change typography merely to make one component look more impressive. Avoid oversized text.

---

## 3. Spacing

- **4px Base System**: Use only 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Do NOT randomly use arbitrary spacing like 13px, 17px, etc.
- **Page padding**: 32px
- **Section gap**: 24px
- **Card padding**: 20–24px
- **Field gap**: 8–12px
- **Navbar horizontal**: 24px
- **Sidebar item gap**: 4–8px

---

## 4. Border Radius

Use moderate, non-pill rounding. Avoid everything looking like a pill.

| Context | Value | Tailwind Class |
|---|---|---|
| Small controls | `8px` | `rounded-md` |
| Inputs | `10px` | `rounded-[10px]` |
| Cards | `12px` | `rounded-xl` |
| Dialogs | `14px` | `rounded-[14px]` |
| Large sections | `16px` | `rounded-2xl` |
| Badges/Tags | full | `rounded-full` (Reserved for small indicators only) |

> **Rule**: Do NOT use excessive rounding (`rounded-3xl`, `rounded-full` on cards). Keep it restrained.

---

## 5. Shadows

- **Login/Signup pages**: No card shadow — color contrast creates depth
- **Cards (dashboard)**: `shadow-sm` only — `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **Dropdowns/modals**: `shadow-lg`
- Do NOT use `shadow-2xl`, glowing shadows, or `drop-shadow` for decoration

---

## 6. Component Styles

### 6.1 Primary Button

```tsx
className="h-10 rounded-md px-4 text-sm font-semibold text-white
  bg-[#023EBA] hover:bg-[#023399] active:bg-[#01287A]
  transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#023EBA]/50
  disabled:opacity-60 disabled:cursor-not-allowed"
```

### 6.2 Input Fields

```tsx
className="h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400
  focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600
  [error]: border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400"
```

### 6.3 Form Labels

```tsx
<Label className="text-sm font-medium text-slate-700">
```
- Color is pinned via `globals.css`: `label[data-slot="label"] { color: oklch(0.32 0 0) }`
- Do NOT use primary/blue color for form labels

### 6.4 Social Auth Buttons

```tsx
className="flex flex-1 items-center justify-center gap-2 rounded-md
  border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700
  hover:bg-slate-50 hover:border-slate-300
  focus-visible:ring-2 focus-visible:ring-blue-600/40"
```

### 6.5 Cards (dashboard pages — not yet built)

```
background: #FFFFFF
border: 1px solid #D8EAF0
border-radius: 0.5rem
padding: p-5 or p-6
shadow: shadow-sm only
```

### 6.6 Sidebar (built — `DashboardSidebar`)

**The sidebar is LIGHT.** Navigation stays visually quiet so page content and
primary actions carry the attention. Ocean Royale appears through the active
state and small accents only — never as a full-height navy panel. This is a
frozen decision: do not reintroduce a dark sidebar for any role.

| Element | Token | Value |
|---|---|---|
| Background | `bg-white` | `#FFFFFF` |
| Border | `border-line` | `#D8EAF0` |
| Main text | `text-ink` | `#0F172A` |
| Secondary text | `text-muted-ink` | `#64748B` |
| Icons (resting) | `text-icon` | `#475569` |
| Hover background | `bg-nav-hover` | `#F1FAFC` |
| Active background | `bg-brand-cyan-soft` | `#CAF0F8` |
| Active text / icon / indicator | `text-brand` / `bg-brand` | `#023EBA` |
| AI icon accent | `text-brand-cyan` | `#00B4D8` |
| Logo mark | `bg-brand-deep` + cyan glyph | `#03045E` / `#00B4D8` |

```
width:        240px expanded / 68px collapsed
item height:  40px, radius 8px
icon size:    size-[18px]
active row:   bg #CAF0F8, text/icon #023EBA, 3px left indicator #023EBA
hover row:    bg #F1FAFC, icon darkens to #0F172A
```

Rules:
- No glowing blue, no gradient rows, no large filled blocks for the active item.
- The AI Workspace row keeps normal `text-ink` label text; only its **icon** is cyan.
- Section labels: `11px / 600 / uppercase / tracking-[0.08em] / text-muted-ink`.

### 6.7 Badges / Status (not yet built — reserved)

```
Success:  bg-green-50 text-green-700 border-green-200
Warning:  bg-amber-50 text-amber-700 border-amber-200
Error:    bg-red-50   text-red-700   border-red-200
Info:     bg-blue-50  text-blue-700  border-blue-200
```

---

## 7. Icon Rules

- **Library**: Lucide React — the only icon library in use
- Do NOT add `@tabler/icons-react`, `react-icons`, `heroicons`, or others
- **Sizes**:
  - `16px` (`size-4`) → compact / metadata
  - `18px` (`size-[18px]`) → standard buttons / navigation
  - `20px` (`size-5`) → primary navigation
  - `24px` (`size-6`) → prominent action
- **Rule**: Do not make icons huge just to fill space.
- Stroke width: default (`2px`)
- Brand/social logos: inline SVG in `src/components/icons/` — no extra package

---

## 8. Animation Rules (Motion v13)

### Allowed
- Page entrance: `opacity 0→1 + x ±16→0`, `duration: 0.45s, ease: easeOut`
- State transitions: subtle, `< 0.3s`
- Hover interactions: `transition-colors duration-150`
- Dialog open/close

### Forbidden
- Infinite decorative animations (`animate-pulse`, `animate-bounce` for decoration)
- Floating cards
- Constant glowing or pulsing backgrounds
- Excessive parallax

### Implementation pattern

```tsx
// Variants typed as Variants from motion/react
const panelVariants: Variants = {
  hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -16 },
  visible: { opacity: 1, x: 0 },
};

<motion.div
  variants={panelVariants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.45, ease: "easeOut" }}
>
```

- Always use `useReducedMotion()` and set offsets to `0` when true
- Always type variants as `Variants` from `motion/react`
- Always put `transition` as a separate prop on `<motion.div>` (not inside variant objects) — required by Motion v13 type system

---

## 9. Layout System

### Auth Pages (Login · Signup · Forgot Password · Reset Password)

```
Desktop:  55% brand panel (LEFT, PRIMARY_DEEP) | 45% form panel (RIGHT, slate-50)
Tablet:   Brand panel hidden, form full width
Mobile:   Mobile logo mark + full-width form
```

### Application Pages (not yet built)

```
Desktop: Fixed sidebar (PRIMARY_DEEP) + scrollable content area (BACKGROUND)
Mobile:  Collapsible sidebar / bottom nav
```

---

## 10. Responsive Rules

Every page must work on: **desktop · laptop (1024px) · tablet (768px) · mobile (375px)**

- No horizontal overflow
- No clipped content
- Tables: horizontal scroll on mobile or column reduction
- Forms: stack vertically on mobile
- Dialogs: full-screen on mobile

---

## 11. Performance / Rendering Rules

- Prefer **server components** — use `"use client"` only when interactivity requires it
- No `useEffect` for values derivable during render
- No `setState` inside effects that depend on the same state
- Clean up: intervals, timeouts, listeners, observers
- No infinite render loops — review every `useEffect` dependency array
- No uncontrolled polling

---

## 12. Validation (Zod v4)

```ts
// Enum: use `as const` + `message` (not errorMap)
z.enum(["a", "b", "c"] as const, { message: "Select a valid option" })

// Refinement: use .refine() for cross-field validation
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
```

---

## 13. File & Component Naming

| File | Rule |
|---|---|
| `page.tsx` | Next.js required — thin re-export only |
| `layout.tsx` | Next.js required — only when a route genuinely needs its own layout |
| `_components/*.tsx` | Named by functionality: `LoginForm.tsx`, `SignupBrandPanel.tsx` |
| `components/icons/*.tsx` | Named by brand: `GoogleIcon.tsx`, `GitHubIcon.tsx` |
| `components/ui/*.tsx` | shadcn components only — do not customize here |

---

## 14. Mock Data

Until backend integration:

```
src/mock/
├── users.ts
├── projects.ts
├── notifications.ts
```

- Use realistic AAI–DBITIC examples
- Do NOT hardcode datasets inside JSX
- Do NOT fake authentication or AI responses

---

## 15. Pages Status

| Page | Route | Status |
|---|---|---|
| Root redirect | `/` | ✅ Done → redirects to `/login` |
| Login | `/login` | ✅ Done |
| Signup | `/signup` | ✅ Done |
| Forgot Password | `/forgot-password` | ⏳ Pending |
| Reset Password | `/reset-password` | ⏳ Pending |
| Student Dashboard | `/student/dashboard` | ⏳ Pending |
| Faculty Dashboard | `/faculty/dashboard` | ⏳ Pending |
| Mentor Dashboard | `/mentor/dashboard` | ⏳ Pending |
| Industry Portal | `/industry/...` | ⏳ Pending |
| Investor Portal | `/investor/...` | ⏳ Pending |
| Incubation Admin | `/admin/...` | ⏳ Pending |
| Management | `/management/...` | ⏳ Pending |

---

## 15.1 Student Dashboard — Locked Structure

> **Status: structure frozen. Section detail is specified one section at a time
> before any of it is built.** Do not implement sections ahead of their spec.

**Design intent** — the dashboard answers *"here is what is happening with your
innovation, and here is what you should do next"*, not *"here are many things
about you."* Prioritise work and deadlines over vanity metrics.

### Section order (locked)

1. **Header** — `Student Dashboard` + supporting line + `+ Submit New Idea` (the single primary CTA)
2. **At a Glance** — compact KPI row: Active Projects · Pending Reviews · Upcoming Meetings · Milestones Due
3. **My Projects** — the largest content area
4. **Upcoming Meetings**
5. **Incubation Journey** — Idea → Faculty Review → Department Review → Incubation Review → Prototype → Market Ready → Startup
6. **Next Actions**
7. **AI Insights** — compact
8. **Recent Activity**
9. **Funding Opportunities** — small preview only

### Desktop grid

```
Header                                        [+ Submit New Idea]
─────────────────────────────────────────────────────────────────
KPI row (4 up, full width)
─────────────────────────────────────┬───────────────────────────
MY PROJECTS                          │ UPCOMING MEETINGS
─────────────────────────────────────┼───────────────────────────
INCUBATION JOURNEY                   │ NEXT ACTIONS
─────────────────────────────────────┼───────────────────────────
AI INSIGHTS                          │ RECENT ACTIVITY
─────────────────────────────────────┴───────────────────────────
FUNDING OPPORTUNITIES (full width)
```

### Content rules

- **Every project card** must answer: where am I · what stage · what is next · when is it due.
  Category, mentor, progress %, **next milestone**, **due date**.
- **Next Actions** is a task list (task · project · due), not an analytics card.
- **AI Insights** is a compact intelligence layer: small cyan icon, `#CAF0F8`
  information block, blue links. It must never be the visually dominant section.
- **Funding** shows 2–3 opportunities with a `View all →` link. It is a preview,
  not the funding system.

### Excluded from this dashboard

| Item | Reason |
|---|---|
| Innovation Score banner (`84/100`) | Vanity metric; does not tell the student what to do. May return later as a small KPI or under Profile / Performance. |
| "Top 15% of cohort" | Introduces academic ranking that is not meaningful to incubation. |
| Large gradient hero banner | Violates the restrained-surface rule (§6.5). |
| Oversized AI section / purple accents | AI is a layer, not the product's headline. Ocean Royale only — see §1.3. |
| Copy like "Your innovation journey is looking bright." | Generic filler. Supporting lines state what the page does. |

### Colour treatment

- KPI cards: `bg-white`, `border-line`, `shadow-sm`, primary number `text-brand`
  (`#023EBA`), small icon `text-brand-cyan` (`#00B4D8`). **No gradients.**
- `#CAF0F8` — sparingly, for information blocks only.
- `#FBB02D` — attention / priority states only (overdue, urgent). Never decorative.
- No purple anywhere.

---

## 15.2 Project Status Model — Locked

Every project carries **three independent fields**. They are never merged into
one enum, and one is never displayed as another.

| Field | Values | Answers |
|---|---|---|
| **Review Status** | `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `REVISION_REQUESTED` → `APPROVED` / `REJECTED` | Where is this in the approval process? |
| **Pipeline Position** | `FACULTY_REVIEW` → `DEPARTMENT_REVIEW` → `INCUBATION_REVIEW` | Which reviewer holds it? |
| **Maturity** | `IDEA` → `CONCEPT` → `PROTOTYPE` → `MVP` → `MARKET_READY` | How developed is the thing itself? |

A project can be `PROTOTYPE` + `UNDER_REVIEW` + `DEPARTMENT_REVIEW` at the same time.
**Never use maturity as review status.**

Defined once in code: `frontend/src/types/status.ts` (values, labels, badge tones).

### Status colours

| State | Colour | Token |
|---|---|---|
| `REVISION_REQUESTED` | Gold `#FBB02D` | `brand-gold` / `brand-gold-ink` |
| `APPROVED` | Green `#16A34A` | `success` |
| `REJECTED` | Red `#DC2626` | `danger` |
| `UNDER_REVIEW` | Primary `#023EBA` | `brand` |
| `SUBMITTED` | Cyan | `brand-cyan-ink` |
| `DRAFT` | Muted | `muted-ink` |
| AI content | Cyan `#00B4D8` | `brand-cyan` — **no violet anywhere, including AI cards** |

`REVISION_REQUESTED` is the most actionable state a student can be in. It must
always be visible and filterable wherever projects are listed.

---

## 16. Consistency Rule

> **Once a visual decision is recorded here, do NOT change it on individual pages.**
>
> If a new pattern is genuinely needed:
> 1. Update this document first
> 2. Apply it consistently across all relevant pages
> 3. Do NOT introduce one-off colors, radii, or shadows without a documented reason
