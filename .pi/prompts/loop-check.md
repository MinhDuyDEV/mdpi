---
description: NO-GO qualification gate — decide whether a task is safe to run as an unattended loop
argument-hint: "<task description> [--help]"
---

# Loop-Check: $ARGUMENTS

Qualify a task before it is ever scheduled as an unattended loop. Emit a single GO/NO-GO verdict with the cited condition that produced it. This prompt is the gate *before* the gate — it refuses work a loop cannot honestly judge.

> Refuse first, test second, checklist last. Never let "looks automatable" override the refuse-list.

## Parse Arguments

| Argument       | Default  | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `<task>`      | required | The task proposed for unattended looping          |
| `--help`      | false    | Show this usage                                   |

## Step 1 — Refuse-List (Immediate NO-GO)

If the task touches any of these, **stop here** and emit NO-GO. Do not proceed to the 2-condition test.

- **auth** — login, sessions, tokens, permissions, auth flows, auth module rewrites
- **payments** — billing, checkout, refunds, subscriptions, payment provider integration
- **architecture** — framework/library switches, schema migrations, new DB tables, new services, breaking API changes

> Rationale: these need human judgement a loop cannot provide. The refuse-list is the honest ceiling, not a configurable preference.

If a refuse-list category is hit → `CONDITION: <refused category> refused` (e.g. `CONDITION: architecture refused`).

## Step 2 — The 2-Condition Test

Both conditions must hold. If either fails, emit NO-GO citing the failed condition.

1. **Verification is automated.** There exists an objective command whose **exit code** decides pass/fail — `npm test`, `tsc --noEmit`, `eslint`, a custom gate script. The stop condition is computational (exit code), never an LLM's opinion. If the only "check" is "the agent says it looks good" → FAIL.
2. **The token budget absorbs the waste.** The cost of one wasted run (gate fails, no-op, early-exit) is small enough that running on the scheduled cadence does not blow the budget. If a single failed run is expensive (large model, long context, many turns) and there is no per-run cap → FAIL.

If condition 1 fails → `CONDITION: verification not automated (no exit-code gate)`.
If condition 2 fails → `CONDITION: budget does not absorb waste (uncapped/expensive failed run)`.

## Step 3 — 30-Second Checklist

Confirm every item. Any miss → NO-GO citing the missing item.

- [ ] **Objective gate exists** — a named command with a pass = exit 0 contract (write it down; "tests" without a command is not a gate).
- [ ] **Hard stop exists** — a non-negotiable exit condition: repeated gate failure, budget cap hit, or forbidden path touched. The loop exits; it does not improvise.
- [ ] **Human approves merge/deploy/dependency changes** — the loop may open PRs and stage work; a human merges, deploys, and changes deps. No auto-merge.

Missing gate → `CONDITION: no objective gate`.
Missing hard stop → `CONDITION: no hard stop`.
No human-approval boundary → `CONDITION: no human-approval boundary on merge/deploy/deps`.

## Step 4 — Emit Verdict

Output **exactly** these two lines and nothing else as the decision:

```
VERDICT: GO
CONDITION: verification automated + budget absorbs waste
```

or

```
VERDICT: NO-GO
CONDITION: <cited condition from Step 1, 2, or 3>
```

- `VERDICT` is `GO` or `NO-GO` — no other values.
- `CONDITION` cites the specific condition that produced the verdict. For GO, cite both passing conditions. For NO-GO, cite the first failing condition (Step 1 overrides Step 2 overrides Step 3).
- Do not add rationale, recommendations, or next steps after the verdict lines. The verdict is the contract.

## Worked Examples

- **"triage failing CI nightly"** with `npm test` gate, no-op early-exit <5k tokens → `VERDICT: GO` / `CONDITION: verification automated + budget absorbs waste`
- **"rewrite auth module"** → `VERDICT: NO-GO` / `CONDITION: auth refused`
- **"migrate from REST to GraphQL"** → `VERDICT: NO-GO` / `CONDITION: architecture refused`
- **"keep docs in sync with code weekly"** with no gate command → `VERDICT: NO-GO` / `CONDITION: verification not automated (no exit-code gate)`

## Related

| Companion | Role |
|---|---|
| `loop-engineering` skill | The 2-condition test, refuse-list, and 5 building blocks this gate codifies |
| `/loop-init` | Scaffold `.pi/loops/<name>/` once a task is GO |
| `/loop-review` | Maker/checker verification — the gate *during* a run |
| `loop-audit` | Readiness scoring (L0-L3) for an already-GO loop |