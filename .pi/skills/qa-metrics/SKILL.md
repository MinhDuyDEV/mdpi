---
name: qa-metrics
description: "Use when measuring quality over time — covers QA/process metrics (defect density, escape rate, DORA, test effectiveness, flake rate), leading vs lagging indicators, and the QA report format. Distinct from fallow (STRUCTURAL code metrics) and observability-and-instrumentation (PROD telemetry); this is the QA metrics layer for release/process decisions. Load for /qa-report or release retrospectives."
---

# QA Metrics

## When to Use

- Measuring quality trends across releases or sprints.
- Producing a QA report for a release gate or retrospective.
- Setting quality goals or SLAs.
- Distinguishing between metrics that predict problems (leading) and metrics that report problems (lagging).
- Reviewing whether current metrics incentivize the right behavior.

## When NOT to Use

- Measuring structural code quality (dead code, complexity, duplication); use `fallow`.
- Measuring production telemetry (latency, error budgets, traffic); use `observability-and-instrumentation`.
- One-off debugging or investigation; use `debugging-and-error-recovery`.
- Individual test quality (mock hygiene, anti-patterns); use `testing-anti-patterns`.
- Auditing a specific test or PR; use `code-review-and-quality`.

## Overview

Quality metrics exist to drive decisions, not to look good on a dashboard. A metric that can't be acted on is noise. A metric that incentivizes gaming is worse than no metric.

**Core principle:** Measure what you will act on. Leading metrics predict problems; lagging metrics confirm them. Use both.

## Metric Catalog

| Metric | Definition | Type | How to Measure | Actionable? |
| --- | --- | --- | --- | --- |
| **Defect density** | Bugs found per KLOC (or per story point) | Lagging | Count of confirmed bugs / size of codebase or feature | Identify high-defect modules for refactoring or deeper testing |
| **Defect escape rate** | % of bugs found in production vs total bugs found (prod + pre-prod) | Lagging | `prod_bugs / (prod_bugs + pre_prod_bugs)` × 100 | High escape → strengthen pre-prod testing (integration, e2e, load) |
| **Deployment frequency** | How often code is deployed to production | Lagging (DORA) | Count deploys per day/week/month | Low frequency → reduce batch size, improve CI/CD pipeline |
| **Lead time for change** | Time from commit to production | Lagging (DORA) | Median time across all commits | Long lead time → break work smaller, automate gates |
| **Change failure rate** | % of deploys causing a production incident | Lagging (DORA) | `failed_deploys / total_deploys` × 100 | High → invest in pre-deploy verification, canary, feature flags |
| **MTTR (mean time to resolve)** | Time from incident detection to resolution | Lagging (DORA) | Median time across incidents | High → improve observability, runbooks, incident response |
| **MTTD (mean time to detect)** | Time from bug introduction to detection | Lagging | Median time across bugs surfaced in CI or prod | High → improve test coverage, monitoring, or CI frequency |
| **Test effectiveness (mutation score)** | % of mutants (artificial faults) killed by tests | Lagging | Run mutation testing (`stryker`, `pitest`, `mutmut`) | Low → weak assertion density; add assertions, not tests |
| **Test effectiveness (bug catch rate)** | % of bugs caught by tests before reaching production | Lagging | `pre_prod_bugs_caught_by_tests / total_pre_prod_bugs` × 100 | Low → test gaps in the area where bugs originate |
| **Flake rate** | % of tests classified as flaky | Leading | `flaky_tests / total_tests` × 100 | Rising flake → discipline erosion; fix before it compounds |
| **Coverage decay** | Coverage percentage drop per week | Leading | Coverage diff week-over-week | Negative trend → new code untested; gate on coverage delta |
| **Code churn (new vs modified)** | Ratio of new code to modified code | Leading | `added_lines / (added_lines + modified_lines)` | High churn with no test growth → testing debt accumulation |
| **False-positive rate** | Tests that pass but assert nothing useful | Leading | Mutation score gap (coverage % vs mutation %) or audit sample | High → rewrite tests with meaningful assertions |
| **Test count growth** | Absolute test count (CAUTION: anti-metric if used alone) | Lagging | Straight count | Growth without effectiveness gain → trivial tests; cross-reference with mutation score |

## Leading vs Lagging

| | Leading | Lagging |
| --- | --- | --- |
| **What they do** | Predict a future problem | Report a past problem |
| **Examples** | Flake rate, coverage decay, code churn, false-positive rate | Defect density, escape rate, DORA metrics, mutation score |
| **When to act** | Before the defect ships | After the defect is found |
| **Risk if ignored** | You don't see quality eroding until it's a crisis | You only learn about quality problems after they hit production |
| **How to use them** | Set thresholds with automated alerts (e.g., "flake rate >2% → pause deployments") | Review in retrospectives; identify systemic patterns |

**Rule:** Never manage quality by lagging metrics alone. By the time a lagging metric signals a problem, the damage is done. Leading indicators give you a chance to act.

## Anti-Metrics

These metrics are dangerous because they incentivize the wrong behavior:

| Metric | Why It's Dangerous | What to Use Instead |
| --- | --- | --- |
| **Test count** | Incentivizes trivial/duplicate tests. 10,000 tests that test nothing are worse than 200 that test everything. | Test effectiveness (mutation score) |
| **Coverage % alone** | Incentivizes tests that exercise code without asserting anything. 95% coverage with no assertions is 95% waste. | Coverage + mutation score + assertion density |
| **Bugs found per tester** | Incentivizes hiding bugs, reporting duplicates, or inflating trivial issues. | Defect escape rate + MTTD |
| **Pass/fail ratio** | Incentivizes deleting or skipping failing tests. | Flake rate + suite health from `regression-strategy` |
| **Lines of test code** | Incentivizes verbose, repetitive, or generated tests. | Mutation score + assertion-per-test ratio |

