---
name: loop-audit
description: Use when scoring a project's loop-engineering readiness 0-100 + L0/L1/L2/L3 from concrete repo signals (state file, verifier/gate, loop skills, safety docs, GitHub workflows, MCP, worktree evidence, cost observability, real loop activity). Emits a numeric score, a level, and ≥1 recommendation. L3 is gated on a proven committed run.
---

# Loop Audit

Readiness scoring for loop-engineering. A loop is a system that prompts an agent on a schedule; before you trust one to run unattended, measure whether the project is actually loop-ready. This skill converts concrete repo signals into a **reproducible 0-100 score** and a **L0/L1/L2/L3 level**, then emits ≥1 recommendation. The score is computed from a fixed rubric (below) — it is not an opinion. L3 is capped at L2 until a real cycle has been run and committed.

## When to Use

- Before wiring a loop to run unattended (cron/launchd/GitHub Actions `on: schedule`).
- Before promoting a loop from supervised to unattended.
- On a cadence, to detect readiness drift (skills deleted, guard unregistered, state file dropped).
- When a stakeholder asks "is this project ready to loop?"

## When NOT to Use

- A single interactive change with no schedule or repetition (no loop to score).
- Scoring the *correctness* of loop output — that is `/loop-review`'s job (exit-code evidence). This skill scores *readiness*, not output quality.

## The Signals

Each signal is a concrete, checkable artifact. Check the repo; mark present/absent; sum the points. No signal is subjective — if you cannot point to a file/line, the signal is absent.

