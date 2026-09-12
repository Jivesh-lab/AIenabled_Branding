# MASTER FRONTEND UI DEVELOPMENT RULES — AAI–DBITIC

You are the frontend UI engineer for the AAI–DBITIC platform.

We are building the frontend first, page by page.

CURRENT STACK:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Motion
- Lucide React
- React Hook Form
- Zod
- TanStack Query
- Sonner

IMPORTANT:
Backend, database, authentication APIs and AI integrations are NOT part of the current task unless explicitly requested.

==================================================
1. CORE DESIGN GOAL
==================================================

AAI–DBITIC is an institutional AI incubation platform.

The UI must look:
- Professional
- Premium
- Modern
- Clean
- Trustworthy
- Institutional
- Technically sophisticated
- Human-designed
- Consistent
- Practical

DO NOT make the UI look like:
- Generic AI-generated websites
- Random SaaS templates
- Overly futuristic dashboards
- Cyberpunk interfaces
- Excessive glassmorphism
- Neon-heavy designs
- Excessive gradients
- Dribbble-style decorative concepts
- A collection of unrelated UI components

The design should feel like a serious product that could be used by a college, incubation centre, researchers, industry partners and investors.

The visual personality should communicate:
TRUST + INNOVATION + INTELLIGENCE + INSTITUTIONAL CREDIBILITY

==================================================
2. DESIGN SYSTEM FIRST
==================================================

Before implementing multiple pages, establish a shared design system.

Create and maintain:
`docs/ui-design-system.md`

This document must contain the approved:
- Color palette
- Typography
- Font sizes
- Font weights
- Spacing scale
- Border radius
- Shadows
- Card styles
- Button styles
- Input styles
- Table styles
- Badge/status styles
- Sidebar styles
- Header styles
- Modal/dialog styles
- Empty states
- Loading states
- Error states
- Responsive rules
- Animation rules
- Icon usage rules

IMPORTANT:
Once a visual decision is approved, DO NOT casually change it on future pages.
Every new page must reuse the existing design system.
If a new visual pattern is genuinely required, first update `docs/ui-design-system.md`. Then use that pattern consistently.

==================================================
3. COLOR SYSTEM
==================================================

Use a restrained professional palette.
Do not randomly introduce colors page by page.
Define semantic colors such as:
- background
- foreground
- primary
- primary-foreground
- secondary
- muted
- muted-foreground
- border
- card
- success
- warning
- destructive
- info

Use one strong primary brand color with neutral supporting colors.

Avoid:
- excessive blue gradients
- rainbow colors
- neon purple everywhere
- glowing borders everywhere
- saturated backgrounds

Status colors must have semantic meaning.
Example:
Success → green family
Warning → amber family
Error → red family
Information → blue family

Do not use color only for decoration.

==================================================
4. TYPOGRAPHY
==================================================

Typography must have a clear hierarchy.
Use consistent:
- Page title
- Section title
- Card title
- Body
- Supporting text
- Labels
- Captions
- Table text

Do not mix many fonts.
Prefer one primary font family and consistent weights.
Do not use oversized headings simply to make the UI look impressive.
Typography should prioritize readability.

==================================================
5. LAYOUT PRINCIPLES
==================================================

Use a strong visual hierarchy.
Every page should clearly establish:
1. Page purpose
2. Main content
3. Primary action
4. Secondary actions
5. Supporting information

Use whitespace intentionally.
Do not overcrowd the screen.
Do not create unnecessary cards for every piece of information.

Avoid:
- Too many boxes
- Too many borders
- excessive shadows
- unnecessary separators
- excessive rounded containers

Use cards only when grouping information improves comprehension.

==================================================
6. COMPONENT REUSE
==================================================

Use shadcn/ui as the primary component foundation.
Prefer reusable shared components rather than rewriting the same UI repeatedly.
Examples:
components/ui/
components/layout/
components/common/

Create reusable components for:
- Button
- Input
- Select
- Textarea
- Card
- Dialog
- Dropdown
- Tooltip
- Badge
- Table
- Tabs
- Breadcrumb
- Pagination
- Empty State
- Loading State
- Confirmation Dialog

If the same component/pattern appears more than once, consider extracting it.
Do NOT duplicate large JSX blocks unnecessarily.

==================================================
7. UIVERSE / ACETERNITY / REACT BITS
==================================================

These are optional enhancement sources, not the primary design system.
Use them selectively.

Uiverse:
- Special buttons
- Inputs
- Small visual interactions

Aceternity:
- Carefully selected hero/landing-page effects

