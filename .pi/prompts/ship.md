---
description: Ship a plan - implement specs, verify, review, close
---

# Ship

Execute spec tasks, verify each passes, run review, mark complete.

> **Workflow:** `/create` → **`/ship`**

## Load Skills

- `verification-before-completion` skill

## Before You Ship

- **Be certain**: Only ship if all tasks pass verification
- **Don't skip gates**: Build, test, lint, typecheck are non-negotiable
- **Run the review**: Always spawn review agent before closing
- **Verify goals**: Tasks completing ≠ goals achieved (use goal-backward verification)
- **Commit before close**: Per-task commits required, don't ship without git history
- **Ask before closing**: Never close without user confirmation

## Available Tools

| Tool                 | Use When                                            |
| -------------------- | --------------------------------------------------- |
| `subagent`           | Delegate to `explore`, `scout`, `review`, `general` agents |
| `semantic_query`     | Find code patterns by natural language              |
| `semantic_grep`      | Search codebase by regex pattern                    |
| `semantic_inspect`   | Find symbol definitions, callers, callees           |
| `semantic_show`      | Read source at path:line                            |
| `semantic_review`    | Diff review with codebase evidence                  |
| `websearch`          | Search the web for external references              |
| `vcc_recall`         | Search session history for prior approaches         |
| `memory_search`      | Search durable project memory                       |

## Phase 1: Guards

### Session Memory Search

Use `vcc_recall` to search for failed approaches to avoid repeating.

### Plan Validation

> **`.active` convention:** Commands read `$(cat .pi/artifacts/.active)` to resolve the current feature slug. If `.active` is missing or empty, tell user to run `/create` first.

Verify:
- `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` exists (if not, tell user to run `/create` first)

Check what artifacts exist by reading `.pi/artifacts/$(cat .pi/artifacts/.active)/`.

### Workspace Setup

Set up the workspace: create branch, install deps if needed.

## Phase 2: Route to Execution

### Complexity Detection

Before routing, analyze the plan complexity:

**Direct execution** (use existing logic):
- Plan has <5 tasks
- Tasks have dependencies (not fully independent)
- Tasks require sequential execution
- User explicitly requests sequential execution

**Workflow execution** (invoke `batch-implement` workflow at `.pi/workflows/batch-implement.md`):
- Plan has ≥5 independent tasks
- Tasks have no file conflicts
- Tasks can run in parallel
- User wants maximum parallelism

### Decision Logic

1. **Parse the plan** from `.pi/artifacts/$(cat .pi/artifacts/.active)/plan.md` or `tasks.json`
2. **Count independent tasks** (tasks with no dependencies)
3. **Check for file conflicts** (do any tasks edit the same files?)
4. **Route accordingly:**
   - <5 tasks OR has dependencies OR has file conflicts → Direct execution
   - ≥5 independent tasks AND no file conflicts → Invoke `batch-implement` workflow

### Workflow Execution (Parallel Implementation)

If complexity is detected as parallel:

1. **Read the workflow:** `.pi/workflows/batch-implement.md`
2. **Execute all phases:**
   - Phase 1: Spawn 1 `review` agent to review plan for task independence
   - Phase 2: Spawn multiple `general` agents (1 per task, dynamic count)
   - Phase 3: Spawn multiple `review` agents to verify implementations
   - Phase 4: Spawn 1 `general` agent to merge results
3. **Replace placeholders:**
   - `{plan}` → the implementation plan
   - `{phase_N_output}` → actual output from completed phases

**Announce:** "This plan has [N] independent tasks. Invoking batch-implement workflow for parallel execution."

### Direct Execution

If complexity is simple or tasks have dependencies, use direct sequential execution.

## Phase 3: Wave-Based Execution

If `plan.md` exists with dependency graph:

1. **Parse waves** from dependency graph section
2. **Execute wave-by-wave:**
   - Single-task wave → execute directly (no subagent overhead)
   - Multi-task wave → dispatch parallel `subagent({ agent: "general" })` calls, one per task