| # | Signal | What counts as present | Points |
|---|---|---|---|
| 1 | **State file present** | A loop state ledger exists and is non-empty: `.pi/loops/*/STATE.json` (or `STATE.md`) with `processed`, `in_progress`, `completed`, `failures`, `lessons`, `metrics`, `last_run`, `stop_conditions_met`. A blank/template file scores 0. | 12 |
| 2 | **Verifier/gate present** | An objective gate command is named in a VISION/contract file (`Gate:` section of `.pi/loops/*/VISION.md`) OR a gate script exists (e.g. `scripts/loop-gate.sh`, `npm test` referenced by the orchestrator). The gate must be a real command whose exit code decides pass/fail. | 14 |
| 3 | **Loop skills present** | Count of loop-* skills/prompts installed: `loop-engineering`, `loop-audit`, `loop-cost`, `/loop-check`, `/loop-review`, `/loop-init`. 0 → 0; 1-2 → 4; 3-4 → 8; 5-6 → 12. | 12 |
| 4 | **Safety docs** | Never-do rules + security checklist documented (in `loop-engineering` skill or a loop's `SKILL.md`): refuse-list (auth/payments/architecture), path protection, dangerous-cmd block, human-approval-required. | 10 |
| 5 | **GitHub workflows** | A loop CI workflow exists: `.github/workflows/*loop*` referencing `pi -p` and `on: schedule`, OR the `loop-github-action.yml` template is present. | 10 |
| 6 | **MCP / tool_call hook** | A `tool_call` hook is registered (`.pi/extensions/loop-guard.ts` in `.pi/settings.json` `extensions[]`) OR an MCP adapter is wired for loop tools. Capability-deprivation (`--tools` allowlist) documented in the orchestrator counts. | 8 |
| 7 | **Worktree evidence** | The orchestrator uses `git worktree add` for isolation (grep the orchestrator source/template for `worktree`). | 10 |
| 8 | **Cost observability** | Both: (a) a budget/cost doc or estimate (e.g. `loop-cost` output, a `BUDGET.md`, a cap value in the orchestrator) AND (b) a per-run log exists (a `logs/` or `.pi/loops/*/logs/` dir with at least one run log). One without the other → 6. | 12 |
| 9 | **Real loop activity** | A proven committed run: `STATE.json.last_run` set AND at least one item in `processed[]`/`completed[]` AND a git commit/PR attributable to the loop (branch `loop/<name>/<ts>` merged or open). A scaffolded-but-never-run loop scores 0 here. | 12 |
| | **Total** | | **100** |

## Scoring (0-100 → level)

Compute the raw score by summing the present signals (0-100). Then map to a level.

| Level | Raw score | Extra requirements |
|---|---|---|
| **L0** — nothing real | 0-29 | (none) |
| **L1** — structure, not yet run | 30-54 | (none) |
| **L2** — capable but unproven | 55-77, **OR** score ≥78 but missing any L3 gate requirement | (none) |
| **L3** — proven, gated, ready for unattended | ≥78 **AND** verifier/gate present (signal 2) **AND** state file present (signal 1) **AND** cost-ready (signal 8 full) **AND** real loop activity (signal 9) | **All four gate requirements must hold.** |

### The L3 gate (hard)

L3 is **capped at L2** until a real cycle has been run and committed. Structure alone — no matter how complete — cannot earn L3. The four gate requirements are conjunctive:

1. **Verifier/gate present** (signal 2, ≥14 available; must be present at all).
2. **State file present** (signal 1; a populated, non-template ledger).
3. **Cost-ready** (signal 8 full — both budget doc *and* run log).
4. **Proven committed run** (signal 9 — a real cycle, committed, not a scaffold).

If raw score ≥78 but any gate requirement is missing → **L2** with a recommendation naming the missing requirement. This is the anti-Ralph-Wiggum guard: a project that *looks* ready but has never actually run a cycle is not trusted to run unattended.

> **Scenario (FR4):** project has structure (score 80) but no proven runs → **L2** with recommendation "run one L1 cycle and commit state before L3".

## Output Contract

The skill always emits three things — no exceptions:

1. **Score:** the integer 0-100, with a one-line breakdown (which signals were present and their points). Reproducible: another agent re-running the rubric on the same repo must get the same number.
2. **Level:** one of `L0`, `L1`, `L2`, `L3`. If the raw score would map to L3 but a gate requirement fails, state the **capped** level (L2) and name the failed gate requirement.
3. **Recommendations:** ≥1 concrete, actionable next step tied to a missing/weak signal. Each recommendation cites the signal it would raise and the points recoverable. Never empty.

Output shape (markdown):

```markdown
# Loop Readiness Audit

**Score:** 64/100
**Level:** L2 (capped from L3 — missing proven committed run)

## Breakdown
| Signal | Present? | Points |
|---|---|---|
| State file | ✅ | 12 |
| Verifier/gate | ✅ | 14 |
| Loop skills | ✅ (4/6) | 8 |
| Safety docs | ✅ | 10 |
| GitHub workflows | ❌ | 0 |
| MCP/tool_call hook | ✅ | 8 |
| Worktree evidence | ✅ | 10 |
| Cost observability | ⚠ partial (budget doc only) | 6 |
| Real loop activity | ❌ | 0 |
| **Total** | | **64** |

## Gate check (L3)
- Verifier/gate: ✅
- State file: ✅
- Cost-ready (both): ❌ (no run log)
- Proven committed run: ❌
→ Capped at L2.

## Recommendations
1. Add `.github/workflows/loop-*.yml` with `on: schedule` + `pi -p` to recover +10 (signal 5) and unblock CI unattended runs.
2. Run one supervised L1 cycle end-to-end and commit `STATE.json` (branch `loop/<name>/<ts>` + PR) to recover +12 (signal 9) and satisfy the L3 proven-run gate.
3. Emit per-run logs to `.pi/loops/*/logs/` to complete cost observability (+6, signal 8) and satisfy the cost-ready gate requirement.
```

## Verification

Before claiming an audit is complete:

- [ ] The output contains a numeric score 0-100 and a reproducible breakdown (every signal marked present/absent/partial with its points).
- [ ] The output contains a level L0/L1/L2/L3. If L3 is claimed, all four gate requirements are explicitly checked and present.
- [ ] The output contains ≥1 recommendation, each tied to a missing/weak signal with recoverable points.
- [ ] A second pass over the same repo yields the same score (rubric is deterministic — disagreement means a signal was scored subjectively; re-check the artifact).
- [ ] L3 is never awarded without a proven committed run (signal 9 present AND a `loop/<name>/<ts>` branch/PR exists in git).

## See Also

| Companion | Role |
|---|---|
| `loop-engineering` | Methodology this skill scores against (2-condition test, 5 building blocks) |
| `/loop-check` | NO-GO qualification gate (run *before* a loop, not after) |
| `/loop-review` | Maker/checker — scores a *run's* output via exit code, not project readiness |
| `loop-cost` | Cost estimation feeding the cost-observability signal (8) |
| `loop-orchestrator.ts`/`.sh` | Runtime whose worktree/gate/state usage signals 1, 2, 7 detect |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We scaffolded the whole kit, that's L3" | Structure without a proven committed run is L2 max. The gate exists to prevent this exact claim. |
| "The score feels low" | The score is the rubric. Re-check the artifacts; if a signal is absent, it's 0 — no partial credit for "almost". |
| "We ran a loop once manually, that's proven" | Manual ≠ committed. Proven requires a committed cycle (branch + PR/commit attributable to the loop). |
| "L3 just needs a high score" | L3 needs score ≥78 **and** all four gate requirements. High score alone caps at L2. |

## Red Flags

- An L3 score with no `loop/<name>/<ts>` branch or PR in git history (gate failed; cap to L2).
- A score with no breakdown table (not reproducible — redo the audit).
- Zero recommendations (the contract requires ≥1; an empty recommendation list means the audit is incomplete).
- A signal marked present with no file/line citation (subjective scoring; re-check).
- Cost observability scored full with only a budget doc and no run log (signal 8 requires both).