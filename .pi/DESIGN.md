---
purpose: Project visual identity — single source of truth for mood, color, typography, layout, elevation, shapes, components, and design constraints.
updated: 2026-06-19
---

# DESIGN.md — Project Visual Identity

> **Aesthetic Anchor:** Architectural Minimalism meets Journalistic Gravitas — a quiet confidence that lets content breathe without ornament.

## 1. Overview & Mood

- **Mood:** Architectural Minimalism, Journalistic Gravitas
- **Specific Reference:** A 1970s graduate lecture handout, mimeographed on off-white paper — generous margins, one type family with safe fallbacks, nothing superfluous.
- **Tone:** Professional, Warm
- **Design Philosophy:** Every element must earn its place. Content is the hero; design is the frame. Generous whitespace over decorative flourishes. One type family (with web-safe fallbacks for rendering).

## 2. Colors

- **Brand Palette:** `oklch(55% 0.12 250)` `oklch(45% 0.08 250)` `oklch(70% 0.15 45)`
- **Neutral Scale:** `oklch(98% 0 0)` → `oklch(12% 0.01 260)` (50/100/200/300/400/500/600/700/800/900/950)
- **Semantic Colors:** Success `oklch(65% 0.18 145)`, Warning `oklch(75% 0.16 85)`, Error `oklch(55% 0.22 25)`, Info `oklch(60% 0.12 260)`
- **Contrast Floor:** WCAG 2.1 AA minimum (≥ 4.5:1 for body text)
- **No Pure Black:** Use `oklch(12% 0.01 260)` instead of `#000`

## 3. Typography

- **Display Font:** `'Playfair Display', Georgia, serif` — for H1, hero headings
- **Body Font:** `'Source Serif 4', 'Charter', Georgia, serif` — for paragraphs, UI labels
- **Mono Font:** `'JetBrains Mono', 'SF Mono', monospace` — for code, data, timestamps
- **Scale:** 12/14/16/18/20/24/30/36/48/60/72
- **Weight Range:** 400/500/600/700
- **Line Height:** 1.6 body, 1.2 headings

## 4. Layout & Spacing

- **Grid Base:** 8px
- **Spacing Scale:** 8/12/16/24/32/48/64/96
- **Max Content Width:** 720px (reading), 1280px (full layout)
- **Column Count:** 12-column grid
- **Gutter Width:** 24px

## 5. Elevation & Depth

- **Shadow Scale:** 5 levels (none / sm / md / lg / xl)
- **Depth Philosophy:** Subtle depth — shadows are suggestions, not statements
- **Z-Index Layers:** Base content → Overlays → Modals → Toasts → Tooltips
- **Border Usage:** Hairline borders (1px, `oklch(90% 0 0)`) replace shadows where possible

## 6. Shapes & Corners

- **Border Radius Scale:** 0/4/8/12/16/24/full
- **Corner Philosophy:** Sharp (0px) for layout containers, Soft (4px) for interactive elements
- **Icon Style:** Outline — thin stroke at 1.5px
- **Stroke Width:** 1.5px

## 7. Components

- **Button Hierarchy:** Primary `oklch(45% 0.08 250)` / Secondary `oklch(95% 0.005 250)` / Ghost transparent / Danger `oklch(55% 0.22 25)`
- **Input Style:** Underlined with `44px` height
- **Card Style:** Bordered (1px `oklch(92% 0 0)`) with `24px` padding
- **Modal Style:** Centered with backdrop `oklch(12% 0.01 260 / 0.4)`
- **Navigation:** Top bar with `56px` height

## 8. Do's and Don'ts

### Do's

- Use generous whitespace — content density is the enemy of readability
- Anchor every design decision in the typographic scale
- Prefer borders over shadows for depth

### Don'ts

- **Pattern:** Purple/indigo gradients or oversaturated accents — **Replacement:** Muted brand colors at restrained saturation — **Because:** Saturated gradients feel cheap and AI-generated
- **Pattern:** Pure black `#000` text or backgrounds — **Replacement:** Near-black `oklch(12% 0.01 260)` — **Because:** Pure black creates harsh contrast that strains eyes
- **Pattern:** Inter, Roboto, or Arial as body font — **Replacement:** Source Serif 4 or Charter — **Because:** AI defaults telegraph a lack of design intention