3. **Review after each wave** — run verification gates, report, wait for feedback
4. **Continue** until all waves complete

**Parallel safety:** Only tasks within same wave run in parallel. Tasks must NOT share files. Tasks in Wave N+1 wait for Wave N.

### Phase 3A: PRD Task Loop (Sequential Fallback)

For each task:

1. **Read** the task description, verification steps, and affected files
2. **Read** the affected files before editing
3. **Implement** the changes — stay within the task's `files` list
4. **Handle Deviations:** Apply deviation rules 1-4 as discovered
5. **Checkpoint Protocol:** If task has `checkpoint:*`, stop and request user input
6. **Verify** — run each verification step from the task
7. **If verification fails**, fix and retry (max 2 attempts per task)
8. **Commit** — per-task commit
9. **Mark** `passes: true` in tasks.json
10. **Append** progress to `.pi/artifacts/$(cat .pi/artifacts/.active)/progress.md`

### Checkpoint Protocol

When task has `checkpoint:*` type:

| Type | Action |
|------|--------|
| `checkpoint:human-verify` | Execute automation first, then pause for user verification |
| `checkpoint:decision` | Present options, wait for selection |
| `checkpoint:human-action` | Request specific action with verification command |

### TDD Execution Flow

When task specifies TDD:

**RED Phase:**
1. Create test file with failing test
2. Run test → MUST fail
3. Commit: `test: add failing test for [feature]`

**GREEN Phase:**
1. Write minimal code to make test pass
2. Run test → MUST pass
3. Commit: `feat: implement [feature]`

**REFACTOR Phase:** (if needed)
1. Clean up code
2. Run tests → MUST still pass
3. Commit if changes: `refactor: clean up [feature]`

### Task Commit Protocol

After each task completes (verification passed):

1. **Check modified files:** `git status --short`
2. **Stage individually** (NEVER `git add .`):
   ```bash
   git add src/specific/file.ts
   git add tests/file.test.ts
   ```
3. **Commit with type prefix:**

   ```bash
   git commit -m "feat: [task description]

   - [key change 1]
   - [key change 2]"
   ```

### Stop Conditions

- Verification fails 2x on same task → stop, report blocker
- Blocked by unfinished dependency → stop, report which one
- Modifying files outside task scope → stop, ask user
- Rule 4 deviation encountered → stop, present options

## Phase 4: Verification

Follow the Verification Protocol (see verification-before-completion skill):

- Use **full mode** (shipping requires all gates)
- All 4 gates must pass before proceeding to commit/push
- Also run PRD `Verify:` commands

## Phase 5: Review

```bash
BASE_SHA=$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)
```

### Mode Selection

| Condition | Mode |
|-----------|------|
| Routine change, low risk | Standard Review |
| High-risk feature, explicit user request for quality gating | Iterative Quality Loop |

### UI Quality Gate (always — both modes)

Detect changed UI files:

```bash
git diff --name-only $BASE_SHA...HEAD -- \
  '*.tsx' '*.jsx' '*.css' '*.scss' '*.sass' '*.less' '*.html' '*.mdx'
```

If any UI files changed, verify UX gates:
- One primary action per view/section
- Empty/loading/error/success states for async/data flows
- Retry/undo/confirm paths for errors and destructive actions
- Form labels, helper text, validation, and error association
- Semantic HTML, keyboard path, visible focus, reduced motion
- Component family consistency for related controls

### Standard Review Mode

Run **5 parallel agents** for review using subagent parallel mode:

```typescript
subagent({
  tasks: [
    { agent: "review", task: "Security/correctness review: ${WHAT_WAS_IMPLEMENTED} against ${PLAN}" },
    { agent: "review", task: "Performance/architecture review: ..." },
    { agent: "review", task: "Type-safety/tests review: ..." },
    { agent: "review", task: "Conventions/patterns review: ..." },
    { agent: "review", task: "Simplicity/completeness review: ..." }
  ]
});
```