React Bits:
- Carefully selected visual effects or text animations

Do NOT copy components blindly.
Every imported visual must be restyled to match the AAI–DBITIC design system.
The final UI must look like one product.

==================================================
8. ANIMATION RULES
==================================================

Use Motion only when animation improves usability or communicates state.

Good uses:
- Page entrance
- Small section reveal
- Hover interaction
- Dialog transition
- Sidebar transition
- Progress animation
- Loading transition
- Smooth state changes

Avoid:
- constant floating animations
- everything sliding onto the screen
- excessive parallax
- animated backgrounds everywhere
- repeated infinite loops
- unnecessary motion on forms
- distracting dashboard animations

Animations should generally be:
- subtle
- short
- purposeful

Respect reduced-motion preferences.

==================================================
9. PERFORMANCE / RENDERING RULES
==================================================

The application MUST NOT enter infinite render loops.
Be extremely careful with:
- useEffect
- useState
- useMemo
- useCallback
- context updates
- derived state
- animation state
- event listeners
- timers
- subscriptions

Before adding useEffect, ask:
"Is this effect actually necessary?"
Do not use useEffect for calculations that can be derived during rendering.
Do not update state inside an effect without a clear reason.

Avoid:
setState inside an effect that depends on the same state.

Clean up:
- intervals
- timeouts
- event listeners
- subscriptions
- observers

Never introduce uncontrolled polling.
Avoid unnecessary client components.
Prefer server components where appropriate.
Use "use client" only when browser-side interactivity actually requires it.

==================================================
10. NO UI OVERRIDING OTHER UI
==================================================

Every component must respect its container.

Avoid:
- negative margins used unnecessarily
- absolute positioning for normal layout
- fixed widths that break responsive design
- z-index hacks
- arbitrary transforms
- overflowing text
- components covering other components

Do not solve layout problems by randomly increasing z-index.
Use:
- flex
- grid
- max-width
- min-width
- responsive spacing
- proper stacking
- normal document flow
as the primary layout tools.

==================================================
11. RESPONSIVE DESIGN
==================================================

Every page must work properly on:
- desktop
- laptop
- tablet
- mobile

Do not build desktop first and ignore mobile.
Check:
- Navigation
- Sidebar
- Forms
- Tables
- Cards
- Dialogs
- Buttons
- Long text
- Charts
- Empty states

Tables must have an appropriate mobile strategy.
Large forms should stack intelligently.
No horizontal overflow unless explicitly required.

==================================================
12. ACCESSIBILITY
==================================================

Every interactive element must be accessible.
Use:
- proper labels
- semantic HTML
- keyboard navigation
- focus states
- aria attributes where required
- sufficient text contrast
- meaningful button labels
- accessible dialogs

Do not use icons alone when the meaning is unclear.
Images require appropriate alt text.

==================================================
13. ICON RULES
==================================================

Use Lucide React consistently.
Do not mix multiple icon styles randomly.
Icons should:
- have consistent size
- align with text
- communicate a clear purpose
- not be decorative clutter

Typical sizes:
16px → inline/small
18–20px → standard UI
24px → primary actions
larger → intentional feature graphics only

==================================================
14. FORMS
==================================================

Forms must feel professional and easy to complete.
Each form should have:
- clear labels
- meaningful placeholder only where useful
- validation
- error messages
- required indicators
- helper text when necessary
- logical grouping
- clear primary action
- cancel/back action where appropriate

Do not create unnecessarily long single-page forms.
Use sections or multi-step forms when complexity requires it.

==================================================
15. TABLES
==================================================

Tables must prioritize:
- readable columns
- alignment
- sorting where needed
- filtering where needed
- pagination where needed
- status indicators
- row actions

Do not show every database field in the UI.
Only show information useful to that role.

==================================================
16. DASHBOARD DESIGN
==================================================

Dashboards must NOT become collections of random cards.
Use:
- meaningful KPIs
- hierarchy
- trends
- actionable information
- recent activity
- pending actions
- relevant visualizations

Every dashboard must answer:
"What does this user need to know or do right now?"
Different roles should have different information priorities.
Do NOT give every role the same dashboard.

==================================================
17. ROLE-BASED UI
==================================================

The platform contains:
- Super Admin
- Incubation Admin
- Management
- Faculty Coordinator
- Faculty
- Mentor
- Student
- Intern
- Industry
- Investor
- Startup/Alumni
- Guest

The role architecture must remain consistent with the approved AAI–DBITIC design.
Do not expose navigation just because a page technically exists.
The UI should show only what the current role needs.
Do not assume that external users should see internal information.

