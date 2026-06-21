---
description: Aggregate black-box quality signals (contract, a11y, load, DAST, smoke, exploratory) into a go/no-go release readiness decision against a Definition of Done — the QA sign-off gate for no-code QA
---

# release-readiness-workflow (Black-Box)

Aggregate black-box quality signals into a single release readiness verdict — for QA/QC testing without code access. Consumes: contract test report, a11y report, load test report, DAST (ZAP against running app), smoke report, exploratory session report. Does NOT consume `/verify` (functional gates — that's the dev/SDET lane).

> **When to use:** Pre-release QA sign-off for no-code QA. The user judges from specs, contracts, and the running app only.
> **Invoked by:** `/release-gate`
> **Composes with:** `release-readiness` (black-box), `black-box-test-workflow` output, `contract-testing` output, `a11y-testing` output, `load-testing` output.

## Args

- `slug` (optional) — Active feature slug
- `dod` (optional) — Path to a Definition of Done (default: `qa-qc-framework` + `release-readiness` derive from spec.md acceptance criteria)

## Phases

### Phase 1: collect-black-box-signals
- **Agent:** general
- **Concurrency:** Dynamic (1 per signal, min 2, max 6)
- **Depends on:** —
- **Tool:** `subagent` (parallel mode)
- **Skills:** `release-readiness`, `api-testing`, `a11y-testing`, `load-testing`

**Prompt (per signal source):**

```
Collect ONE black-box quality signal for slug {slug}. DO NOT read source code — judge only from the running app + test tool output.

- CONTRACT: read `.pi/artifacts/{slug}/api-test-report.md` or run `/api-test` against the running API. Return: PASS/FAIL per operation, summary.
- A11Y: read `.pi/artifacts/{slug}/a11y-report.md` or run `a11y-testing` skill against the running app (axe + manual matrix). Return: P0/P1 count, automated + manual matrix verdict.
- LOAD: read `.pi/artifacts/{slug}/load-test-report.md` or run `load-testing` skill (k6/Lighthouse CI) against the running app. Return: thresholds passed/failed, budget breach count.
- DAST: run OWASP ZAP (or equivalent DAST tool) against the running app at the staging URL. Check for exploitable findings on internet-facing routes. Return: P0/P1 count, verdict.
- SMOKE: run critical user journeys on the running app via Playwright CLI (no code). Record PASS/FAIL per journey with screenshots in `/tmp/bbqa-smoke-<journey>.png`.
- EXPLORATORY: if a charter was created, run an exploratory session (timebox 30 min) via `exploratory-testing` skill. Return: charter satisfied? P0/P1 findings? Session log with screenshots.

Guard: if a signal source has no configured tool, report NO-SUITE (not PASS). Return structured status to {phase_1_output}.
```

### Phase 2: aggregate
- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 1
- **Skill:** `release-readiness`

**Prompt:**

```
Aggregate {phase_1_output} into a black-box readiness matrix against the Definition of Done from {dod} (or derive from spec.md acceptance criteria):

| DoD Criterion | Signal Source | Status | Evidence |
|---------------|---------------|--------|----------|
| All acceptance criteria met | Spec-based test report | ... | ... |
| API matches contract | Contract test report | ... | ... |
| UI matches mockup | UI test report (screenshots) | ... | ... |
| No P0/P1 a11y | A11y report | ... | ... |
| No perf budget breach | Load test report | ... | ... |
| No exploitable DAST finding | DAST report | ... | ... |
| Smoke green | Smoke report | ... | ... |
| Exploratory session complete | Exploratory report | ... | ... |
| Breaking changes documented | Changelog / contract diff | ... | ... |

Mark each criterion PASS | FAIL | NO-SUITE | DEFERRED (with justification). Return the matrix to {phase_2_output}.

IRON RULE: Do NOT call /verify or any dev-gate. Do NOT read source code or run SAST. This is the black-box lane.
```

### Phase 3: gate
- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 2
- **Skill:** `release-readiness`

**Prompt:**

```
Decide go/no-go from {phase_2_output}:

- GO: every DoD criterion is PASS (NO-SUITE acceptable only if user explicitly waives; otherwise blocks).
- NO-GO: any FAIL or un-waived NO-SUITE.

For NO-GO, list blockers with the exact DoD criterion + signal source + evidence + route to /defect. For GO, list any DEFERRED items as known-accepted-risk. Return the decision + rationale to {phase_3_output}.
```

## Final Synthesis (Main Agent)

Write the black-box release readiness verdict to `.pi/artifacts/$SLUG/release-readiness.md`:

1. **Verdict:** GO | NO-GO | GO-WITH-ACCEPTED-RISK
2. **DoD matrix** (criterion × signal × status × evidence)
3. **Blockers** (if NO-GO — exact criterion + evidence + route to `/defect`)
4. **Accepted risks / deferred items** (if GO-WITH-ACCEPTED-RISK)
5. **Signal freshness** (captured after last deployment? cache vs fresh)
6. **Next step:** GO → `/ship`; NO-GO → `/defect` per blocker

> **Hard rule:** This is the BLACK-BOX lane. Do NOT call `/verify`, `/nfr`, or any code-reading tool. The dev lane handles functional gates. QA signs off on observable behavior only.

## Invocation

```
run_workflow({ name: "release-readiness-workflow", args: { slug: "<slug>", dod: "<path or empty>" } })
```

Typically invoked by `/release-gate`.
