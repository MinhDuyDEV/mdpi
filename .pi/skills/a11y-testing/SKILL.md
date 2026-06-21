---
name: a11y-testing
description: "Use when TESTING accessibility for WCAG 2.2 AA conformance — automated axe-core scanning (via playwright/lighthouse) PLUS a manual test matrix (keyboard nav, focus order, screen-reader labels, color contrast, heading hierarchy). Distinct from fixing-accessibility (how to FIX) and accessibility-audit (deprecated) and ui-quality-audit (scores UI); this is conformance TESTING. Load for /nfr a11y dimension."
---

# Accessibility Testing (a11y Testing)

> **Tests** WCAG 2.2 AA conformance through automated scanning + a mandatory manual test matrix — distinct from `fixing-accessibility` which teaches how to fix issues after they're found.

## When to Use

- After UI changes are made — run before merging any component, page, or form change
- As part of NFR testing for the a11y dimension (`/nfr a11y`)
- When adding new components, navigation, modals, forms, or interactive widgets
- Before a release that involves UI changes
- During accessibility audits to establish a baseline conformance level

## When NOT to Use

- Fixing a11y issues (use `fixing-accessibility` for concrete before/after code patterns)
- Running a full UI quality audit (use `ui-quality-audit` for the 5-dimension scoring rubric)
- Auditing a deprecated skill (use the current `a11y-testing` instead of deprecated `accessibility-audit`)
- Building new UI without existing tests (run this skill after implementation)

## Overview

Accessibility testing has two mandatory layers: **automated** (axe-core) catches ~30-50% of issues (contrast, missing alt, ARIA misuse, duplicate IDs). **Manual** (keyboard, screen reader, contrast check, zoom) catches what automation cannot: focus order, keyboard trap quality, screen-reader flow, cognitive load.

**Core principle:** Automated scanning is necessary but not sufficient. Every UI change must pass both automated axe-core and the manual matrix below. Never gate on automated results alone.

## Automated Testing

### axe-core (Primary)

Integrate into your existing test runner. Never run axe against production — run against your staging or local dev environment on the changed pages.

```typescript
// Playwright + @axe-core/playwright
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
  await page.goto('/my-page');
  await injectAxe(page);
  const results = await checkA11y(page, null, {
    // Exclude known-third-party issues
    includedImpacts: ['critical', 'serious'],
  });
  expect(results.violations).toHaveLength(0);
});
```

```bash
# Lighthouse CI — a11y audit as a gate
lighthouse https://staging.example.com/page \
  --output json \
  --quiet \
  --chrome-flags="--headless" \
  --preset=desktop \
  --only-categories=accessibility
```

### What Automated Testing Catches

| Category | What Axe Detects | Example |
|----------|-----------------|---------|
| Color contrast | Text/background ratio < 4.5:1 or < 3:1 | Gray text on white |
| Missing alt text | `<img>` without `alt` attribute | Informative images missing descriptions |
| ARIA misuse | Invalid ARIA attributes, missing required children | `aria-checked` on non-checkbox role |
| Name-role-value | Interactive elements missing accessible names | Button with no text or aria-label |
| Form labels | `<input>` missing associated `<label>` | Inputs without `aria-label` or `htmlFor` |
| Heading hierarchy | Skipped levels (h1 → h3) | Pages with no h1 |
| Duplicate IDs | Same `id` used on multiple elements | Reusable component without unique IDs |

### What Automated Testing MISSES (Manual Required)

| Missed by Automation | Why |
|---------------------|-----|
| Keyboard trap | User can't tab out of a modal — nobody wrote a rule for "should be escapable" |
| Focus order | Tabs jump in illogical order — visual order ≠ DOM order |
| Screen-reader experience | Labels exist but are confusing in context — "Save" means different things on different modals |
| Cognitive load | Instructions are unclear, error messages are technical — no automated judge |
| Zoom + reflow | Content overlaps at 200% zoom — no rule for "is it readable" |
| Focus indicator visibility | Focus ring exists but blends into background — human visual check |
| Touch target spacing | Targets are 44px but too close together — no proximity rule |

## Manual Test Matrix

For every UI change, run this matrix. Scope to the changed surface (not the entire app).

