---
name: black-box-qa-playbook
description: "Use when testing as a QA/QC WITHOUT reading source code — the playbook for black-box testing UI, workflows, and APIs from docs + mockups + the running app, integrating Playwright/MCP tooling for screenshots and reports. Declares the white-box vs black-box distinction and routes to the right black-box skill (contract-testing, spec-based-testing, exploratory-testing, api-testing). The router/playbook for the black-box QA role. Load first when testing without code access."
---

# Black-Box QA Playbook

> Tests against artifact oracles (docs, mockups, contracts, the running app) — not source code. Evidence is screenshots, DOM captures, and network traces, not diffs.

## When to Use

- You are testing as QA/QC and do NOT have source access (or choose not to read it).
- You are testing from docs + mockups + specifications + the running application — no implementation inspection.
- You need to decide *which* black-box approach fits the task (contract testing, spec-based testing, exploratory testing, API testing).
- Any task where the deliverable is a test case + evidence file, not a code review.

## When NOT to Use

- You CAN read source code or need code-level analysis (SAST, coverage, mutation) — switch to the white-box SDET lane.

## Overview

**Core principle:** The oracle is the artifact, not the implementation. You judge behavior against docs, mockups, specs, contracts, and the running app. If you need to open `src/` to decide whether something is correct, you have left the black-box lane.

## Routing Table — Which Black-Box Skill to Load

When the user's intent matches one of these patterns, load the corresponding skill. Do NOT duplicate those skills here — route to them.

| User Says | Intent | Load This Skill |
|-----------|--------|-----------------|
| "Test this API against its OpenAPI/Swagger docs" | Contract conformance | `contract-testing` |
| "Send requests to this API and check the responses" | Request execution | `api-testing` |
| "Test this feature from the PRD/requirements doc" | Spec-based testing | `spec-based-testing` |
| "Explore the app and find bugs I don't know about" | Unstructured discovery | `exploratory-testing` |
| "Check the UI matches the mockup" | UI comparison (layout, copy, states) | This playbook's UI section |
| "Test this user journey / workflow end-to-end" | Multi-step flow verification | This playbook's workflow section |
| "Check the UI for accessibility compliance" | WCAG audit | `a11y-testing` |
| "Test performance under load/stress" | Load testing | `load-testing` |
| "Handle a reported defect" | Defect lifecycle | `defect-management` |
| "Fix flaky tests" | Flake management | `flaky-test-management` |
| "Track quality metrics over time" | QA measurement | `qa-metrics` |
| "Check release readiness" | Release gate | `release-readiness` |

**When the intent is ambiguous**, default to this playbook's UI/workflow section and note the assumption.

## UI Testing from Mockup/Spec (No Code)

Compare the running UI to the design artifact. Do NOT inspect component internals.

| Aspect | What to Check | How to Test (Black-Box) |
|--------|---------------|--------------------------|
| Layout | Spacing, alignment, column count matches mockup | Screenshot side-by-side with mockup; measure gaps with pixel ruler (DevTools) |
| Copy | All text matches mockup/spec — no placeholder "Lorem ipsum" | Read every visible string; flag drift from spec |
| States | Loading skeleton shows instantly, error state has message + retry, empty state has icon + CTA | Trigger each state; screenshot each |
| Interactive | Button hover/active/disabled states visually distinct | Hover + click + tab; screenshot state transitions |
| Responsive | Mockup shown at target breakpoint; no horizontal scroll at 375px or 1920px | Resize to each breakpoint; screenshot per breakpoint |

### State Checklist (Black-Box View)

Every UI component must be tested in ALL observable states. Reference `production-hardening` for more detail — this is the condensed check:

