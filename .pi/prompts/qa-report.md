---
description: Generate a QA metrics report (defect density, escape rate, DORA, flake rate, coverage trend)
argument-hint: "[--period <range>] [--scope <dir>] [--help]"
---

# QA Report: $ARGUMENTS

Generate a QA metrics report: defect density, escape rate, DORA metrics, test effectiveness, flake rate, coverage trend — distinguishing leading vs lagging indicators. Distinct from `fallow` (structural code metrics) and `observability-and-instrumentation` (prod telemetry); this is the QA/process metrics layer.

> **Lifecycle:** Maintenance utility. Feeds release retrospectives and quality decisions.
> **Composes with:** `qa-metrics` + `fallow` (structural) + `observability-and-instrumentation` (prod). Does NOT duplicate either.

## Parse Arguments

| Argument   | Default | Description                                |
| ---------- | ------- | ------------------------------------------ |
| `--period` | current | Time range (e.g., `last-week`, `sprint-12`)|
| `--scope`  | `.`     | Limit to a directory                       |
| `--help`   | false   | Show this usage                            |

## Guard Phase

- Load `qa-metrics` skill
- Detect available data sources: `fallow` (structural), git log (DORA lead time / deployment frequency), CI runs (change failure rate, flake rate), issue tracker (defect counts, escape rate), coverage reports
- If a metric's data source is unavailable, report NO-DATA (not zero)

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `qa-metrics` | Always | Metric definitions, leading vs lagging, report format, anti-metrics |
| `fallow` | Structural metrics | Dead code, complexity, duplication grades |
| `observability-and-instrumentation` | Prod metrics | MTTD/MTTR from production |
| `dcp-hygiene` | Output | Compress closed metric-collection when `compress` available |

## Execution

### Direct Execution

1. **Collect metrics** per `qa-metrics` definitions:
   - Lagging: defect density (defects/KLOC), escape rate (prod/total), DORA (deployment frequency, lead time, change failure rate, MTTR), test effectiveness (mutations killed / bugs caught), MTTD/MTTR
   - Leading: flake rate, coverage decay (per week), code churn (new vs modified), false-positive rate
2. **Source each metric** from its data source; mark NO-DATA where unavailable.
3. **Compute trend** (↑↓→) vs previous period where history exists.
4. **Apply anti-metric discipline:** do NOT report raw test count or coverage % as quality; report effectiveness + behavior coverage.
5. **Top defects + escape analysis:** list top defects this period and which escaped to prod (with the process gap that let each escape, per `defect-management`).
6. **Recommended actions:** from leading indicators (e.g., flake rate ↑ → `/flake`; coverage decay → `/test`; escape rate ↑ → `defect-management` prevention).

## Failure Handling

| Scenario | Action |
|----------|--------|
| A metric's data source unavailable | Report NO-DATA for that metric, continue others |
| No issue tracker integration | Report defect counts from git/memory where possible, mark NO-DATA otherwise |
| No coverage history | Report current coverage, mark trend NO-DATA |

## Stop Conditions

- All metrics NO-DATA → report "insufficient data sources", stop
- `fallow` not installed → skip structural metrics, continue QA metrics

## Output

> **DCP hygiene:** Before reporting, if `compress` is available, compress closed metric-collection output per `dcp-hygiene`. Skip if unavailable.

1. **Period + scope**
2. **Metrics table** (metric | value | trend ↑↓→ | leading/lagging | source)
3. **DORA snapshot**
4. **Top defects + escape analysis** (with process gaps)
5. **Flake report** (count, rate)
6. **Recommended actions** (routed to `/flake`, `/test`, `/defect`, `/nfr`)
7. **NO-DATA list** (which metrics need instrumentation)

Write to `.pi/artifacts/$SLUG/qa-report.md` (or inline / `.pi/QA-METRICS.md` for cross-period trend).

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Structural grades | `/gc`         |
| Fix a defect       | `/defect`     |
| Detect flakes      | `/flake`      |

## Related Skills

- `qa-metrics` — definitions, leading vs lagging, anti-metrics, report format
- `fallow` — structural metrics
- `observability-and-instrumentation` — prod MTTD/MTTR
- `defect-management` — escape analysis + prevention