| Check | How to Test Manually | WCAG SC |
|-------|---------------------|---------|
| **Keyboard navigation** | Tab through all interactive elements. Must be logical order, no traps, visible focus on every element. Skip-link present and working. | 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible |
| **Focus management** | Open a modal → focus moves into it. Close → focus returns to trigger. No focus reset on dynamic content. | 2.4.3 Focus Order |
| **Screen-reader labels** | Icon buttons must have `aria-label`. Forms must announce errors. Dynamic content uses `aria-live` regions. Test with VoiceOver (macOS) or NVDA (Windows). | 4.1.2 Name-Role-Value |
| **Color contrast** | Check all text on all backgrounds using DevTools color picker. 4.5:1 normal text, 3:1 large text (18px+ bold or 24px+ regular). Check hover, focus, disabled states too. | 1.4.3 Contrast (Minimum) |
| **Heading hierarchy** | View page heading structure (WAVE or browser accessibility panel). One h1. No skipped levels. Headings match visual content structure. | 2.4.6 Headings and Labels |
| **Form labels and errors** | Every input has a visible label. Required fields marked. Error messages identify which field failed and what's wrong. | 3.3.1 Error Identification, 3.3.2 Labels |
| **Touch targets** | On mobile viewport (375px), tap all interactive elements. Target ≥ 44×44px. No overlapping targets. | 2.5.8 Target Size (Minimum) |
| **Zoom 200%** | Zoom browser to 200%. No content cut off, no horizontal scroll, no overlapping text. | 1.4.4 Resize Text, 1.4.10 Reflow |
| **Focus not obscured** | Tab through. Focused element must not be hidden by sticky headers, modals, or other overlays. | 2.4.11 Focus Not Obscured (WCAG 2.2 AA) |
| **Drag movements** | If the component uses drag-and-drop, provide a single-pointer alternative. | 2.5.7 Dragging Movements (WCAG 2.2 AA) |

### Common WCAG 2.2 AA Success Criteria Quick Reference

| SC | Name | What It Means | How to Test |
|----|------|---------------|-------------|
| 1.4.3 | Contrast (Minimum) | Text ≥ 4.5:1, large text ≥ 3:1 | DevTools color picker |
| 2.1.1 | Keyboard | All functionality operable via keyboard | Tab through everything |
| 2.4.3 | Focus Order | Focus follows visual order in a meaningful sequence | Tab, observe sequence |
| 2.4.6 | Headings/Labels | Headings describe purpose, labels describe inputs | View heading structure + form labels |
| 2.4.7 | Focus Visible | Keyboard focus indicator is visible | Tab, check ring is visible |
| 2.4.11 | Focus Not Obscured (2.2) | Focused element not hidden by other content | Tab near sticky headers/overlays |
| 2.5.7 | Dragging Movements (2.2) | All drag operations have single-pointer alternative | Test without drag |
| 2.5.8 | Target Size (2.2) | Targets ≥ 24×24px (AA) — 44×44px recommended | Test on mobile viewport |
| 3.3.1 | Error Identification | Error message identifies which field failed | Submit invalid form, observe error |
| 3.3.2 | Labels/Instructions | Labels present when input requires user input | Check all form inputs |
| 4.1.2 | Name-Role-Value | All UI elements have accessible name, role, value | Axe + screen reader test |
| 4.1.3 | Status Messages | Status updates announced without focus move | Screen reader + dynamic content |

### Screen-Reader Quick Test (VoiceOver)

```bash
# macOS: Cmd+F5 to enable VoiceOver
# Then test:
# 1. Navigate by heading: VO+Cmd+H
# 2. Navigate by form controls: VO+Cmd+J
# 3. Navigate by links: VO+Cmd+L
# 4. Test live regions: trigger dynamic content update
```

## Tooling Reference

| Tool | Type | Use Case | Limitations |
|------|------|----------|-------------|
| **@axe-core/playwright** | Automated | CI gate — inject axe, assert 0 violations | Catches ~40% of issues. No keyboard/flow testing. |
| **Lighthouse** | Automated | Quick score + report in CI | Only audits the first page state. No interaction testing. |
| **Playwright** | Automated + Manual | Run axe + tab order checks + screenshot comparisons | Tab order checks require custom assertions. |
| **WAVE** | Browser extension | Visual overlay of a11y issues — quick manual scan | Browser extension only, not CI-able. |
| **Chrome DevTools** | Manual | Color picker contrast, heading structure, accessibility tree | Manual inspection only. |
| **VoiceOver (macOS)** | Manual Screen Reader | End-to-end screen reader experience | macOS only. Requires human operator. |
| **NVDA (Windows)** | Manual Screen Reader | End-to-end screen reader experience | Windows only. Requires human operator. |

