---
name: ui-quality-audit
description: 5-dimension UI quality scoring audit — accessibility, performance, theming, responsive, and anti-pattern detection with P0-P3 severity tags
---

# UI Quality Audit

## When to Use

- Before merging UI changes to production
- When triaging a backlog of UI issues
- During design system reviews
- When retrofitting quality into existing components
- As a gate check before launching new features

## When NOT to Use

- Quick visual review (use `design-system-audit` instead)
- Non-UI code (backend, APIs, data processing)
- When the component is not yet implemented (audit after implementation)

---

## Severity Levels

| Level | Label | Action |
|-------|-------|--------|
| **P0** | Ship blocker | Do not deploy. Immediate fix required. |
| **P1** | Must fix this release | Fix before the next production release. |
| **P2** | Should fix | Fix when time permits. Not blocking. |
| **P3** | Nice to have | Polish improvement. Low priority. |

---

## 5-Dimension Scoring Rubric

Each dimension is scored 0–4. A score of 0 means critical failures exist. A score of 4 means the dimension is flawless.

### 1. Accessibility (Weight: High)

**Focus:** Keyboard navigation, ARIA, color contrast, focus management, semantic HTML.

| Score | Description |
|-------|-------------|
| **4** | Perfect WCAG 2.1 AA compliance. No violations. Keyboard navigable, proper ARIA, 4.5:1+ contrast everywhere. |
| **3** | Minor issues (P2-P3 only). Most flows accessible. Some ARIA labels could be more descriptive. |
| **2** | Moderate issues (P1). Some interactive elements not keyboard-accessible. Contrast failures on non-critical text. |
| **1** | Major issues (P0-P1). Keyboard traps, missing alt text on critical images, form labels missing. |
| **0** | Critical failures. Page is not navigable by keyboard. No focus indicators. ARIA missing entirely. |

**P0 checks (ship blockers):**

- [ ] Keyboard trap exists — user cannot tab through all interactive elements
- [ ] `outline: none` without `:focus-visible` fallback
- [ ] Missing form labels on required inputs
- [ ] Color contrast < 3:1 on any text (P0 if body text, P1 if decorative)

**P1 checks (must fix this release):**

- [ ] Color contrast < 4.5:1 but ≥ 3:1
- [ ] Missing `alt` text on informative images
- [ ] Missing `aria-label` on icon-only buttons
- [ ] Skip-to-content link missing
- [ ] Heading hierarchy skipped (h1 → h3)

**P2 checks (should fix):**

- [ ] ARIA labels present but unhelpful (e.g., "button" as label)
- [ ] Focusable elements in illogical tab order
- [ ] Missing `lang` attribute on `<html>`
- [ ] Redundant ARIA on semantic HTML

**P3 checks (nice to have):**

- [ ] ARIA live regions missing for dynamic content
- [ ] Touch targets slightly below 44px (40px-43px)

---

### 2. Performance (Weight: High)

**Focus:** Bundle size, render performance, animation performance, image optimization.

| Score | Description |
|-------|-------------|
| **4** | Lighthouse 90+ in all categories. Images optimized. Bundle < 200KB gzip. No layout shifts. |
| **3** | Lighthouse 80-89. Minor optimization opportunities. Bundle < 400KB. |
| **2** | Lighthouse 60-79. Moderate issues. Large images unoptimized. Render-blocking resources. |
| **1** | Lighthouse < 60. Major issues. Massive bundle. No lazy loading. Layout shifts present. |
| **0** | Critical failures. Bundle > 1MB. No code splitting. Unoptimized images everywhere. CLS > 0.25. |

**P0 checks:**

- [ ] Cumulative Layout Shift (CLS) > 0.25
- [ ] Largest Contentful Paint (LCP) > 4s
- [ ] No lazy loading on below-fold images
- [ ] Bundle size > 1MB (gzip)

**P1 checks:**

- [ ] CLS > 0.1
- [ ] LCP > 2.5s
- [ ] Images loaded without dimensions (causing reflow)
- [ ] No code splitting on route boundaries
- [ ] Unoptimized images (no WebP/AVIF, no responsive sizes)

