---
name: loop-engineering
description: Use when designing, qualifying, or running unattended coding loops (nightly CI triage, dependency bumps, doc sync, PR babysitting). Encodes the 2-condition test, the 5 building blocks, the VISION/state anti-drift contract, failure modes (Ralph Wiggum), confidence-gated action, and the honest ceiling.
---

# Loop Engineering

Methodology for designing systems that prompt an agent on a schedule, rather than hand-prompting it every turn. Composes native pi capabilities — never ships a daemon, never rebuilds scheduling/subagent/worktree. A loop is **qualified before it runs**, **gated by exit code before it ships**, **bound by a contract before it drifts**, and **budget-capped before it bankrupts you**.

## When to Use

- You are asked to "automate", "schedule", or "run nightly/unattended" a coding task.
- You are about to let an agent act repeatedly without you watching every turn.
- A task is being proposed for an orchestrator (`loop-orchestrator.ts`/`.sh`) or a GitHub Actions `on: schedule` run.
- You need to qualify, contract, score, review, or budget a loop before it ships anything.

## When NOT to Use

- A single interactive change with a human in the loop and a clear exit (no schedule, no repetition).
- Tasks that cannot pass the 2-condition test (see below) — those are NO-GO; do not loop them.

## The 2-Condition Test

Before any loop is allowed to run, **both** conditions must hold. If either fails, refuse (NO-GO) and cite which one:

1. **Verification is automated.** There exists an objective command whose exit code decides pass/fail — `npm test`, `tsc --noEmit`, `eslint`, a custom gate script. The stop condition is **computational (exit code)**, never an LLM's opinion.
2. **The token budget absorbs the waste.** The cost of one wasted run (gate fails, no-op, early-exit) is small enough that running the loop on its scheduled cadence does not blow the budget. Estimate it with `loop-cost` first; set a per-run cap.

Refuse-list (immediate NO-GO, no further test): **auth, payments, architecture.** These need human judgement a loop cannot provide. `/loop-check` codifies this gate.

> **Example (GO):** "triage failing CI nightly" with `npm test` as gate → verification automated, no-op early-exit <5k tokens → GO, citing "verification automated + budget absorbs waste".
> **Example (NO-GO):** "rewrite auth module" → refuse-list hit → NO-GO, citing "architecture refused".

## The 5 Building Blocks

Every loop is built from exactly five components. Missing any one is a NO-GO.

| # | Block | What it is | Where it lives |
|---|---|---|---|
| 1 | **VISION** | The contract: Goal, Scope, Out-of-scope, Definition-of-done, Gate (exact command, pass = exit 0), Hard stops, Human-approval-required. Reread at the start of every run. | `loop-vision.md` (template → `.pi/loops/<name>/VISION.md`) |
| 2 | **State** | Dedup ledger + working memory: Last run, In progress, Completed, Escalated, Lessons, **Processed items** keyed by stable IDs (CI run IDs, PR numbers, `package@version`, commit SHAs), Stop conditions. | `loop-state.md` + `loop-state.json` (machine ledger) |
| 3 | **Gate** | The exact command the orchestrator runs via bash and reads the exit code of. Ships only on exit 0; on non-zero, logs + records failure + cleans up. | The `Gate` section of `VISION.md` |
| 4 | **Qualification** | The NO-GO gate applied before the loop is ever scheduled (`/loop-check`): refuse-list + 2-condition test + 30-second checklist (objective gate exists, hard stop exists, human approves merge/deploy/deps). | `/loop-check` prompt |
| 5 | **Readiness** | A scored measure of whether this project is actually loop-ready: 0-100 + L0/L1/L2/L3 from signals (state file, verifier, gate, loop skills, safety docs, GH workflows, MCP, worktree, cost observability, **real loop activity**). L3 is capped at L2 until a real cycle is run and committed. | `loop-audit` skill |

The maker (the `pi -p` invocation that does the work) is **not** a building block — it is structurally deprived of ship tools (`--tools read,edit,write,bash,grep,find`). It can only stage work; the orchestrator ships **after** the gate passes. Capability-deprivation is structural, not behavioural.

## VISION/State Pattern (Anti Goal-Drift Contract)

Goal drift kills loops. Context summarization silently drops constraints mid-run; the agent then acts outside the original boundaries. The VISION/state pattern is the contract that prevents this.

