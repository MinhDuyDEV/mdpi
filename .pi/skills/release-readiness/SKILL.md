---
name: release-readiness
description: "Use when making a go/no-go release decision that aggregates black-box quality signals (contract test, a11y, load, DAST, smoke) against a Definition of Done — the QA sign-off gate for no-code QA. Distinct from shipping-and-launch (release engineering). Consumes black-box test outputs; does NOT read code or run functional gates (those belong to devs). Load for /release-gate."
---

# Release Readiness (Black-Box)

## When to Use

- Making a go/no-go release decision as a QA/QC without code access
- Aggregating ALL black-box quality signals into a single readiness verdict
- Verifying a Definition of Done is met from observable evidence only
- Pre-release sign-off before handing to release engineering (`shipping-and-launch`)

## When NOT to Use

- Release engineering (deploy, rollback, handoff) — use `shipping-and-launch`
- Iterative code review — use `code-review-and-quality` (dev lane)
- Functional verification gates (typecheck/lint/test) — that's the dev/SDET lane
- You CAN read source code — in that case you're in the white-box lane; this skill is for the no-code QA who judges from specs, contracts, and the running app only

## Overview

Release readiness is the QA sign-off: "is this release safe to ship, based on what we can OBSERVE?" The oracle is the Definition of Done + the black-box test evidence — not the code.

**Core principle:** Aggregate observable signals (contract conformance, a11y, load, DAST, smoke, exploratory findings) against an explicit DoD. A signal without evidence is not a signal. A NO-SUITE signal is a gap — not a pass.

## The Definition of Done (DoD)

A black-box DoD checklist. Every criterion must have a signal source that produces evidence WITHOUT reading code:

| # | Criterion | Signal Source | How to Verify (no code) |
|---|-----------|---------------|--------------------------|
| 1 | All acceptance criteria met | Spec-based test report | RTM from spec: every AC has a PASS case |
| 2 | API matches contract | Contract test report | OpenAPI/GraphQL conformance: all operations respond per schema |
| 3 | UI matches mockup / no visual regression | UI test report (screenshots) | Screenshot diff against mockup; all states covered (empty/error/loading/success/0-1-many) |
| 4 | No P0/P1 a11y findings | a11y test report | Automated axe PASS + manual matrix PASS (keyboard/focus/screen-reader/contrast/heading) |
| 5 | No performance budget breach | Load test report | k6 thresholds met; Lighthouse CI budgets met |
| 6 | No exploitable DAST finding | DAST security report | OWASP ZAP runtime scan: no P0 findings on internet-facing routes |
| 7 | Smoke suite green | Smoke report | Critical user journeys pass on staging (via Playwright, no code) |
| 8 | Exploratory session complete | Exploratory session report | Charter satisfied, no P0/P1 findings, session log with screenshots |
| 9 | Breaking changes documented | Changelog + contract diff | Any API/behavior change visible from outside is recorded |

## Signal Aggregation Matrix

For each DoD criterion, record a status with evidence:

```
Criterion: API matches contract
  Signal: Contract test report (.pi/artifacts/$SLUG/api-test-report.md)
  Status: PASS | FAIL | NO-SUITE | STALE
  Evidence: (link to report or evidence files)
  Freshness: (when was the signal last run? Are files/changes newer?)
```

**Staleness rule:** If the app was redeployed after a signal was captured, the signal is STALE and must be re-captured before GO.

## Decision Rules

| Verdict | Condition | Action |
|---------|-----------|--------|
| **GO** | Every DoD criterion is PASS (NO-SUITE acceptable only if user explicitly waives that criterion) | Hand off to `shipping-and-launch` |
| **NO-GO** | Any FAIL or un-waived NO-SUITE | List exact blockers with evidence → route individual blockers to `/defect` |
| **GO-WITH-ACCEPTED-RISK** | GO with documented DEFERRED items (e.g., "no load test — waived for this release, add before next") | Accept risks, record in release notes |

