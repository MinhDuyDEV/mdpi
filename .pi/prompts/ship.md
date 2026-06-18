---
description: Ship a plan - implement specs, verify, review, close
argument-hint: "[--skip-review] [--dry-run] [--help]"
---

# Ship

Execute spec tasks, verify each passes, run review, mark complete.

> **Workflow:** `/create` → **`/ship`** (or `/create` → `/plan` → `/ship`)

## Parse Arguments

| Argument        | Default | Description                               |
| --------------- | ------- | ----------------------------------------- |
| `--skip-review` | false   | Skip Phase 5 review (low-risk changes only) |
| `--dry-run`     | false   | Validate plan and preview execution without implementing |
| `--help`        | false   | Show this usage                           |

## Guard Phase

Before shipping:
- Use `vcc_recall` to search for failed approaches to avoid repeating
- Verify `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` exists (if not, tell user to run `/create` first)
- If `plan.md` exists, verify it references the current spec
- Workspace check: create branch if needed, install deps if needed

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `verification-before-completion` | Always | Evidence-before-claims; phantom detection; Worker Distrust Protocol |
| `shipping-and-launch` | Always | Pre-ship checklist, rollback planning, handoff protocols |
| `subagent-driven-development` | ≥2 independent tasks | Fresh subagent per task with review gates |
| `test-driven-development` | Tasks marked `tdd: true` | RED-GREEN-REFACTOR workflow (delegate to subagents) |
| `git-workflow-and-versioning` | After each task completes | Atomic commits, branch strategy, conventional commits |
| `code-review-and-quality` | Phase 5 review | 5-axis review: correctness, readability, architecture, security, performance |
| `doubt-driven-development` | High-risk features | In-flight adversarial review before merge |
| `context-engineering` | Batch workflow (≥5 independent tasks) | Context budget management for parallel subagent handoffs |

## Phase 1: Route to Execution

### Complexity Detection

**Direct execution** (sequential):
- Plan has <5 tasks
- Tasks have dependencies
- Tasks edit overlapping files

**Workflow execution** (parallel):
- Plan has ≥5 independent tasks
- No file conflicts between tasks

### Decision Logic

1. Read task list from `.pi/artifacts/$SLUG/tasks.json` (or `plan.md` if no tasks.json)
2. Count independent tasks (no `depends_on`)
3. Check for file conflicts (any shared files?)
4. Route:
   - <5 tasks OR has dependencies OR file conflicts → **Direct execution** (Phase 2)
   - ≥5 independent AND no conflicts → **Workflow execution** (Phase 3)

## Phase 2: Direct Execution (Sequential)

Execute tasks one at a time, verifying each before proceeding.

### Per-Task Loop

For each task:

