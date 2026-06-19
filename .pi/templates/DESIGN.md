---
purpose: Project visual identity — single source of truth for mood, color, typography, layout, elevation, shapes, components, and design constraints.
updated: 2026-06-19
---

# DESIGN.md — Project Visual Identity

> **Aesthetic Anchor:** [One evocative sentence referencing a specific era, artifact, or scene — not adjectives. Example: "A 1970s graduate lecture handout, mimeographed on off-white paper."]

## 1. Overview & Mood

- **Mood:** [2-3 words: e.g., "Architectural Minimalism", "Warm Editorial", "Brutalist Terminal"]
- **Specific Reference:** [A concrete scene, artifact, or era — not abstract adjectives]
- **Tone:** [Professional / Playful / Serious / Warm / Clinical]
- **Design Philosophy:** [1-2 sentences on guiding aesthetic principle]

## 2. Colors

- **Brand Palette:** `{colors.brand.primary}` `{colors.brand.secondary}` `{colors.brand.accent}`
- **Neutral Scale:** `{colors.neutral.50}` → `{colors.neutral.950}` (50/100/200/300/400/500/600/700/800/900/950)
- **Semantic Colors:** Success `{colors.semantic.success}`, Warning `{colors.semantic.warning}`, Error `{colors.semantic.error}`, Info `{colors.semantic.info}`
- **Contrast Floor:** WCAG 2.1 AA minimum (≥ 4.5:1 for body text)
- **No Pure Black:** Use `{colors.neutral.950}` instead of `#000`

## 3. Typography

- **Display Font:** `{typography.display.family}` — for H1, hero headings
- **Body Font:** `{typography.body.family}` — for paragraphs, UI labels
- **Mono Font:** `{typography.mono.family}` — for code, data, timestamps
- **Scale:** `{typography.scale}` (e.g., 12/14/16/18/20/24/30/36/48/60/72)
- **Weight Range:** `{typography.weights}` (e.g., 400/500/600/700)
- **Line Height:** 1.5 body, 1.2 headings

## 4. Layout & Spacing

- **Grid Base:** `{layout.grid}` (e.g., 4px or 8px)
- **Spacing Scale:** `{layout.spacing}` (e.g., 4/8/12/16/24/32/48/64/96)
- **Max Content Width:** `{layout.maxWidth}` (e.g., 1280px)
- **Column Count:** `{layout.columns}` (e.g., 12-column grid)
- **Gutter Width:** `{layout.gutter}` (e.g., 24px)

## 5. Elevation & Depth

- **Shadow Scale:** 5 levels (none / sm / md / lg / xl)
- **Depth Philosophy:** [Flat / Subtle depth / Heavy layering]
- **Z-Index Layers:** Base content → Overlays → Modals → Toasts → Tooltips
- **Border Usage:** When and where borders replace shadows

## 6. Shapes & Corners

- **Border Radius Scale:** `{shapes.borderRadius}` (e.g., 0/4/8/12/16/24/full)
- **Corner Philosophy:** [Sharp / Soft / Rounded / Pill]
- **Icon Style:** [Filled / Outline / Duotone / Custom]
- **Stroke Width:** `{shapes.strokeWidth}` (e.g., 1px or 1.5px)

## 7. Components

- **Button Hierarchy:** Primary `{components.button.primary}` / Secondary `{components.button.secondary}` / Ghost `{components.button.ghost}` / Danger `{components.button.danger}`
- **Input Style:** [Outlined / Filled / Underlined] with `{components.input.height}` height
- **Card Style:** [Elevated / Bordered / Flat] with `{components.card.padding}` padding
- **Modal Style:** [Centered / Slide-up / Fullscreen] with backdrop `{components.modal.backdrop}`
- **Navigation:** [Top bar / Sidebar / Bottom tabs] with `{components.nav.height}`

## 8. Do's and Don'ts

### Do's

- [Key principle 1 — with reasoning]
- [Key principle 2 — with reasoning]
- [Key principle 3 — with reasoning]

### Don'ts

- **Pattern:** [Anti-pattern] — **Replacement:** [Correct approach] — **Because:** [Why this matters]
- **Pattern:** [Anti-pattern] — **Replacement:** [Correct approach] — **Because:** [Why this matters]
- **Pattern:** [Anti-pattern] — **Replacement:** [Correct approach] — **Because:** [Why this matters]
