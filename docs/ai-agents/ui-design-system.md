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
| `PRIMARY_NAVY` | `#0B1F3A` | `oklch(0.20 0.07 259)` | Sidebar, branded panels, dark navigation |
| `DEEP_NAVY` | `#06152B` | `oklch(0.14 0.06 259)` | Darkest brand background layer |
| `PRIMARY_BLUE` | `#2563EB` | `oklch(0.51 0.22 264)` | Primary buttons, links, active states, focus rings |
| `SECONDARY_BLUE` | `#0EA5E9` | `oklch(0.66 0.18 232)` | Secondary actions, visual highlights |
| `CYAN` | `#06B6D4` | `oklch(0.69 0.16 210)` | Charts, data visualization, accent |
| `AI_VIOLET` | `#7C3AED` | `oklch(0.49 0.25 293)` | **AI features ONLY** |
| `BACKGROUND` | `#F8FAFC` | `oklch(0.985 0 0)` | Page background |
| `CARD` | `#FFFFFF` | `oklch(1 0 0)` | Card surfaces |
| `TEXT` | `#0F172A` | `oklch(0.145 0 0)` | Primary body text |
| `MUTED_TEXT` | `#64748B` | `oklch(0.556 0 0)` | Supporting / muted text |
| `BORDER` | `#E2E8F0` | `oklch(0.922 0 0)` | Borders, dividers, input borders |
| `SUCCESS` | `#16A34A` | `oklch(0.56 0.16 145)` | Success states only |
| `WARNING` | `#D97706` | `oklch(0.64 0.17 70)` | Warning states only |
| `ERROR` | `#DC2626` | `oklch(0.58 0.22 27)` | Error states only |

### 1.2 CSS Variables (globals.css)

The Tailwind/shadcn design tokens in `frontend/src/app/globals.css` are set to:

```css
--primary: oklch(0.31 0.11 259);       /* maps to brand navy direction */
--primary-foreground: oklch(0.985 0 0);
--background: oklch(1 0 0);
--foreground: oklch(0.145 0 0);
--border: oklch(0.922 0 0);
--input: oklch(0.922 0 0);
--ring: oklch(0.31 0.11 259 / 40%);
--radius: 0.5rem;
```

### 1.3 Color Usage Rules

| Color | Use | Never Use For |
|---|---|---|
| `PRIMARY_NAVY / DEEP_NAVY` | Sidebar, dark nav, brand panels | General page backgrounds |
| `PRIMARY_BLUE` | Primary CTA buttons, links, focus, active | Decoration |
| `SECONDARY_BLUE / CYAN` | Charts, secondary buttons, visual emphasis | Primary actions |
| `AI_VIOLET` | AI Assistant, AI Evaluation, AI Insights, AI content | General UI decoration |
| `SUCCESS / WARNING / ERROR` | Semantic state only | Visual decoration |

> **Rule**: Do not use arbitrary colors for decoration. Every color decision must have a semantic reason.

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
  bg-[#1A3A7C] hover:bg-[#152F68] active:bg-[#112860]
  transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A7C]/50
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
border: 1px solid #E2E8F0
border-radius: 0.5rem
padding: p-5 or p-6
shadow: shadow-sm only
```

### 6.6 Sidebar (not yet built — reserved)

```
background: #0B1F3A (PRIMARY_NAVY)
text: white
active item: PRIMARY_BLUE highlight
icon size: size-5 (20px)
minimal decoration
```

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
Desktop:  55% brand panel (LEFT, dark navy) | 45% form panel (RIGHT, slate-50)
Tablet:   Brand panel hidden, form full width
Mobile:   Mobile logo mark + full-width form
```

### Application Pages (not yet built)

```
Desktop: Fixed sidebar (PRIMARY_NAVY) + scrollable content area (BACKGROUND)
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

## 16. Consistency Rule

> **Once a visual decision is recorded here, do NOT change it on individual pages.**
>
> If a new pattern is genuinely needed:
> 1. Update this document first
> 2. Apply it consistently across all relevant pages
> 3. Do NOT introduce one-off colors, radii, or shadows without a documented reason
