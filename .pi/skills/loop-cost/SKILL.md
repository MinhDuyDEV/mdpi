---
name: loop-cost
description: Use when estimating tokens/day for an unattended coding loop before it ships — computes cadence × realistic blend per L1/L2/L3, a suggested daily cap, and the early-exit-required flag (early-exit on empty watchlist < 5k tokens). Load before approving a loop's budget or setting a per-run cap.
---

# Loop Cost

Token-budget skill for unattended coding loops. Answers the budget half of the loop-engineering 2-condition test: *is the cost of one wasted run small enough that the cadence does not bankrupt you?* Produces a tokens/day estimate, a suggested daily cap, and an early-exit flag the orchestrator (`loop-orchestrator.ts`) consumes from `--mode json` token events (FR13).

## When to Use

- You are about to qualify or ship an unattended loop and need to set a per-run cap.
- An orchestrator asks for a daily budget number before registering a cron/GitHub Actions schedule.
- You are sizing whether a no-op (watchlist empty) run is cheap enough to schedule hourly.
- You are revising a cap after cadence or level changes (e.g., L2 triage promoted to L3 fix loop).

## When NOT to Use

- Interactive single runs with a human watching every turn — no cadence, no budget problem.
- Estimating dollar cost or latency — this is tokens only; multiply by model price elsewhere.
- Choosing loop qualification or confidence thresholds — those live in `loop-engineering` and `loop-guard`.

## The Blend Model

A loop's per-run cost is not a single number; it is a **blend** over what actually happens across runs. Each loop is assigned one Level; within that Level, runs distribute across three outcomes:

| Level | Early-exit (watchlist empty / no-op) | Triage (diagnosis-only, no fix) | Full fix (edit + verify) |
| ----- | ------------------------------------ | ------------------------------- | ------------------------ |
| **L1** | 90% | 10% | — |
| **L2** | 85% | 10% | 5% |
| **L3** | 40% | 35% | 25% |

**Per-run token estimates (assumptions — state yours explicitly and override for your stack):**

- **Early-exit:** 2,000 tokens (read watchlist, confirm empty, write state, exit).
- **Triage:** 12,000 tokens (read failure, reproduce attempt, write diagnosis-only comment, no edits).
- **Full fix:** 80,000 tokens (read + reproduce + edit + run gate + revise + post).

These are starting points for a pi 0.79.x maker on a mid-size TS/JS repo with a passing gate. For larger repos, heavier languages, or failing gates, raise them. Always state the assumptions used so the arithmetic is reproducible.

**Expected tokens per run** = blend:

```
E[run] = p_early * T_early + p_triage * T_triage + p_fix * T_fix
```

where `p_*` are the Level's percentages (as fractions) and `T_*` the per-run estimates above.

## Daily Cap Formula

Given a **cadence** (runs/day) and a Level, the daily budget is:

```
tokens_per_day = cadence_per_day * E[run]
suggested_daily_cap = ceil(tokens_per_day * safety_factor)
```

- **cadence_per_day**: scheduled runs in 24h. Hourly = 24, every-15-min = 96, nightly = 1, weekdays-only nightly = ~22.
- **safety_factor**: 1.5 default. The blend is an *expectation*; real days cluster worse (a flaky CI + a real bug in one day). 1.5 covers one bad day without doubling cost. Lower to 1.25 for well-observed stable loops; raise to 2.0 for new loops with unknown variance.
- **per_run_cap**: set on the orchestrator's `--mode json` token watcher to `safety_factor * T_fix` (the worst single-run case), not the blend — a single run that blows past `T_fix` is a runaway, not a bad day. FR13's "exceeds a per-run cap" kill trigger uses this number.

The orchestrator accumulates usage from token events and **kills the loop when usage exceeds `suggested_daily_cap`** (FR13), recording it in state.

## Early-Exit Rule

**Early-exit-required flag** is set (true) when the loop's no-op case costs under the early-exit ceiling:

```
early_exit_required = T_early < 5000
```

With the default `T_early = 2,000`, the flag is **true** for every Level. If your stack pushes `T_early ≥ 5,000` (huge watchlist read, chatty state writes), the flag flips to **false** — that loop is too expensive to schedule freely and should be re-scoped or scheduled less often.

When `early_exit_required` is true and the watchlist is empty, the orchestrator **must** early-exit and must not proceed to triage/fix — FR13: *"no-op (watchlist empty) → early-exit < 5k tokens."* The non-functional ceiling is a hard 5k.

## Worked Examples

Assumptions (used in every row): `T_early = 2,000`, `T_triage = 12,000`, `T_fix = 80,000`, `safety_factor = 1.5`.

