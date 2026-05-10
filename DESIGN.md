# Design System: react-example (llM_LAB)
**Project ID:** local/react-example

## 1. Visual Theme & Atmosphere

The interface is a modern, high-contrast developer-oriented UI with a vibrant-but-refined accent. It feels crisp and focused: utilitarian for content and tooling, yet polished by careful typography and subtle motion. The overall mood is "clinical modernity" — clear information hierarchy with occasional luminous accents that draw attention without visual clutter.

## 2. Color Palette & Roles

- Primary Purple (Accent) —  #6d28d9 — Primary interactive color used for CTAs, selection rings, and highlights.
- Background — #ffffff — App background in light mode; provides a clean canvas.
- Foreground (Primary Text) — #020617 — Main text color for high legibility.
- Card / Surface — #ffffff — Surfaces and panels in light mode.
- Secondary Surface — #f1f5f9 — Muted surfaces, subtle card alternates and dividers.
- Muted Foreground — #475569 — Secondary text and supportive metadata.
- Destructive — #dc2626 — Errors and destructive actions.
- Ring / Glow — #6d28d9 — Focus/ring/glow accent in light mode.

Dark mode variants (applied when .dark is present):
- Background — #000000
- Foreground — #f8fafc
- Primary Accent (Dark) — #22d3ee
- Card — #09090b

Design tokens live as CSS custom properties (see src/index.css) and should be referenced semantically (e.g., var(--color-primary) / var(--color-background)).

## 3. Typography Rules

- Primary sans: Geist Variable, fallback Inter, then system sans. Use variable font axes for weight/optical size when possible.
- Monospace: JetBrains Mono for code blocks and compact metadata.
- Character: Modern geometric sans with good x-height and clear legibility.

Hierarchy guidance (web-relative):
- H1 / Display: bold/semibold, large scale (approx. 2.25–3rem) for primary screens.
- H2: semibold, ~1.5–2rem.
- Body: regular (400), 1rem with comfortable line-height.
- Code/Mono: 0.85–0.95rem for inline code, monospace for blocks.

Use subtle letter-spacing and maintain selection styling using the primary hue (selection:bg-primary/25).

## 4. Component Stylings

- Buttons: Border-radius from --radius (0.5rem). Primary buttons use --primary (#6d28d9) with white text, medium weight. Hover: subtle darken; focus: glow using --glow-accent.
- Cards/Containers: Background uses --card; hairline border using --border; shadow minimal. Card corner radius slightly larger than controls for gentle separation.
- Inputs/Forms: 1px refined border, background from --input, focus border shifts to --ring with gentle glow.
- Toasts/Popovers: Use --popover and --popover-foreground; subtle elevation or glass backdrop for emphasis.
- Motion: Small, springy easing (--ease-spring) for interactive reveals; shimmer and drift keyframes for decorative uses only.

## 5. Layout Principles

- Clean, content-first layout with wide horizontal breathing room. Body uses smooth scrolling and restrained max width for reading contexts.
- Spacing: Use an 8px micro grid with component spacing multiples. Prefer calm vertical rhythm and larger gaps between major sections to avoid clutter.
- Responsive: Mobile-first; scale typographic sizes and stack content. Maintain touch-friendly hit areas (min 44×44px).

## 6. Tokens & Implementation Notes

Source tokens are defined in src/index.css as CSS variables (light + .dark). Key variables: --primary, --background, --foreground, --card, --muted, --destructive, --ring, --radius, --glow-accent.

When authoring new screens or components, reference these semantic tokens rather than hard-coded hex values. For Stitch generation prompts, prefer natural-language descriptions that mention the token role (e.g., "Primary CTA uses the vibrant purple accent with subtle glow and 0.5rem corner radius").

---

Generated from repository tokens in src/index.css and index.html. For deeper visual guidance, use the CSS variables above as canonical values.