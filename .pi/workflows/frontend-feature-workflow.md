---
description: Full frontend feature workflow — design analysis → deslop → architecture → craft polish → parallel implementation → hardening → quality audit (7 phases)
---

# frontend-feature-workflow

Multi-agent workflow for building production-quality frontend features. Chains 7 phases: design analysis, baseline cleanup, component architecture, craft polish, parallel implementation, hardening, and quality audit.

## Args

- `feature` (required) — The frontend feature or component to build
- `mockup` (optional) — URL or path to Figma mockup, screenshot, or design reference

## Phases

### Phase 1: Design Analysis

- **Agent:** vision
- **Concurrency:** 1
- **Depends on:** —
- **Tool:** `subagent` (single mode)
- **Skill:** `figma` (if mockup provided), `mockup-to-code` (if screenshot provided)

**Prompt:**

```
Analyze the design for: {feature}. 

If a mockup is provided ({mockup}):
- Extract layout structure (grid, sections, spacing patterns)
- Identify all visual components (buttons, cards, inputs, navigation)
- Extract color palette (primary, accent, neutrals, semantic tokens)
- Identify typography (font families, sizes, weights, hierarchy)
- Note responsive breakpoint behavior
- Identify animation/motion patterns
- Flag any accessibility concerns in the design

If no mockup is provided:
- Based on the feature description, recommend a layout structure
- Suggest component decomposition
- Propose a color palette (OKLCH tokens preferred)
- Recommend typography pairings

Return findings in this format:

## Layout Structure
- [Grid/stack/split-screen description]

## Components Identified
| Component | Type | States | Priority |
|-----------|------|--------|----------|
| [name] | [button/card/form/...] | [default, hover, active, disabled, loading, error] | [P0/P1/P2] |

## Design Tokens
- Colors: [primitive + semantic tokens]
- Typography: [font stack, scale, weights]
- Spacing: [scale reference]
- Motion: [animation patterns]

## Accessibility Notes
- [Potential issues or considerations]
```

### Phase 2: Baseline Cleanup

- **Depends on:** Phase 1
- **Agent:** general
- **Concurrency:** 1
- **Tool:** `subagent` (single mode)
- **Skill:** `baseline-ui`

**Prompt:**

```
Apply the baseline-ui deslop pass to the feature: {feature}.

Using the design analysis from Phase 1 ({phase_1_output}):

1. Scan existing code (if any) or scaffold for:
   - MUST violations: purple gradients, banned fonts (Inter/Roboto/Arial), emojis, h-screen, div onClick
   - SHOULD violations: inconsistent spacing, raw color values, missing semantic tokens
   - NEVER violations: pure black (#000), centered hero with high variance, 3-column identical cards

2. Apply fixes for each violation found. Use the before/after patterns from baseline-ui.

3. Verify all MUST rules pass after fixes.

Return the list of fixes applied and verification results.
```

### Phase 3: Component Architecture

- **Depends on:** Phase 2
- **Agent:** plan
- **Concurrency:** 1
- **Tool:** `subagent` (single mode)
- **Skill:** `frontend-design`

**Prompt:**

```
Plan the component architecture for: {feature}.

Based on the design analysis ({phase_1_output}) and baseline cleanup ({phase_2_output}):

1. Decompose the feature into components:
   - Page-level components (layout containers)
   - Section components (feature areas)
   - Shared/primitive components (reusable across sections)
   - Leaf components (specific interactive elements)

2. For each component, specify:
   - Props interface (TypeScript)
   - State requirements (local, lifted, context, server)
   - Loading/empty/error state design
   - Accessibility requirements (ARIA roles, keyboard handling)
   - Data dependencies

3. Define the component tree with parent-child relationships.

4. Identify which components can be built in parallel (no shared state, no parent-child dependency).

Return the architecture plan in this format:

## Component Tree
```
PageLayout
├── Header
│   ├── Navigation
│   └── UserMenu
├── MainContent
│   ├── SectionA
│   │   ├── ComponentA1
│   │   └── ComponentA2
│   └── SectionB
│       └── ComponentB1
└── Footer
```

## Component Specs
### [ComponentName]
- **Type:** [page/section/shared/leaf]
- **Props:** [TypeScript interface]
- **State:** [local/lifted/context/server]
- **States:** [loading, empty, error, default]
- **Accessibility:** [ARIA, keyboard, focus]
- **Data:** [dependencies]

## Parallel Build Groups
- Group 1: [components that can be built simultaneously]
- Group 2: [components that can be built simultaneously]
```

### Phase 4: Craft Polish

- **Depends on:** Phase 3
- **Agent:** general
- **Concurrency:** 1
- **Tool:** `subagent` (single mode)
- **Skill:** `ui-craft-principles`, `oklch-color-workflow`

**Prompt:**

```
Apply craft polish to the component architecture for: {feature}.

Using the architecture plan ({phase_3_output}) and design tokens ({phase_1_output}):

1. Verify and enhance color tokens using OKLCH:
   - Convert any HEX/RGB tokens to OKLCH
   - Check gamut for all colors
   - Generate 50-950 scale for primary and accent
   - Define semantic tokens from primitives
   - Verify contrast ratios (4.5:1 min for text)

2. Apply craft principles to each component:
   - Concentric border-radius (outer = inner + padding)
   - Optical text alignment (-0.05em margin for visual centering)
   - Multi-shadow layering (not single box-shadow)
   - Interruptible animations (spring-based, not duration-based)
   - Tabular numbers for data displays
   - Hit areas ≥ 44px for interactive elements
   - Focus ring offset (outline-offset: 2px)

3. Define motion specs:
   - Animation duration hierarchy (100ms/200ms/300ms/500ms)
   - Easing: exponential only (cubic-bezier(0.16, 1, 0.3, 1))
   - prefers-reduced-motion handling

Return the enhanced design specs with before/after for each craft improvement.
```

