# AAI–DBITIC UI Design System

*Single source of truth for all UI decisions. Updated iteratively as pages are built.*
*Last updated: Login page — Step 1*

---

## 1. Color Palette

| Token | Value | Usage |
|---|---|---|
| Brand Navy (primary) | `#1A3A7C` | Primary buttons, links, CTAs |
| Brand Navy hover | `#152F68` | Button hover state |
| Brand Navy active | `#112860` | Button active/pressed |
| Brand Panel bg | `#0B1E3D` | Left brand panel base |
| Brand Panel glow | `#1E4080` | Subtle radial gradient on brand panel |
| Slate 50 | `#F8FAFC` | Right panel / form background |
| Slate 200 | `#E2E8F0` | Input borders, separators |
| Slate 400 | `#94A3B8` | Placeholder, muted text |
| Slate 500 | `#64748B` | Supporting text |
| Slate 700 | `#334155` | Form labels |
| Slate 900 | `#0F172A` | Headings on light backgrounds |
| Blue 300 | `#93C5FD` | Brand panel accent text |
| Blue 400 | `#60A5FA` | Eyebrow label on brand panel |
| Blue 600 | `#2563EB` | Links, focus rings |
| Red 400/500 | `#F87171 / #EF4444` | Validation errors |
| Emerald 300 | `#6EE7B7` | Pipeline "Impact" stage accent |

### Semantic Status Colors (reserved — to be applied when status components are built)
- **Success** → green family (`#16A34A` / `#DCFCE7`)
- **Warning** → amber family (`#D97706` / `#FEF3C7`)
- **Error/Destructive** → red family (`#DC2626` / `#FEE2E2`)
- **Info** → blue family (`#2563EB` / `#EFF6FF`)

---

## 2. Typography

- **Font family**: Geist Sans (`--font-geist-sans`) — loaded via `next/font/google`
- **Mono font**: Geist Mono (`--font-geist-mono`)

### Scale used so far

| Role | Size | Weight | Notes |
|---|---|---|---|
| Brand panel heading | `2.6rem` / ~`41.6px` | 700 bold | `leading-[1.15] tracking-tight` |
| Page heading (h2) | `1.5rem` / `24px` | 700 bold | `tracking-tight` |
| Eyebrow label | `11px` | 600 semibold | `tracking-[0.18em] uppercase` |
| Body / description | `~15px` | 400 | `leading-[1.75]` |
| Form labels | `14px` | 500 medium | |
| Supporting / subtitle | `14px` | 400 | `text-slate-500` |
| Small / captions | `11–12px` | 400–500 | Pipeline stages, error messages |

---

## 3. Spacing

- Tailwind default scale used throughout.
- Form field vertical gap: `space-y-5` between groups.
- Field inner gap (label→input): `space-y-1.5`.
- Section gaps on brand panel: `gap-12`.
- Right panel horizontal padding: `px-6 sm:px-10 lg:px-14`.
- Brand panel padding: `p-12`.

---

## 4. Border Radius

- Inputs: default shadcn (matches `--radius` CSS var, `0.625rem`)
- Buttons: `rounded-md` (standard)
- Logo mark: `rounded-lg`
- Pipeline badges: `rounded-full`

---

## 5. Shadows & Elevation

- Login page: **no card shadow** — the two-panel layout creates depth through color contrast alone.
- Social buttons: `border border-slate-200` only — no shadow.
- Avoid decorative `box-shadow` unless it improves comprehension.

---

## 6. UI Elements

### Primary Button
```
bg-[#1A3A7C] hover:bg-[#152F68] active:bg-[#112860]
h-10 rounded-md px-4 text-sm font-semibold text-white
focus-visible:ring-2 focus-visible:ring-[#1A3A7C]/50
disabled:opacity-60 disabled:cursor-not-allowed
```

### Input Fields
```
h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400
focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600
[error]: border-red-400 focus-visible:ring-red-400/30 focus-visible:border-red-400
```

### Social Provider Buttons
```
flex items-center gap-2 rounded-md border border-slate-200 bg-white
px-3 py-2 text-sm font-medium text-slate-700
hover:bg-slate-50 hover:border-slate-300
focus-visible:ring-2 focus-visible:ring-brand/40
```

### Separator
- `bg-slate-200` — clean, no shadow.

---

## 7. Layout

### Auth pages (Login, Signup, Forgot Password)
- **Desktop**: Split-screen `flex min-h-screen`
  - Left brand panel: `lg:w-[55%]` — deep navy brand section
  - Right form panel: `flex-1` — slate-50 clean background
- **Tablet**: Left panel hidden below `lg` breakpoint; form takes full width.
- **Mobile**: Compact mobile-only logo appears above form; full-width single column.

---

## 8. Icons

- **Library**: Lucide React only
- **Standard UI size**: `size-4` (16px) for inline / form icons
- **Stroke width**: default (2px)
- **Social logos**: inline SVG (no extra package)

---

## 9. Animation (Motion)

- **Library**: `motion/react` (Motion v13)
- **Entrance**: Subtle `opacity 0→1` + `x ±16→0` on both panels, `duration 0.45s ease-out`
- **Reduced motion**: `useReducedMotion()` — x offset set to `0` when reduced motion is preferred
- **Variants**: typed as `Variants` from `motion/react`; `transition` passed as separate prop on `<motion.div>`
- **No infinite animations, no floating, no pulsing backgrounds**

---

## 10. Forms

- Library: `react-hook-form` + `zod` + `@hookform/resolvers`
- Validation mode: `onTouched`
- Error messages: below the field, `text-xs text-red-500`, `role="alert"`, `aria-describedby` linked
- Labels: always visible, never placeholder-only
- Password toggle: Lucide `Eye` / `EyeOff`, `aria-label` on button

---

## 11. Social Auth (placeholder pattern)

```ts
// TODO: Wire up real OAuth during backend/auth integration phase.
function handleSocialAuth(provider: "google" | "github" | "facebook") {
  console.info(`[AAI-DBITIC] Social auth for "${provider}" is not yet configured.`);
}
```
- No fake credentials, no redirect, no token storage.
- Buttons are visible and accessible but non-functional until OAuth integration.

---

## 12. Component Directory Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx        ← minimal pass-through
│   │   └── login/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                   ← shadcn components
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── separator.tsx
└── lib/
    └── utils.ts
```

---

## 13. Decisions NOT Yet Made (deferred)

- Signup page layout
- Dashboard layout / sidebar
- Table style
- Modal/dialog style
- Badge/status style
- Toast (Sonner) appearance
- Empty states
- Recharts / data visualization