## Finding Format

```
[A11Y-SC] Description — severity
→ file:line — component
WCAG SC: X.X.X
Severity: blocker | major | minor
Fix pointer: See fixing-accessibility: Keyboard Navigation | ARIA Labels | etc.
```

| Severity | Definition | Example |
|----------|-----------|---------|
| **Blocker** | No keyboard access OR no text alternative for critical content | Keyboard trap in modal; image with no alt that conveys information |
| **Major** | WCAG failure that degrades but doesn't block access | Contrast 3.5:1 on body text; missing aria-label on icon button |
| **Minor** | WCAG failure on non-critical element or partial compliance gap | Heading skip on secondary content; touch target 40px |

## Common Rationalizations

| Excuse | Rebuttal |
|--------|----------|
| "Axe passes so it's accessible" | Axe catches ~40% of WCAG violations. The manual matrix is mandatory — keyboard, focus, screen reader, zoom. |
| "We'll test a11y before launch" | Shift-left. Test on changed UI each PR. Finding a11y issues on launch day means delaying launch. |
| "Manual testing doesn't scale" | Scope the manual matrix to the changed UI surface (not the whole app). 10 minutes per PR. |
| "Screen reader testing is for experts" | VoiceOver basics take 10 minutes to learn. The "VO+Cmd+H" heading nav test alone catches most nav issues. |
| "Our users don't use screen readers" | ~5% of the population uses assistive tech. WCAG AA is legal minimum in many jurisdictions. |
| "Focus looks fine to me" | You're using a mouse. Tab through the page — you'll find issues immediately. |
| "Axe/Cypress caught everything" | Automated coverage is ~40%. False negatives mean issues ship that you never knew existed. |

## Red Flags — STOP

- Automated-only a11y testing (no manual keyboard/contrast/zoom check)
- No keyboard test run on UI changes — tab order never verified
- Icon buttons without `aria-label` found during manual check
- Skipped heading levels (h1 → h3) found in heading structure
- Color contrast below 4.5:1 on any body text, not tested
- Focus ring invisible or `outline: none` without `:focus-visible` fallback
- No screen-reader test on interactive components (modals, dropdowns, forms)

## Verification

- [ ] `@axe-core/playwright` run on all changed pages — 0 violations for critical/serious impacts
- [ ] Keyboard tab order tested — logical order, no traps, visible focus on every element
- [ ] Focus management tested — modal focus in/out, no reset on dynamic content
- [ ] Color contrast checked on all text/background pairs — ≥ 4.5:1 normal, ≥ 3:1 large
- [ ] Heading hierarchy verified — one h1, no skipped levels
- [ ] Form labels verified — all inputs have associated labels, errors identify fields
- [ ] Screen reader quick test (VoiceOver or NVDA) — labels announce correctly
- [ ] Zoom 200% — no content loss, no horizontal scroll
- [ ] Touch targets ≥ 44×44px (mobile viewport)
- [ ] Findings reported with WCAG SC, severity, file:line, fix pointer to `fixing-accessibility`

## Skill Result Contract

```xml
<skill-result>
  <name>a11y-testing</name>
  <output>
    <automated tool="axe-core" violations="3" critical="0" serious="2" minor="1" />
    <manual-matrix>
      <check name="keyboard-nav" result="PASS" />
      <check name="focus-management" result="FAIL — modal focus not restored" />
      <check name="screen-reader" result="PASS" />
      <check name="color-contrast" result="PASS" />
      <check name="headings" result="FAIL — skipped h1→h3" />
      <check name="form-labels" result="PASS" />
      <check name="touch-targets" result="PASS" />
      <check name="zoom-200" result="PASS" />
    </manual-matrix>
    <findings>
      <blocker count="0" />
      <major count="2" />
      <minor count="1" />
    </findings>
  </output>
</skill-result>
```

## See Also

- **nfr-testing** — Orchestrator that routes to this skill for the a11y dimension
- **fixing-accessibility** — Fix issues found during testing (before/after code patterns)
- **ui-quality-audit** — Score UI quality across 5 dimensions including accessibility
- **playwright** — Browser automation tooling for axe-core injection and screenshot tests
- **production-hardening** — i18n, error states, edge cases — many overlap with a11y concerns
- **frontend-design** — Build accessible UI from the start with proper ARIA + semantic HTML