### Phase 5: Parallel Implementation

- **Depends on:** Phase 4
- **Agent:** general
- **Concurrency:** Dynamic (1 agent per build group, min 1, max 5)
- **Tool:** `subagent` (parallel mode)
- **Skill:** `frontend-ui-engineering`, `react-best-practices`

**Prompt:**

```
Implement the components for build group: [assigned group] in feature: {feature}.

Using the architecture plan ({phase_3_output}) and craft polish specs ({phase_4_output}):

1. For each component in your assigned group:
   - Implement the component with full TypeScript types
   - Handle all states: loading, empty, error, default, active, disabled
   - Apply all craft principles from the polish phase
   - Use semantic HTML and ARIA attributes
   - Add keyboard navigation support
   - Use the exact design tokens (colors, spacing, typography)

2. Follow frontend-ui-engineering patterns:
   - Composition over configuration
   - Colocate component files (component + test + types)
   - Separate data fetching from presentation
   - Components < 200 lines; split if larger

3. Apply react-best-practices:
   - Server Components by default, Client Components only for interactivity
   - Memoize expensive computations
   - Optimize re-renders

Return each component implementation with its test file.
```

### Phase 6: Hardening

- **Depends on:** Phase 5
- **Agent:** general
- **Concurrency:** 1
- **Tool:** `subagent` (single mode)
- **Skill:** `production-hardening`, `fixing-accessibility`

**Prompt:**

```
Apply production hardening to the implemented feature: {feature}.

Using the implemented components ({phase_5_output}):

1. Production hardening checklist:
   - Text overflow: add truncation, word-break for long content
   - i18n readiness: 30% text expansion allowance, RTL support
   - Error states: what happened + why + how to fix
   - Empty states: don't show blank screens, provide guidance
   - Loading states: skeleton loaders matching exact layout
   - Input validation: HTML5 + JS, sanitization, max lengths
   - Edge cases: 0 items, 1 item, many items, very long names, missing images
   - Cross-browser: -webkit-appearance, scrollbar styling, safe area insets

2. Accessibility fixes (WCAG 2.1 AA):
   - Keyboard navigation: all interactive elements reachable via Tab
   - Focus management: visible focus indicators, trap in modals
   - ARIA labels: all icon buttons, form inputs labeled
   - Color contrast: verify 4.5:1 for text, 3:1 for UI elements
   - Heading hierarchy: logical H1-H6, no skipped levels
   - Touch targets: minimum 44x44px
   - Screen reader: meaningful content and structure

Return hardening report with each issue found and fix applied.
```

### Phase 7: Quality Audit

- **Depends on:** Phase 6
- **Agent:** review
- **Concurrency:** 1
- **Tool:** `subagent` (single mode)
- **Skill:** `ui-quality-audit`

**Prompt:**

```
Run a 5-dimension quality audit on the completed feature: {feature}.

Using all previous phase outputs:

Score each dimension 0-4:

1. **Accessibility** (0-4): keyboard, ARIA, contrast, focus, semantic HTML
2. **Performance** (0-4): bundle size, render performance, animation perf, image optimization
3. **Theming** (0-4): token consistency, dark mode, color contrast, typography scale
4. **Responsive** (0-4): breakpoints, touch targets, content reflow, viewport meta
5. **Anti-patterns** (0-4): AI fingerprints, dead code, over-engineering, inconsistent patterns

For each finding, tag severity:
- **P0**: Ship blocker — must fix before release
- **P1**: Must fix this release
- **P2**: Should fix
- **P3**: Nice to have

Return the complete audit report with total score /20 and per-dimension breakdown.

## Overall Score: X/20

## Dimension Breakdown
| Dimension | Score | P0 | P1 | P2 | P3 |
|-----------|-------|----|----|----|-----|
| Accessibility | X/4 | N | N | N | N |
| Performance | X/4 | N | N | N | N |
| Theming | X/4 | N | N | N | N |
| Responsive | X/4 | N | N | N | N |
| Anti-patterns | X/4 | N | N | N | N |

## Findings
### [P0/P1/P2/P3] [Title]
- **Dimension:** [name]
- **Location:** [file:line]
- **Issue:** [description]
- **Fix:** [recommendation]
```

---

## Final Synthesis (Main Agent)

After all 7 phases complete, the main agent:

1. **Aggregates** the quality audit ({phase_7_output}) and all phase outputs
2. **Verifies** P0 issues are resolved (re-run Phase 7 if needed)
3. **Compiles** the final summary:
   - Feature delivered vs spec
   - Quality score /20
   - Open issues (P1-P3)
   - Files created/modified
4. **Reports** to the user with the complete results

## Notes

- **Empty mockup guard:** If no mockup provided, Phase 1 focuses on recommendation rather than extraction
- **Skip guard:** If Phase 2 finds no violations, report clean and proceed to Phase 3
- **Parallel safety:** Phase 5 groups must have no shared files; if conflicts detected, fall back to sequential
- **Score gate:** Quality score < 12/20 triggers re-hardening (Phase 6) before final synthesis
- All phases use project's design tokens and conventions as established in Phase 1