1. **Read** the task description, verification steps, affected files
2. **Read** affected files before editing
3. **Implement** changes — stay within task's `files` list
4. **Handle Deviations:** If the implementation reveals scope beyond the task, apply deviation rules:
   - Rule 1: Trivial fix (<5 lines) in same file → fix inline, note in progress
   - Rule 2: New small dependency discovered → implement, note
   - Rule 3: Plan is wrong (task can't be done as specified) → report blocker
   - Rule 4: Deviance exceeds 20% of task scope → stop, present options
5. **Checkpoint Protocol:** If task has `checkpoint:*` type:

   | Type | Action |
   |------|--------|
   | `checkpoint:human-verify` | Execute automation first, then pause for user verification |
   | `checkpoint:decision` | Present options, wait for selection |
   | `checkpoint:human-action` | Request specific action with verification command |

6. **Verify** — run each verification step from the task
7. **If verification fails**, fix and retry (max 2 attempts per task)
8. **Commit** — load `git-workflow-and-versioning` skill, follow atomic commit protocol (NEVER `git add .`)
9. **Mark** `passes: true` in tasks.json
10. **Append** progress to `.pi/artifacts/$SLUG/progress.md`

### TDD Tasks

When task has `"tdd": true`, load `test-driven-development` skill. Subagents follow RED-GREEN-REFACTOR as defined in that skill. The orchestrating agent verifies the red-green cycle after each subagent returns.

### Stop Conditions

- Verification fails 2x on same task → stop, report blocker
- Blocked by unfinished dependency → stop, report which one
- Modifying files outside task scope → stop, ask user
- Rule 4 deviation → stop, present options

## Phase 3: Workflow Execution (Parallel)

If routed to workflow mode:

1. **Read the workflow:** `.pi/workflows/batch-implement.md`
2. **Execute all phases:**
   - Phase 1: Spawn 1 `review` agent to validate task independence
   - Phase 2: Spawn `general` agents (1 per independent task)
   - Phase 3: Spawn `review` agents to verify each implementation
   - Phase 4: Spawn 1 `general` agent to merge results
3. **Replace placeholders:** `{plan}` → plan, `{phase_N_output}` → actual output
4. **Load `context-engineering`** — ensures subagents receive focused context

**Announce:** "This plan has [N] independent tasks. Invoking batch-implement workflow for parallel execution."

**Fallback:** If batch workflow fails, fall back to Direct Execution (Phase 2).

## Phase 4: Verification Gate

Load `verification-before-completion` skill. Follow its verification protocol:
- Run typecheck + lint + test gates
- Use incremental mode by default (<20 changed files), full mode for shipping
- Record stamp to `.pi/artifacts/verify.log` after all gates pass
- Run phantom completion detection (from the skill)
- Goal-backward verification: check observable truths from plan/spec are satisfied

## Phase 5: Review

> Skip with `--skip-review` for low-risk changes.

### Mode Selection

| Condition | Mode |
|-----------|------|
| Routine change, low risk | **Standard Review** |
| High-risk feature, explicit quality gating request | **Iterative Quality Loop** (`.pi/workflows/quality-loop.md`) |

### Standard Review

Spawn 5 parallel `review` agents using `code-review-and-quality` skill's 5-axis methodology (security/correctness, performance/architecture, type-safety/tests, conventions/patterns, simplicity/completeness). Synthesize findings.

**Auto-fix rule:**
- Critical issues → fix inline, re-run Phase 4, continue
- Important issues → fix inline, continue
- Minor issues → log to `.pi/artifacts/$SLUG/progress.md`

### Iterative Quality Loop

For high-risk features: run the score-gated review loop workflow:

```bash
SLUG=$(cat .pi/artifacts/.active)
```

1. Read `.pi/workflows/quality-loop.md`
2. Initialize `review-state.json` as specified in the workflow
3. Execute the loop (EXECUTE → REVIEW → GATE → FILTER → FIX → RE-REVIEW)
4. Exit when score ≥ 5/5 or escalate per workflow rules

## Phase 6: Close

Ask user before closing. If confirmed:
- Update `tasks.json` to mark all tasks complete
- Append completion summary to `.pi/artifacts/$SLUG/progress.md`
- Clear `.pi/artifacts/.active`

## Failure Handling

| Scenario | Action |
|----------|--------|
| Task verification fails 2x | Stop, report blocker with file:line evidence |
| Subagent returns failure | Read error, retry once with adjusted prompt, then escalate |
| Review finds critical issue | Fix inline, re-run Phase 4, continue |
| Batch workflow failure | Fall back to sequential execution |
| Missing `.active` slug | Report: "No active feature. Run `/create` first." |

## Phase 7: Report

1. **Execution Summary:** tasks completed/total, waves executed, commits made
2. **Task Results:** per-task status, files modified, commit hashes
3. **Verification Gate Results:** typecheck, lint, test, build — pass/fail
4. **Goal-Backward:** artifacts verified (exists/substantive/wired), key links checked
5. **Review Summary:** critical/important/minor issues, overall assessment
6. **Next Steps:** Ask user if they want a PR created — always ask, never push without confirmation

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create feature | `/create`    |
| Plan execution | `/plan`      |
| Research topic | `/research`  |
| Fix a bug      | `/fix`       |
| Verify gates   | `/verify`    |

## Related Skills

- `verification-before-completion` — phantom detection, evidence gate, cache protocol (Phases 4-5)
- `shipping-and-launch` — pre-ship checklist, rollback planning (Phases 4, 6)
- `test-driven-development` — RED-GREEN-REFACTOR for TDD tasks (Phase 2)
- `git-workflow-and-versioning` — atomic commit protocol (Phase 2)
- `code-review-and-quality` — 5-axis review methodology (Phase 5)
- `subagent-driven-development` — subagent dispatch pattern (Phase 2-3)
- `doubt-driven-development` — adversarial review for high-risk work (Phase 5)
- `context-engineering` — context budgets for parallel subagents (Phase 3)
