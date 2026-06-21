---
description: Aggregate black-box quality signals (contract, a11y, load, DAST, smoke, exploratory) into a go/no-go release readiness decision — QA sign-off for no-code QA
argument-hint: "[--slug <slug>] [--dod <path>] [--dry-run] [--help]"
---

# Release Gate: $ARGUMENTS

Make a go/no-go release decision by aggregating black-box quality signals — contract conformance, a11y report, load test, DAST scan, smoke, and exploratory session — against an explicit Definition of Done. **Black-box only. No source code access.**

> **Lifecycle:** Ship. QA sign-off gate for no-code QA. Distinct from `shipping-and-launch` (release engineering).
> **Composes with:** consumes `black-box-test-workflow` + `contract-testing` + `a11y-testing` + `load-testing` + DAST + smoke + exploratory report outputs. Does NOT call `/verify` or any dev gate.

## Parse Arguments

| Argument    | Default | Description                                          |
| ----------- | ------- | ---------------------------------------------------- |
| `--slug`    | active  | Feature slug (default: `cat .pi/artifacts/.active`)  |
| `--dod`     | derived | Path to a Definition of Done (default: spec.md AC)  |
| `--dry-run` | false   | Collect signals and report matrix without gating     |
| `--help`    | false   | Show this usage                                      |

## Guard Phase

- Load `black-box-qa-playbook` + `release-readiness` skills
- Verify `.pi/artifacts/$SLUG/spec.md` exists
- Check signal freshness: if the app was redeployed since a signal was captured, mark STALE
- **IRON RULE:** do NOT read source code. Do NOT call `/verify`. Do NOT run SAST/semgrep/coverage analysis. The black-box QA lane judges from observable behavior only.

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `release-readiness` | Always | Black-box DoD aggregation + go/no-go rules |
| `black-box-qa-playbook` | Always | Lane discipline + evidence pattern |
| `dcp-hygiene` | Output | Compress closed output when `compress` available |

## Execution

Delegate to the `release-readiness-workflow` (black-box version):

```
run_workflow({ name: "release-readiness-workflow", args: { slug: "<slug>", dod: "<--dod or empty>" } })
```

**Announce:** "Aggregating black-box release readiness for [slug]. Oracle = artifacts + running app. No source access."

The runner collects black-box signals in parallel (contract test + a11y report + load test + DAST + smoke + exploratory), aggregates into a DoD matrix, and decides go/no-go.

> **Hard rule:** This gate aggregates black-box signals only. It does NOT call `/verify` (functional typecheck/lint/test — that's the dev lane). It does NOT read source code. Stale signals (captured before last deployment) require re-capture before GO.

## Failure Handling

| Scenario | Action |
|----------|--------|
| A signal source has no suite | Report NO-SUITE; blocks GO unless user waives |
| Signal stale (app redeployed since capture) | Mark STALE; require re-capture before GO |
| Contract test FAIL | NO-GO; route to `/defect` |
| A11y P0/P1 | NO-GO; route to `/defect` |
| Load budget breach | NO-GO; route to `/defect` |
| DAST exploitable finding | NO-GO; route to `/defect` |
| Smoke FAIL | NO-GO; route to `/defect` |

## Stop Conditions

- Any DoD criterion FAIL or un-waived NO-SUITE → NO-GO, report blockers with evidence
- Signal stale and cannot re-capture → NO-GO, report which signal
- Spec/DoD missing → stop, ask user to provide DoD

## Output

> **DCP hygiene:** Before reporting, compress closed output per `dcp-hygiene`. Skip if unavailable.

1. **Verdict:** GO | NO-GO | GO-WITH-ACCEPTED-RISK
2. **DoD matrix** (black-box criteria: contract × a11y × load × DAST × smoke × exploratory × AC)
3. **Blockers** (if NO-GO — exact criterion + evidence + route to `/defect`)
4. **Accepted risks / deferred items** (if GO-WITH-ACCEPTED-RISK)
5. **Signal freshness** (fresh vs stale)
6. **Next step:** GO → `/ship` close/deploy; NO-GO → `/defect` per blocker

Write to `.pi/artifacts/$SLUG/release-readiness.md`.

## Related Commands

| Need              | Command         |
| ----------------- | --------------- |
| Generate test cases| `/test`         |
| Test API contract  | `/api-test`     |
| Triage a blocker   | `/defect`       |
| QA metrics         | `/qa-report`    |

## Related Skills

- `release-readiness` — Black-box DoD + go/no-go
- `black-box-qa-playbook` — Lane router + evidence
- `shipping-and-launch` — Release engineering (run AFTER this gate passes)