| State | What to Look For | Evidence |
|-------|------------------|----------|
| **Empty** | Blank container? Or meaningful empty state (icon + text + CTA)? | Screenshot of empty state |
| **Loading** | Content flash on load? Skeleton present? Spinner on action buttons? | Screenshot during loading |
| **Error** | Generic error ("Something went wrong") or actionable (what + why + fix)? | Screenshot of error state |
| **Success** | Data displays correctly? Confirmation visible? | Screenshot of populated state |
| **Long content** | Text truncates or wraps within bounds? No layout break? | Screenshot with max-length data |
| **0 items** | Empty state (above) | Screenshot |
| **1 item** | Single-item layout works — not stretched or broken | Screenshot |
| **Many items** | Scrolling/pagination works? No jank at 100+ items? | Scroll to bottom + screenshot |
| **Disabled** | Button grayed out WITH tooltip explaining why | Screenshot + tooltip text |
| **Offline** | Banner shown? Graceful degradation? | Screenshot in offline mode |

## Workflow Testing (User Journey, No Code)

Test multi-step flows by interacting with the running app. Judge each step from observable behavior only.

| Scenario Class | What to Test | Oracle |
|----------------|-------------|--------|
| **Happy path** | The primary flow end-to-end without deviations | Spec/docs describe expected screens and transitions |
| **Branching** | Alternate paths — cancel, skip, go-back, secondary action | Docs describe alternative outcomes |
| **Role/permission** | Log in as each role; note differences in available actions | Permission matrix in docs |
| **Data lifecycle** | Create → Read → Update → Delete each entity type | Record appears, reflects changes, disappears |
| **Abort/resume** | Start a multi-step flow, leave halfway, return | Flow resumes at correct step; no data corruption |
| **Concurrent** | Two users act on the same resource; observe conflict handling | Last-write-wins? Error? Merge? |
| **Error recovery** | Trigger a server error mid-flow; observe UX | Error state with retry path; no dead end or lost data |

**Workflow test rule:** Each step gets a screenshot or DOM capture. A workflow test without per-step evidence is not complete.

## Tool Integration Pattern (Playwright + MCP)

This playbook does NOT define Playwright CLI or MCP commands — those live in `playwright`. This section defines how a black-box QA INTEGRATES those tools for evidence.

### Evidence Capture Rules

| Rule | Why |
|------|-----|
| **Every finding needs a screenshot** | A black-box test without evidence did not happen. |
| **Save to `/tmp/bbqa-<case>.png`** | Follows playwright skill's token discipline: never inline binary data. |
| **Also capture DOM/console/network for state-heavy findings** | Screenshots miss console errors, failed XHRs, hidden state. |
| **File evidence path in the test case report** | Evidence must be locatable after the session ends. |

### Tool Routing (Black-Box QA)

| Need | Skill to Load | What It Provides |
|------|---------------|------------------|
| Screenshot, form fill, navigation, click | `playwright` (CLI mode pref) | `playwright-cli screenshot --filename=/tmp/bbqa-<case>.png` |
| Complex exploratory testing | `playwright` (MCP mode fallback) | Browser snapshot + element refs + self-healing |
| Live DOM/console/network inspection | `chrome-devtools` or `browser-testing-with-devtools` | Runtime state, network waterfall, console errors |
| API calls (bearer token setup, data seeding) | `api-testing` (this kit, via Playwright APIRequestContext or curl) | Request construction + response validation |

### Iron Rule

**Never read source files, never grep the codebase, never inspect implementation.** Judge correctness only from the artifact oracle (mockup, spec, contract, docs) and observable behavior. If you need to read source to evaluate a finding, declare the white-box switch.

## Evidence + Reporting

### Per-Case Format

```text
CASE: bbqa-ui-003 — Empty state of user list
STATE: Empty
EXPECTED: Empty state with icon + "No users yet" + CTA button
OBSERVED: Blank container with no content
RESULT: FAIL
EVIDENCE: /tmp/bbqa-003-empty-state.png
```

### Aggregate Report Format