**P2 checks:**

- [ ] Animations running on CPU (not GPU-composited)
- [ ] Font files > 200KB total
- [ ] Third-party scripts blocking main thread
- [ ] Missing `loading="lazy"` on below-fold images

**P3 checks:**

- [ ] `will-change` applied permanently
- [ ] No `preconnect` for critical origins
- [ ] No `font-display: swap` for web fonts

---

### 3. Theming (Weight: Medium)

**Focus:** Token consistency, dark mode support, color contrast, typography scale.

| Score | Description |
|-------|-------------|
| **4** | Complete design token system. Full dark mode. Consistent spacing/typography/color. OKLCH colors. |
| **3** | Token system exists with gaps. Dark mode works but misses some surfaces. Mostly consistent. |
| **2** | Partial token usage. Hardcoded colors/spacing in some places. Dark mode partial or absent. |
| **1** | Minimal token system. Mostly hardcoded values. No dark mode. Typography scale inconsistent. |
| **0** | No design tokens. All hardcoded values. No theming system. Arbitrary colors and spacing. |

**P0 checks:**

- [ ] Hardcoded colors prevent dark mode entirely
- [ ] Missing contrast in dark mode — text invisible on dark backgrounds

**P1 checks:**

- [ ] Spacing doesn't follow 4pt or 8pt scale — arbitrary values used
- [ ] More than 1-2 accent colors fighting for attention
- [ ] Font size scale doesn't follow consistent ratio (1.25x or similar)

**P2 checks:**

- [ ] Token naming inconsistent (mix of `--color-primary` and `--blue-500`)
- [ ] Typography scale gaps — missing sizes for specific use cases
- [ ] Component uses hardcoded colors outside the token system

**P3 checks:**

- [ ] OKLCH not used where color gamut matters
- [ ] Missing transition on theme switch (`color-scheme` transition)

---

### 4. Responsive (Weight: Medium)

**Focus:** Breakpoint coverage, touch targets, content reflow, viewport configuration.

| Score | Description |
|-------|-------------|
| **4** | Perfect at all breakpoints (320px-2560px). Touch targets 44px+. No horizontal scroll. Content reflows properly. |
| **3** | Minor issues at edge breakpoints (320px or 2560px). Most views work well. |
| **2** | Moderate issues. Some pages have horizontal scroll. Touch targets < 44px. Content overlaps at certain widths. |
| **1** | Major issues. Mobile layout broken. Content cut off. Interactive elements overlap. |
| **0** | Critical failures. Desktop-only layout. No responsive meta tag. Unusable on mobile. |

**P0 checks:**

- [ ] Page unusable at 375px width (content cut off, overlapping)
- [ ] Missing `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Horizontal scroll on main content at standard breakpoints

**P1 checks:**

- [ ] Touch targets < 44px on interactive elements
- [ ] Content does not reflow at 400% zoom (WCAG failure)
- [ ] Tables not responsive (no horizontal scroll or card conversion)

**P2 checks:**

- [ ] Images don't scale down on small viewports
- [ ] Font sizes too small to read on mobile (< 16px for body)
- [ ] Gaps/whitespace not adjusted for small screens

**P3 checks:**

- [ ] `prefers-reduced-motion` media query missing
- [ ] `prefers-color-scheme` not respected for dark mode
- [ ] Print stylesheet missing

---

### 5. Anti-Patterns (Weight: Medium)

**Focus:** AI fingerprints, dead code, over-engineering, inconsistent patterns.

| Score | Description |
|-------|-------------|
| **4** | No AI fingerprints. No dead code. Consistent component patterns. No over-engineering. |
| **3** | Minor anti-patterns. 1-2 instances of extraneous abstraction or inconsistent naming. |
| **2** | Moderate. Multiple AI fingerprint patterns. Dead code present. Inconsistent patterns across similar components. |
| **1** | Major. Pervasive AI-generated patterns. Significant dead code. Architecture is inconsistent. |
| **0** | Critical. Codebase reads as entirely AI-generated. No coherent patterns. Massive dead code. |

**P0 checks:**

- [ ] `div onClick` as button pattern without proper ARIA
- [ ] Purple/blue gradient hero sections (AI fingerprint)
- [ ] 3-column identical card pattern (AI fingerprint)
- [ ] Emojis used instead of icons or text

**P1 checks:**

- [ ] Glassmorphism applied without functional purpose
- [ ] Bounce/elastic easing on UI elements
- [ ] Inter/Roboto/Arial fonts specified
- [ ] Dead code or commented-out components in active files

**P2 checks:**

- [ ] Over-engineered abstractions (component with 15+ props when 5 would do)
- [ ] Inconsistent naming conventions (`user-card`, `UserCard`, `user_card`)
- [ ] Prop drilling through 5+ component levels without context
- [ ] Unnecessary `useMemo`/`useCallback` wrapping simple values

**P3 checks:**

- [ ] Generic placeholder content ("Lorem ipsum", "John Doe", "Acme Corp")
- [ ] Hardcoded English strings without i18n wrapper
- [ ] Missing `key` props or using index as key

---

## Audit Report Format

When producing an audit, use this format:

```markdown
## UI Quality Audit: [Component/Page]