## QA Report Format

Produce a QA report at each release gate or retrospective. One page, trend-spotting, action-oriented.

```markdown
# QA Report: 2026-Q2 (Apr–Jun)

## Summary
- **Escaped defects:** 3 (↓ 2 from Q1)
- **DORA:** Deploy freq daily (→), lead time 4h (↓), CFR 5% (→), MTTR 1.2h (↑ slightly)
- **Flake rate:** 1.8% (→, within budget)
- **Coverage:** 82% (↓ 1% — coverage decay flagged in week 8)

## Metrics Trend

| Metric | Current | Prior Period | Trend |
|--------|---------|-------------|-------|
| Defect density | 0.4/KLOC | 0.6/KLOC | ↓ improving |
| Defect escape rate | 8% | 12% | ↓ improving |
| Deployment frequency | 4.2/day | 3.8/day | ↑ improving |
| Mutation score | 76% | 72% | ↑ improving |
| Flake rate | 1.8% | 1.5% | → stable |
| Coverage decay | -1% | 0% | ↓ warning |

## Top Defects + Escape Analysis
- **ESC-023** (escape → prod): Guest checkout fails on expired card with non-standard decline code.
  - Root cause: Third-party gateway edge case not covered in integration tests.
  - Action: Add test case for non-standard decline codes; coverage gap closed in PR #8921.
- **ESC-024** (escape → prod): Export CSV contains unescaped commas for multi-line fields.
  - Root cause: CSV library behavior changed on upgrade; no regression test caught it.
  - Action: Add CSV parsing regression test; document library quirk in AGENTS.md.

## Flake Report
- **3 tests quarantined** (all order-dependent, shared DB state).
- **Ticket FLAKE-101** opened for polluter fix (owner: @platform-team, re-enable: Jul 7).
- Flake rate within budget (1.8% < 2% threshold).

## Recommended Actions
1. **[P1]** Fix coverage decay: require coverage delta >0% on all PRs (currently unchecked).
2. **[P2]** Reduce MTTR: add runbook for CSV/export incidents (MTTR 1.2h is acceptable but trending up).
3. **[P1]** Address flaky order-dependent tests: schedule polluter fix sprint before Q3 release.

## Data Sources
- CI pipeline (GitHub Actions Test Analytics)
- Defect tracker (Jira, bugs labeled `escaped`)
- Mutation score (Stryker, weekly cron)
- `fallow health --score` (structural score, weekly)
```

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "We have 1000 tests, quality must be high" | Test count incentivizes trivial tests. Measure effectiveness (mutation score), not count. |
| "Coverage is 95%, we're good" | Coverage is a lower bound, not an indicator of quality. Measure mutation score and assertion density. |
| "Escape rate is low because we don't report bugs" | Hidden bugs aren't quality. Track bug discovery independently of reporting. |
| "We only look at lagging metrics" | Lagging metrics confirm problems after damage is done. Add leading indicators to predict. |
| "Metrics don't matter, just ship" | Without metrics you can't improve. You're flying blind. |
| "Flake rate is under 5%, that's fine" | 2% is the threshold. 5% means 1 in 20 CI runs carries a false signal. |
| "We can't measure mutation score, it's too slow" | Scheduled weekly. Even imperfect mutation score beats blind coverage. |
| "Our DORA metrics are bad because our process is bad" | DORA measures the process, not the team. Use them to improve the system. |

## Red Flags

- Managing quality by test count or coverage % alone.
- No escape-rate tracking (bugs found in production not categorized).
- Bugs hidden or unreported to protect metric scores.
- No leading indicators (all metrics report the past, none predict the future).
- Flake rate tracked but no action taken.
- Mutation testing never run or ignored.
- DORA metrics not measured or used for blame instead of system improvement.
- Metrics that have not changed in 6+ months (dashboard is decorative).
- QA reports exist but no one acts on the recommendations.

## Verification

- [ ] At least 3 leading indicators are tracked and have alert thresholds.
- [ ] At least 3 lagging indicators are tracked and reviewed at each release.
- [ ] Mutation score is measured (weekly or per-release).
- [ ] Defect escape rate is tracked with root-cause categorization.
- [ ] DORA metrics (deploy freq, lead time, CFR, MTTR) are tracked.
- [ ] Flake rate is tracked weekly and <2%.
- [ ] Coverage decay is monitored with a negative-delta alert.
- [ ] QA report is produced at each release gate and identifies actionable items.
- [ ] No quality metric creates an incentive to hide bugs or write trivial tests.
- [ ] Metrics trend is visible (↑↓→) — month-over-month comparison exists.

## Skill Result Contract

```xml
<skill_result>
  <skill>qa-metrics</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Metric definitions documented, leading + lagging indicators tracked, QA report generated, anti-metrics identified</evidence>
  <artifacts>QA report, metric trend data, mutation score run, flake rate log, DORA snapshot</artifacts>
  <risks>Metrics gamed if tied to incentives without auditing; data quality depends on tooling inputs</risks>
</skill_result>
```

## See Also

- `fallow` — structural code metrics (dead code, complexity, duplication, health score)
- `observability-and-instrumentation` — production telemetry, error budgets, monitoring
- `flaky-test-management` — flake rate as a leading indicator; tracking and fixing
- `regression-strategy` — suite health metrics; pruning; suite runtime
- `testing-anti-patterns` — false-positive rate; tests that pass but assert nothing