| Cadence (runs/day) | Level | E[run] arithmetic | E[run] (tokens) | tokens/day | Suggested daily cap (×1.5) | per-run cap (×1.5 of T_fix=80k) | Early-exit required? |
| ------------------ | ----- | ----------------- | --------------- | ---------- | -------------------------- | ------------------------------ | -------------------- |
| 1 (nightly)        | L1    | 0.90·2k + 0.10·12k + 0·80k = 1,800 + 1,200 | 3,000 | 3,000 | 4,500 | 120,000 | yes (2k < 5k) |
| 24 (hourly)        | L1    | 0.90·2k + 0.10·12k = 3,000 | 3,000 | 72,000 | 108,000 | 120,000 | yes |
| 1 (nightly)        | L2    | 0.85·2k + 0.10·12k + 0.05·80k = 1,700 + 1,200 + 4,000 | 6,900 | 6,900 | 10,350 | 120,000 | yes |
| 24 (hourly)        | L2    | 0.85·2k + 0.10·12k + 0.05·80k = 6,900 | 6,900 | 165,600 | 248,400 | 120,000 | yes |
| 1 (nightly)        | L3    | 0.40·2k + 0.35·12k + 0.25·80k = 800 + 4,200 + 20,000 | 25,000 | 25,000 | 37,500 | 120,000 | yes |
| 24 (hourly)        | L3    | 0.40·2k + 0.35·12k + 0.25·80k = 25,000 | 25,000 | 600,000 | 900,000 | 120,000 | yes |
| 96 (every 15 min)  | L1    | 3,000 | 3,000 | 288,000 | 432,000 | 120,000 | yes |
| 96 (every 15 min)  | L3    | 25,000 | 25,000 | 2,400,000 | 3,600,000 | 120,000 | yes |

**Reading the table:** the hourly-L3 row (600k tokens/day, 900k cap) is the warning zone — an L3 fix loop scheduled hourly is almost certainly over-budget unless you have a large API quota. The nightly-L1 row (4,500 cap) is the cheap, safe default for triage loops. The every-15-min-L3 row is a NO-GO on cost alone — re-scope to L2 or drop cadence.

## Output Contract

`loop-cost` produces a single budget record the orchestrator consumes:

```json
{
  "level": "L1" | "L2" | "L3",
  "cadence_per_day": <number>,
  "assumptions": {
    "T_early": 2000,
    "T_triage": 12000,
    "T_fix": 80000,
    "safety_factor": 1.5
  },
  "E_run_tokens": <number>,
  "tokens_per_day": <number>,
  "suggested_daily_cap": <number>,
  "per_run_cap": <number>,
  "early_exit_required": true | false,
  "verdict": "GO" | "NO-GO"
}
```

- `verdict` is **NO-GO** if `suggested_daily_cap` exceeds your stated daily quota, or if `early_exit_required` is false, or if the loop is L3 at sub-hourly cadence (cost-only refuse, independent of the refuse-list in `loop-engineering`).
- The orchestrator reads `suggested_daily_cap` into its `--mode json` token watcher and `per_run_cap` as the per-run kill threshold (FR13).

## Verification

A `loop-cost` estimate is correct iff all of these hold:

1. **Arithmetic reproduces.** Re-run `E[run] = p_early·T_early + p_triage·T_triage + p_fix·T_fix` with the Level's percentages and the stated `T_*`; the result matches `E_run_tokens`. The percentages are the only Level-dependent input.
2. **Percentages sum to 1.0 per Level.** L1: 0.90 + 0.10 = 1.00. L2: 0.85 + 0.10 + 0.05 = 1.00. L3: 0.40 + 0.35 + 0.25 = 1.00. If they don't sum to 1.00, the blend is wrong.
3. **Cap ≥ tokens/day.** `suggested_daily_cap = ceil(tokens_per_day * safety_factor)` and `safety_factor ≥ 1.0`. A cap below `tokens_per_day` is a bug.
4. **per_run_cap uses the worst case, not the blend.** `per_run_cap = safety_factor * T_fix`. If it equals `safety_factor * E_run_tokens`, the runaway-run protection is broken.
5. **Early-exit flag matches `T_early`.** `early_exit_required = (T_early < 5000)`. With `T_early = 2,000` it is `true`. If `T_early` is overridden and the flag wasn't recomputed, it's stale.
6. **Assumptions are explicit.** Every number in the output traces to an entry in `assumptions`. No hidden constants.

Run the check manually: pick any Worked Examples row, substitute the Level percentages into the blend formula with the stated `T_*`, and confirm `E_run_tokens` and `suggested_daily_cap` match. If they do, the model is internally consistent; if a row is off, the skill is broken.