```text
## Black-Box QA Report — [Feature/App]

| Case | State | Expected | Observed | Result | Evidence |
|------|-------|----------|----------|--------|----------|
| bbqa-001 | Loading | Skeleton visible | Content flash | FAIL | /tmp/bbqa-001.png |
| bbqa-002 | Error | Actionable error | Generic error | FAIL | /tmp/bbqa-002.png |
| bbqa-003 | Empty | Empty state | Blank | FAIL | /tmp/bbqa-003.png |
| bbqa-004 | Success | Data displayed | Data displayed | PASS | /tmp/bbqa-004.png |

### Summary
PASS: 1/4 | FAIL: 3/4 | UNTESTED: 12
```

## Common Rationalizations

| Rationalization | Rebuttal |
|----------------|----------|
| "I'll just peek at the code to understand it" | You are now white-box. Stay in your lane or declare the switch. |
| "Screenshots are overhead — I'll describe what I saw" | Evidence is the deliverable. No screenshot = no finding. |
| "The mockup is out of date, I'll test against what the code does" | Flag the drift to the stakeholder. Test against the agreed artifact; note the gap. |
| "I tested the happy path, it works" | Happy path proves nothing about edges, states, or errors. Test all observable states. |
| "This state is rare — I'll skip it" | Rare states are where production bugs hide. Test them. |
| "The empty state just shows nothing; that's fine" | A blank container is not an empty state. Every data display needs an intentional empty state. |
| "I can test workflows without screenshots per step" | Without per-step evidence, a workflow test cannot be reproduced or reviewed. |
| "I know how this should work from the code" | You read the code. Declare the white-box switch — your oracle changed. |

## Red Flags

- Reading source files mid-black-box session without declaring the lane switch.
- Findings without screenshots, DOM captures, or network evidence.
- Only happy-path UI tests — no empty/error/loading/disabled/offline coverage.
- UI tested only at one viewport.
- Workflow tested only for the happy path.
- Tool CLI/MCP commands defined here instead of routing to `playwright`.
- "Looks fine" without comparing to the artifact oracle (mockup/spec/docs).
- No aggregate report — findings listed but not compiled into a pass/fail summary.
- State checklist incomplete — skipping states because they're "rare" or "hard to trigger."

## Verification

- [ ] Black-box lane is confirmed (no source access or choosing not to read source).
- [ ] Correct sub-skill is loaded for the task type (routing table consulted).
- [ ] Every UI component tested in all observable states: empty, loading, error, success, long-content, 0/1/many items, disabled, offline.
- [ ] Every finding has a screenshot or DOM/network capture saved to `/tmp/bbqa-*.png` (or equivalent).
- [ ] Workflow tests capture evidence at each step — not just before/after.
- [ ] Report aggregates cases with PASS/FAIL, expected vs observed, and evidence paths.
- [ ] No source files were read during black-box testing (or switch was declared).
- [ ] Drift between artifact oracle (mockup/spec) and observed behavior is documented as a finding.

## Skill Result Contract

```xml
<skill_result>
  <skill>black-box-qa-playbook</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Screenshots saved to /tmp/bbqa-*.png, DOM/network captures, per-case PASS/FAIL report with evidence index</evidence>
  <artifacts>Aggregate report, evidence files, routing decision</artifacts>
  <risks>Untested states, uncovered workflows, artifact drift not documented, lane switch not declared</risks>
</skill_result>
```

## See Also

- **contract-testing** — Black-box: check API conformance against schema (OpenAPI, GraphQL introspection)
- **spec-based-testing** — Black-box: test from PRD/requirements without running app
- **exploratory-testing** — Black-box: unstructured discovery of unknown bugs
- **api-testing** — Black-box: send API requests and validate responses
- **playwright** — Tool: browser automation, screenshots, form interaction (CLI + MCP)
- **chrome-devtools** — Tool: live DOM/console/network inspection
- **browser-testing-with-devtools** — Tool: routes between DevTools and Playwright for evidence
- **production-hardening** — Reference: edge-case state checklist (empty/loading/error/disabled/offline)
- **qa-qc-framework** — Router: defines QA vs QC vs Testing; this skill adds the black-box distinction