- **Reread VISION.md at the start of every run.** Boundaries are re-derived from disk, not from context. When context summarization drops a hard stop, VISION.md restores it.
- **The loop must not act outside VISION.md.** Out-of-scope is as binding as in-scope. If a run discovers work that looks useful but is not in scope, escalate (write it to state's `Escalated`), do not do it.
- **State dedup makes re-runs idempotent.** `STATE.json.processed[]` is keyed by stable IDs. The orchestrator skips already-processed items; deleting `STATE.json` reprocesses everything. This is what makes scheduling safe — a duplicate trigger is harmless.
- **Hard stops are non-negotiable.** If a hard stop fires (gate fails repeatedly, budget cap hit, forbidden path touched), the loop records the stop in state and exits; it does not improvise a workaround.

## Failure Modes

### The Ralph Wiggum Loop

> _"I'm helping! I'm helping!"_ — shipping on LLM opinion instead of an exit code.

The canonical failure: the maker claims the work is done ("tests pass", "it works"), the loop ships it, and nobody ran the gate. The LLM self-approves. The result is broken work merged to main on the strength of a confident sentence.

**Prevention:** the stop condition is the gate's exit code, full stop. The orchestrator runs the gate via bash and reads `$?`. The maker's opinion is not evidence. `/loop-review` (maker/checker) defaults to REJECT when uncertain and cites the exact exit code in its evidence block. **Never let "I think it passes" substitute for `exit 0`.**

### Acting Without Confidence

The companion failure: the agent fixes a CI failure it cannot reproduce, on a hunch, and ships the fix. The gate may even pass — but the fix is a guess, not a diagnosis.

**Prevention:** confidence-gated action (next section). No local reproduction → no fix; write diagnosis-only and escalate.

### Other failure modes

- **Context drop** → mitigated by VISION.md reread (above).
- **Cost runaway** → mitigated by the 2-condition test (budget absorbs waste) + `loop-cost` estimate + per-run cap in the orchestrator.
- **Stray ship to main** → mitigated structurally: always ship to `loop/<name>/<ts>` branch + PR; human approves merge; `--tools` omits ship tools; never-do rules block auth/payments/architecture.
- **Gaming the gate** (maker edits the test/gate file to force a pass) → mitigated by Phase C path protection (`loop-guard.ts` blocks edits to `VISION.md`, `package.json`, lockfiles, the gate script). This is **not** eliminated — see Honest Ceiling.

## Confidence-Gated Action

When the maker is classifying a CI failure (or any observed anomaly) and deciding whether to act, run this decision procedure — do not fix on a hunch.

1. **Classify** the failure into one of: `flaky`, `infra`, `unknown`, `logic`, `regression`, `dependency`, `docs`, `test-only`. (Extend the taxonomy in the loop's `SKILL.md` as patterns emerge.)
2. **Estimate confidence** 0.0–1.0 from the evidence available to the maker *right now* (logs, diff, reproducer, prior `STATE.json.lessons`).
3. **Reproduce locally** if the class is reproducible. If you **cannot reproduce** the failure locally, **lower confidence and abort the fix** — write a diagnosis-only entry to state and escalate.
4. **Act only if** `confidence > threshold` **AND** `class ∉ {flaky, infra, unknown}`. Otherwise: **diagnosis-only**, no code change. Record the diagnosis in `STATE.json.failures[]` / `lessons[]` so the next run starts warmer.

```
if class in {flaky, infra, unknown}:
    → diagnosis-only (no fix)
elif not reproducible_locally:
    → lower confidence, abort fix, diagnosis-only
elif confidence > threshold:
    → act (fix), then run the gate
else:
    → diagnosis-only
```

The threshold is set per-loop in `VISION.md` (default `0.7`). Flaky/infra/unknown are **never** auto-fixed — they are noise that a loop must not chase, because chasing them is how the Ralph Wiggum loop starts (shipping a guess to make the gate green).

## Security Checklist

Before a loop is allowed to run unattended, confirm every item. A miss is a NO-GO.

- [ ] **Maker is capability-deprived.** `pi -p --tools read,edit,write,bash,grep,find` — no `push`/`pr`/`slack` in the allowlist. Audit the `--mode json` log: zero ship-tool calls recorded.
- [ ] **Gate is the only ship signal.** Exit 0 → push `loop/<name>/<ts>` branch + PR. Non-zero → no ship, record failure. Never ship to `main`.
- [ ] **Human approves merge/deploy/dependency changes.** The loop opens PRs; a human merges them. Never auto-merge.
- [ ] **Never-do rules enforced.** `loop-guard.ts` blocks bash matching auth/payments/architecture patterns, and protects `VISION.md`, `package.json`, lockfiles, and the gate script from edits.
- [ ] **Dangerous commands blocked when unattended.** `rm -rf`, `sudo`, `chmod 777` are blocked when `!ctx.hasUI` (no UI to confirm).
- [ ] **No secrets in the repo.** API keys via env/CI secrets (`PI_API_KEY`, `GH_TOKEN`), never committed.
- [ ] **Logs sanitized in unattended runs.** No secrets, tokens, or PII in per-run log files.
- [ ] **Idempotent + isolated.** `git worktree` per run (no file collision between parallel loops); `STATE.json.processed[]` skips duplicates; cleanup on pass *and* fail.
- [ ] **Graceful degradation.** Bash orchestrator uses `set -uo pipefail` (NOT `-e`); SDK orchestrator wraps each step in try/catch. A failing loop logs + records + the scheduler moves on — a loop never crashes the scheduler.
- [ ] **Permissions re-audited periodically.** Loop permissions drift; re-check never-do lists and protected paths on a cadence.

## The Honest Ceiling

What loops can and cannot do — stated plainly, because overselling the gate is how loops ship broken work to main.

- **The exit-code gate does not verify semantic correctness.** It verifies that a command exited 0. A test suite that passes can still encode wrong behaviour (Martin Fowler's "behaviour harness" gap — industry-unsolved). The gate is only as good as the test suite behind it.
- **Structural gaming is mitigated, not eliminated.** `loop-guard.ts` blocks edits to test/gate files, but cannot catch all semantic gaming (e.g. weakening an assertion without touching the gate file). An optional advisory LLM verifier can flag suspicious diffs, but the binding decision remains the exit code.
- **A loop cannot provide judgement it was not given.** Auth, payments, architecture, and "is this the right product decision" stay human. The refuse-list is the honest acknowledgment that some questions are not computable from the project's current state.
- **No live TUI/dashboard.** Observability is logs + `STATE.json` + PR history + `loop-audit` scores. A daemon with a dashboard is explicitly out of scope — compose external schedulers (cron/launchd/GitHub Actions) instead.
- **One loop per orchestrator invocation.** Concurrency is the scheduler's job, not the orchestrator's. Run multiple schedulers for multiple loops.

If a stakeholder asks "can the loop guarantee the work is correct?", the honest answer is: **no — it guarantees the gate passed, on a branch, reviewed by a human before merge.** That is the contract. Do not promise more.

## Verification

Before claiming a loop is engineered (not just scripted):

- [ ] `/loop-check <task>` returns GO with a cited condition (or NO-GO with a reason). Refuse-list tasks return NO-GO.
- [ ] `.pi/loops/<name>/VISION.md` has Goal, Scope, Out-of-scope, DoD, Gate, Hard stops, Human-approval-required.
- [ ] `.pi/loops/<name>/STATE.json` is valid JSON with `processed`, `in_progress`, `completed`, `escalated`, `failures`, `lessons`, `metrics`, `last_run`, `stop_conditions_met`.
- [ ] The gate command from `VISION.md` runs via bash and its exit code is the ship signal (parse the `--mode json` log; assert no `push`/`pr`/`slack` tool calls).
- [ ] Failing gate → no PR + `STATE.json` records `failed`; second run on the same item → skipped (idempotent).
- [ ] `loop-audit` returns a numeric score + L0-L3 + ≥1 recommendation; L3 only if a proven committed run exists.
- [ ] Cost: `loop-cost` estimate is within the daily cap; per-run cap in the orchestrator kills an over-budget loop and records the kill in state.

## See Also

| Companion | Role |
|---|---|
| `/loop-check` | NO-GO qualification gate (refuse-list + 2-condition test + 30s checklist) |
| `/loop-init` | Scaffold `.pi/loops/<name>/` from templates |
| `/loop-review` | Maker/checker — verifier runs the gate, cites exit code, defaults to REJECT |
| `loop-audit` | Readiness scoring (0-100 + L0-L3, L3 gated on proven run) |
| `loop-cost` | Token-cost estimation (cadence × blend per level + daily cap + early-exit) |
| `loop-vision.md` / `loop-state.md` / `loop-state.json` | Contract + working memory + dedup ledger templates |
| `loop-orchestrator.ts` / `loop-orchestrator.sh` | Unattended runtime (worktree → restricted maker → gate → ship-on-pass → state → cleanup) |
| `loop-github-action.yml` | CI unattended scheduling (`on: schedule: cron`) |
| `loop-guard.ts` | `tool_call` defense-in-depth (never-do bash + path protection + dangerous-cmd block when `!ctx.hasUI`) |
| `behavioral-kernel` | Re-center on smallest-working-change discipline when authoring loop procedures |
| `defense-in-depth` | Layered-validation patterns the security checklist draws from |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The maker said tests pass" | Opinion is not evidence. Run the gate; read the exit code. |
| "It's just one flaky test, I'll fix it" | Flaky/infra/unknown → diagnosis-only. Chasing noise is the Ralph Wiggum loop. |
| "The loop can probably handle auth if I prompt it well" | Refuse-list. Judgement a loop cannot provide stays human. |
| "We can skip the budget cap, it's a cheap model" | Cost runaway is the second most common loop failure. Estimate with `loop-cost` first. |
| "The gate passing means the work is correct" | The gate means the gate passed. Semantic correctness is the test suite's job, and that gap is industry-unsolved. |

## Red Flags

- A loop that ships on LLM opinion instead of exit code (Ralph Wiggum).
- A loop with no `VISION.md`, or one that isn't reread each run (goal drift incoming).
- A maker with ship tools in its allowlist (capability-deprivation broken).
- A loop that auto-merges PRs (human approval removed).
- A loop fixing flaky/infra/unknown classes (acting without confidence).
- A loop with no budget cap, or one that exceeded cap and wasn't killed.
- An L3 readiness score with no proven committed run (capped at L2 until proven).