**Hard rule:** NO-SUITE is NOT a pass. It's a gap. Report it. The user may waive it with a written justification; the agent cannot waive it silently.

## Distinction from Other Skills

| Skill | Role | This Skill's Relationship |
|-------|------|--------------------------|
| `shipping-and-launch` | Release engineering (deploy, rollback, handoff) | Run release-readiness FIRST; if GO, hand off to shipping-and-launch |
| `/verify` | Functional gates (typecheck/lint/test/build) | Dev/SDET lane — NOT used by black-box QA. Dev must verify their own code. |
| `code-review-and-quality` | Code-level review (5-axis, diff analysis) | Dev lane — reads source. Black-box QA does NOT review code. |
| `quality-loop` | Iterative diff review for high-risk features | Dev lane. Black-box QA reviews observable behavior, not diffs. |
| `/test --black-box` | Generate + execute black-box test cases | Feeds signals to this gate. |
| `/api-test` | Contract-driven API testing | Feeds the "API matches contract" signal. |
| `/defect` | Triage + process RCA + regression | Blockers from NO-GO route here. |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We tested the happy path, ship it" | Happy path alone = untested edges. Every DoD criterion must have an explicit status. |
| "No load test, but it feels fast" | NO-SUITE ≠ PASS. Add a test or waive with justification (and a date to add it). |
| "We'll monitor in production" | Observability complements pre-release sign-off; it doesn't replace it. Production is where bugs cost. |
| "A11y can wait for the next release" | A P0 a11y finding (no keyboard access) is a functional blocker for WCAG 2.2 AA. Deferral requires explicit risk acceptance. |
| "The devs said it's fine" | Hearsay is not evidence. Every signal needs a report with observable proof. |
| "I'll open the code to check" | You just switched to the white-box lane. Declare it — your oracle changed. |

## Red Flags

- GO with un-waived NO-SUITE
- Stale signals treated as fresh
- DoD implied, not written
- Only happy-path signals considered
- NO-GO blockers not listed with exact DoD criterion + evidence
- Skipping a11y/security because "no one complained"
- Relying on "the devs tested it" instead of an independent black-box report
- Screenshot-less test reports (evidence didn't happen)

## Verification

Before claiming a release readiness verdict:

- [ ] Every DoD criterion has a recorded status (PASS/FAIL/NO-SUITE/DEFERRED)
- [ ] Every PASS has an evidence file (report, screenshot, or tool output)
- [ ] Every signal is fresh (captured after the last deployment)
- [ ] NO-SUITEs are explicitly listed with a waiver or remediation plan
- [ ] The verdict (GO/NO-GO/GO-WITH-ACCEPTED-RISK) is stated with rationale
- [ ] For NO-GO, every blocker maps to an exact DoD criterion + evidence
- [ ] The release-readiness report is written to `.pi/artifacts/$SLUG/release-readiness.md`

## Skill Result Contract

```xml
<skill_result>
  <skill>release-readiness</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>DoD matrix with signal states + evidence paths</evidence>
  <artifacts>.pi/artifacts/$SLUG/release-readiness.md</artifacts>
  <risks>NO-SUITE signals, stale signals, accepted risks</risks>
</skill_result>
```

## See Also

- `black-box-qa-playbook` — Black-box lane router
- `contract-testing` — API contract conformance (DoD signal #2)
- `a11y-testing` — WCAG 2.2 AA conformance (DoD signal #4)
- `load-testing` — Perf budgets (DoD signal #5)
- `api-testing` — API request execution (DoD signal #2)
- `exploratory-testing` — Charter-based exploration (DoD signal #8)
- `spec-based-testing` — RTM + acceptance criteria (DoD signal #1)
- `defect-management` — Triage + process RCA for NO-GO blockers
- `shipping-and-launch` — Release engineering (handoff AFTER GO)
