---
name: flaky-test-management
description: "Use when a test fails intermittently (passes on retry, fails on rerun without code change) — covers flaky test detection, the retry-vs-fix decision, and quarantine policy. Flakes mask real regressions; do not ignore. Load for /flake or when CI shows intermittent failures."
---

# Flaky Test Management

## When to Use

- A test fails intermittently with no code change (passes on retry, fails on rerun).
- CI shows non-deterministic test failures.
- A flaky test is identified or suspected.
- Choosing between retry, quarantine, or fix.
- An order-dependent flake is blocking a PR.

## When NOT to Use

- A test consistently fails — it is broken, not flaky; use `debugging-and-error-recovery`.
- The goal is to add a retry policy without understanding root cause — stop and read this skill first.
- The test needs a regression suite placement decision — use `regression-strategy`.

## Overview

A flaky test is a **real bug**, not a CI hiccup. It passes and fails on the same code because the code is non-deterministic or the tests share state in an uncontrolled way. Every flaky test masks regressions: you can't trust a green CI run.

**Core principle:** Flaky tests are bugs. Retries mask them; root-cause fixes eliminate them. A flaky test is never "just flaky."

## What Is Flaky

A test is flaky when it fails and passes with **no code change** between runs.

### Root-Cause Categories

| Category | Symptom | Observable Clues |
| --- | --- | --- |
| **Order dependence** | Test A passes alone, fails when preceded by test B | Run tests in random/shuffled order; observe which order triggers failure |
| **Timing / race condition** | Test fails under load, in CI, or on slow machines; passes locally | Run on a loaded CI worker; compare local vs CI behavior |
| **External service** | Test passes when external API is up, fails when down or rate-limited | Observe timing with external dependency availability; check network errors in CI logs |
| **Parallelism without isolation** | Test fails only in parallel CI runs, passes with `--runInBand` | Run suite with parallel vs serial execution; compare results |

## Detection

| Method | How | Tooling |
| --- | --- | --- |
| Per-test pass rate tracking | Record pass/fail per test over last N CI runs; flag tests with <100% but >0% pass rate | GitHub Actions flaky-test detection, Buildkite test analytics, custom CI pipeline |
| Re-run detection | Re-run failed tests once; if they pass on retry, flag as flaky candidate | Jest `--rerun`, pytest `--reruns` (detection mode only), Playwright `--retries` |
| Quarantine CI gate | Tests flagged as flaky that fail again in quarantine confirm their flaky status | Custom CI quarantine job |
| Historical analysis | Query CI history for tests that pass/fail without code-change correlation | Datadog CI Test Visibility, Test Analytics |
| Order-dependence scanner | Run tests in random order (`--order random`), flag tests that fail differently | Jest `--randomize`, pytest-randomly, `vitest --sequence.shuffle` |

**`--reruns` / retries are for DETECTION only.** If a test passes on retry, it is flaky by definition. Do not use retries as a permanent fix — that is silencing.

## Retry-vs-FIX Decision

Applied in order. Stop at the first applicable rule.

| Rule | Action | Rationale |
| --- | --- | --- |
| **FIX** | Always, immediately | A flaky test is a real bug (nondeterministic code or shared state). Fix the root cause. |
| **Quarantine** (temporary) | Move to quarantine suite with a ticket, owner, and re-enable date | Only when the fix is blocked (needs a library upgrade, infrastructure change, or cross-team dependency) AND the flake is blocking CI. |
| **NEVER** | Silent retry-and-ignore as permanent policy | Retries mask the bug. You lose regression signal. The flake compounds with other flakes until the suite is meaningless. |

### IRON RULE

> Retries exist to **detect** flaky tests. A flaky test detected by retry must be **fixed or quarantined**, not silently accepted.

### Quarantine Policy

A quarantined test has a max TTL of **14 days**:

1. Create a ticket with root-cause hypothesis, owner, and re-enable date.
2. Move the test to a quarantine directory or label (`[QUARANTINE]` in test name, `flake_quarantine/` dir).
3. Quarantine runs are logged but do not block CI.
4. If the test is not re-enabled within 14 days, it is **deleted** with a note in the ticket.
5. Tests re-emerging from quarantine that flake again are deleted permanently (they tested the wrong thing).



## Flake Budget

Set a per-suite flake budget. When exceeded, new test writing pauses until the budget is restored.

| Metric | Target | Action if Exceeded |
| --- | --- | --- |
| % of tests flaky in last 14 days | <2% | Pause new test writing; run flake-fix sprint |
| % of CI runs with a flaky failure | <0.5% | Quarantine all newly-flaky tests; investigate patterns |
| Max age of oldest quarantined test | 14 days | Delete; if it mattered, someone will re-add it properly |

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "Just add a retry, it's flaky" | Retries mask real bugs. Fix the root cause. |
| "It's flaky because CI is slow" | Timing dependence is a bug. Make the test deterministic — use explicit waits, not timeouts. |
| "We'll fix it later" | Set a quarantine with a re-enable date. Later rarely comes without a deadline. |
| "The test passes on my machine" | That proves it's order or environment dependent. Run in CI order or with `--randomize`. |
| "We have only a few flaky tests, it's fine" | A few become many. Flakes compound. Fix at detection. |
| "The flake is in someone else's test" | It still blocks CI. Report to the owner with evidence; quarantine if unresolved within 48h. |
| "It passed on retry, so the build is green" | Retry-pass is still a flaky test. It will fail again. |
| "This test is just noisy, we should ignore it" | Delete it. A noisy test has negative value. |

## Red Flags

- Retry-and-ignore as a permanent CI policy.
- Quarantine without a ticket, owner, or re-enable date.
- Flaky test closed without a root cause identified.
- No flake detection or tracking.
- Flake rate tracked but no action taken.
- Tests that "pass on retry" accepted as green.
- Same flaky test re-appears after deletion (not fixed, just re-added).
- Order-dependent flakes worked around by fixing test order (use `--randomize` to surface order deps).

## Verification

- [ ] All flaky tests detected in the last 14 days have a ticket or root-cause fix.
- [ ] No test has been silently retrying for >7 days without investigation.
- [ ] Quarantine has zero tests older than 14 days.
- [ ] Flake rate is <2% of tests.
- [ ] CI runs with `--randomize` or shuffle mode at least weekly to surface order dependence.
- [ ] Retry count is set to 0 (detection retries are off, or logged but not gating).
- [ ] Each quarantined test has: root-cause hypothesis, owner, re-enable date.

## Skill Result Contract

```xml
<skill_result>
  <skill>flaky-test-management</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Flaky tests detected, root causes diagnosed, retry-vs-fix decision documented, quarantine with owner/date</evidence>
  <artifacts>Flake report, quarantine list with TTL, root-cause fix PRs</artifacts>
  <risks>Non-reproducible flake, external-service-dependent flake, quarantine debt if re-enable dates slip</risks>
</skill_result>
```

## See Also

- `black-box-qa-playbook` — route to black-box QA activities including flake detection
- `defect-management` — structured defect lifecycle (process RCA for flake root causes)