Wait for all 5 agents to return. Synthesize findings.

**Auto-fix rule:**
- Critical issues → fix inline, re-run Phase 4 verification, continue
- Important issues → fix inline, continue
- Minor issues → note in `.pi/artifacts/$(cat .pi/artifacts/.active)/progress.md`

### Iterative Quality Loop Mode

Score-gated feedback loop for high-risk features.

#### Setup

Initialize loop state:

```bash
SLUG=$(cat .pi/artifacts/.active)
cat > ".pi/artifacts/$SLUG/review-state.json" << EOF
{
  "slug": "$SLUG",
  "rounds": 0,
  "maxRounds": 5,
  "lastScore": 0,
  "sameScoreCount": 0,
  "findingsResolved": 0,
  "findingsRemaining": 0,
  "status": "active"
}
EOF
```

#### Loop

Repeat steps 2-8 until exit or escalation:

| Step | Action |
|------|--------|
| **1. EXECUTE** | Implement per spec/plan (already done in Phase 3) |
| **2. REVIEW** | Spawn one review subagent with spec + diff + review-state.json. Returns: score (X/5), findings array, suggested next action |
| **3. GATE** | Score ≥ 5 → mark done (status: "passed"), exit loop. Score 4 → ask user. Score <4 → continue |
| **4. STALL?** | If `sameScoreCount ≥ 2` → escalate |
| **5. MAX?** | If `rounds ≥ maxRounds` → escalate |
| **6. FILTER** | Split findings: actionable vs informational vs architecture |
| **7. FIX** | For each actionable finding, spawn fix subagent |
| **8. RE-REVIEW** | Update review-state.json: increment rounds, update score |

### Goal-Backward Verification (if plan.md exists)

Verify that tasks completed ≠ goals achieved:

**Three-Level Verification:**

| Level | Check | Command/Action |
|-------|-------|----------------|
| **1: Exists** | File is present | `ls path/to/file.ts` |
| **2: Substantive** | Not a stub/placeholder | `grep -v "TODO\|FIXME\|return null\|placeholder" path/to/file.ts` |
| **3: Wired** | Connected and used | `grep -r "import.*ComponentName" src/` |

**Stub Detection:**

Red flags indicating incomplete implementation:
- `return <div>Component</div>` (Placeholder)
- `return <div>{/* TODO */}</div>` (Empty)
- `return null` (Empty)
- `onClick={() => {}}` (No-op handler)
- `fetch('/api/...')` (No await, ignored)
- `return Response.json({ok: true})` (Static, not query result)

If any artifact fails Level 2 or 3 → fix → re-verify.

## Phase 6: Close

Ask user before closing.

If confirmed, update `.pi/artifacts/todo.md` to mark all tasks complete and append summary to `.pi/artifacts/$(cat .pi/artifacts/.active)/progress.md`.

## Output

Report:

1. **Execution Summary:**
   - Tasks completed/total
   - Waves executed
   - Deviations applied (Rules 1-3)
   - Checkpoints encountered
   - Commits made

2. **PRD Task Results:**
   - Each task status
   - Files modified per task
   - Commit hashes

3. **Verification Gate Results:**
   - Build, Test, Lint, Typecheck: pass/fail

4. **Goal-Backward Verification:**
   - Artifacts verified: N exists, M substantive, K wired
   - Key links checked
   - Stubs detected

5. **Review Summary:**
   - Critical, Important, Minor issues
   - Overall assessment

6. **Next Steps:**
   - Ask user if they want a PR created — always ask, never push without confirmation

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Create feature    | `/create`     |
| Plan execution    | `/plan`       |
| Research a topic  | `/research`   |
| Fix a bug         | `/fix`        |
| Verify gate       | `/verify`     |