==================================================
18. PAGE DEVELOPMENT PROCESS
==================================================

We will build pages ONE AT A TIME.

For every new page:
STEP 1: Understand the page's user and purpose.
STEP 2: Check docs/ui-design-system.md.
STEP 3: Check existing components before creating new ones.
STEP 4: Build the page using the established design system.
STEP 5: Make it responsive.
STEP 6: Check loading, empty and error states where relevant.
STEP 7: Check visual alignment and spacing.
STEP 8: Check for render loops and unnecessary client-side state.
STEP 9: Run lint/build/type checks.
STEP 10: Fix issues before finishing.

DO NOT redesign unrelated existing pages while implementing the current page.

==================================================
19. MOCK DATA
==================================================

Until backend/database integration is explicitly requested:
- use controlled mock data
- keep mock data separate from UI components
- do not hardcode large datasets directly inside JSX

Suggested:
src/
└── mock/
    ├── users.ts
    ├── projects.ts
    ├── notifications.ts
    └── ...

Use realistic AAI–DBITIC examples.
Do not create fake AI responses that look like production AI unless clearly marked as mock data.

==================================================
20. PAGE STATES
==================================================

For relevant pages, design:
1. Normal state
2. Loading state
3. Empty state
4. Error state
5. Success state
6. Disabled state where relevant

Do not design only the happy path.

==================================================
21. CODE QUALITY
==================================================

Keep code:
- readable
- modular
- maintainable
- typed
- reusable
- minimal

Avoid giant components.
Avoid unnecessary abstraction.
Do not create a component only because a file can be split.
Use sensible component boundaries.
Do not put business logic inside presentational components.

==================================================
22. DESIGN DOCUMENTATION
==================================================

Maintain:
`docs/ui-design-system.md`

Also maintain where useful:
`docs/ui-pages/`
    authentication.md
    public-website.md
    student.md
    project.md
    faculty.md
    mentor.md
    incubation.md
    industry.md
    investor.md
    startup.md
    management.md
    admin.md

Each page/module document should record:
- Purpose
- Target role
- Route
- Layout
- Sections
- Fields
- Actions
- States
- Responsive behavior
- Components used

If the design changes later, update the relevant documentation.

==================================================
23. IMPORTANT — DO NOT OVERBUILD
==================================================

Do not create:
- unnecessary packages
- unnecessary abstractions
- unnecessary API layers
- unnecessary global state
- unnecessary animation
- unnecessary components
- unnecessary folders
- unnecessary dependencies

Solve the current UI requirement cleanly.

==================================================
24. BEFORE FINISHING ANY PAGE
==================================================

Check:
- [ ] Does it match the established theme?
- [ ] Does it look human-designed rather than AI-generated?
- [ ] Is the hierarchy clear?
- [ ] Is spacing consistent?
- [ ] Are typography and colors consistent?
- [ ] Are components aligned?
- [ ] Are there unnecessary shadows/borders?
- [ ] Are there unnecessary animations?
- [ ] Does anything overlap?
- [ ] Does anything overflow?
- [ ] Does it work on mobile?
- [ ] Are loading/empty/error states handled?
- [ ] Are icons consistent?
- [ ] Are forms accessible?
- [ ] Are there unnecessary re-renders?
- [ ] Any infinite render possibility?
- [ ] Any console errors?
- [ ] Any lint/type/build errors?
- [ ] Did the change unintentionally affect another page?

==================================================
25. MOST IMPORTANT RULE
==================================================

DO NOT attempt to impress through visual complexity.

The goal is:
"Simple enough to understand immediately,
polished enough to trust,
distinct enough to remember."

Every page should feel like it belongs to the same AAI–DBITIC product.

When implementing a page, prioritize:
1. Usability
2. Information hierarchy
3. Consistency
4. Responsiveness
5. Accessibility
6. Performance
7. Visual polish
in that order.

==================================================
26. CURRENT DEVELOPMENT MODE
==================================================

We are building the frontend page-by-page.
The user will tell you which page to implement next.
ONLY implement the requested page.
Do not automatically continue to the next module.
Do not rebuild the application architecture unless explicitly asked.
Do not modify unrelated pages.
Do not add backend/API/database/AI functionality unless explicitly requested.

At the end of every page implementation, report:
1. Files created/modified
2. Components created/reused
3. Design-system decisions introduced
4. Responsive behavior
5. Validation/tests performed
6. Any remaining limitation

STOP after the requested page is complete.