### Overall Score: [X]/20 (Average: [X.X]/4)

| Dimension | Score | P0 | P1 | P2 | P3 |
|-----------|-------|----|----|----|------|
| Accessibility | [0-4] | [#] | [#] | [#] | [#] |
| Performance | [0-4] | [#] | [#] | [#] | [#] |
| Theming | [0-4] | [#] | [#] | [#] | [#] |
| Responsive | [0-4] | [#] | [#] | [#] | [#] |
| Anti-patterns | [0-4] | [#] | [#] | [#] | [#] |

### Critical (P0)
1. **[Issue]** — [Component] — [Fix recommendation]
2. **[Issue]** — [Component] — [Fix recommendation]

### Must Fix (P1)
1. ...

### Should Fix (P2)
1. ...

### Nice to Have (P3)
1. ...
```

### Example filled report:

```markdown
## UI Quality Audit: UserProfilePage

### Overall Score: 12/20 (Average: 2.4/4)

| Dimension | Score | P0 | P1 | P2 | P3 |
|-----------|-------|----|----|----|------|
| Accessibility | 2 | 1 | 2 | 1 | 0 |
| Performance | 3 | 0 | 1 | 1 | 1 |
| Theming | 4 | 0 | 0 | 0 | 1 |
| Responsive | 2 | 1 | 1 | 1 | 0 |
| Anti-patterns | 1 | 1 | 2 | 0 | 1 |

### Critical (P0)
1. **[A11y]** Avatar button without label — keyboard users cannot access profile menu.
   → Add `aria-label="Open profile menu"` to button.
2. **[Responsive]** Profile table overflows at 375px — horizontal scroll on main content.
   → Convert table to stacked card layout on mobile.

### Must Fix (P1)
1. **[A11y]** Color contrast 3.8:1 on bio text (gray-500 on white).
   → Use gray-600 instead.
2. **[Perf]** Avatar image loaded at 800×800, displayed at 40×40.
   → Add `?w=80&q=75` to image URL or use proper responsive srcset.
```

---

## Audit Workflow

1. **Scan** — Run all automated checks (axe-core, Lighthouse, bundle analyzer)
2. **Score** — Fill each dimension using the rubric above
3. **Tag** — Categorize findings by severity (P0-P3)
4. **Fix P0** — Address all ship-blockers immediately
5. **Plan P1** — Schedule remaining must-fix items for this release
6. **Triage P2-P3** — Decide what to fix vs. backlog

## Verification

- [ ] Accessibility scored and all P0 items identified
- [ ] Performance scored with Lighthouse evidence
- [ ] Theming scored with token audit evidence
- [ ] Responsive scored with screenshots at 375px, 768px, 1440px
- [ ] Anti-patterns scored with code review evidence
- [ ] Audit report generated with all 5 dimensions, severity tags, and fix recommendations
- [ ] P0 items resolved before merge
- [ ] P1 items have assigned fix tickets
