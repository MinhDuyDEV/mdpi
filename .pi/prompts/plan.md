---
description: Create detailed implementation plan with TDD steps
---

# Plan

Create a detailed implementation plan with TDD steps. Optional deep-planning between `/create` and `/ship`.

> **Workflow:** `/create` → **`/plan`** (optional) → `/ship`
>
> **When to use:** Complex tasks where spec verification steps aren't enough guidance. Skip for simple tasks.

## Before You Plan

- **Be certain**: Only create tasks you're confident about
- **Don't over-plan**: If the spec is clear, trust it
- **Budget context**: Target ~50% context per execution
- **Vertical slices**: Each task should cover one feature end-to-end

## Phase 0: Institutional Research (Mandatory)

Before touching the PRD or planning anything, load what the codebase already knows.

### Step 1: Search institutional memory

Use `vcc_recall` to search for bugfixes, existing plans. If relevant observations found, incorporate them.

### Step 2: Mine git history

```bash
git log --oneline -20
git log --oneline --follow -- <relevant-file-path>
git log --oneline --all | head -30
```

Look for: commit conventions, recent changes (merge conflict risk), similar features, footgun zones.

### Step 3: Spawn learnings-researcher (if Level 2-3 work)

```typescript
subagent({
  agent: "explore",
  task: "Search the codebase for patterns, conventions, and existing implementations related to: [FEATURE]. Return: existing patterns to follow, files to be aware of, and any gotchas."
});
```

## Phase 1: Guards

Verify:
- `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` exists (if not, tell user to run `/create` first)
- If `plan.md` already exists, ask user: overwrite or skip?

## Phase 2: Discovery Assessment

Before research, determine discovery level:

| Level | Scope | Action |
|-------|-------|--------|
| **0** | Skip — pure internal work, existing patterns only | Skip research |
| **1** | Quick (2-5 min) — single known library | `context7 resolve-library-id + query-docs` |
| **2** | Standard (15-30 min) — choosing between 2-3 options | Spawn `@scout` for research |
| **3** | Deep (1+ hour) — architectural decision | Full research with parallel `@scout` |

## Phase 3: Research (if Level 1-3)

Spawn parallel agents to gather implementation context:

| Agent     | Purpose                                                              |
| --------- | -------------------------------------------------------------------- |
| `explore` | Codebase patterns, affected file structure, test patterns, conflicts |
| `scout`   | Best practices, common patterns, pitfalls                            |

## Phase 4: Goal-Backward Analysis

**Step 1: Extract Goal from PRD** — outcome-shaped, not task-shaped.

**Step 2: Derive Observable Truths** — 3-7 truths from USER's perspective.

**Step 3: Derive Required Artifacts** — for each truth, what must EXIST.

**Step 4: Identify Key Links** — critical connections where breakage causes cascading failures.

## Phase 5: Decompose with Context Budget

Target ~50% context per execution. More plans, smaller scope = consistent quality.

| Task Complexity | Max Tasks | Context/Task | Total |
|------------------|-----------|--------------|-------|
| Simple (CRUD)    | 3         | ~10-15%      | ~30-45% |
| Complex (auth)   | 2         | ~20-30%      | ~40-50% |
| Very complex     | 1-2       | ~30-40%      | ~30-50% |

## Phase 6: Dependency Graph & Wave Assignment

For each task, record:
- `needs`: What must exist before this runs
- `creates`: What this produces
- `has_checkpoint`: Requires user interaction?

Build wave analysis for parallel execution.

## Phase 7: Write Plan

Write `.pi/artifacts/$(cat .pi/artifacts/.active)/plan.md`:

### Required Plan Header

```markdown
# [Feature] Implementation Plan

**Goal:** [Outcome-shaped goal from PRD]
**Discovery Level:** [0-3]
**Context Budget:** [Estimated context usage, target ~50%]

## Must-Haves

### Observable Truths
1. [Truth 1]
2. [Truth 2]

### Required Artifacts
| Artifact | Provides | Path |
|----------|----------|------|

### Key Links
| From | To | Via | Risk |

## Dependency Graph

Task A: needs nothing, creates src/models/X.ts
Task B: needs Task A, creates src/api/X.ts

Wave 1: A
Wave 2: B

## Tasks
```

### Task Standards

- **Exact file paths** — never "add to the relevant file"
- **Complete code** — never "add validation logic here"
- **Exact commands with expected output**
- **TDD order** — test first, then implementation
- **Each step is 2-5 minutes** — one action per step
- **UI state coverage** — empty/loading/error/success states when applicable

## Phase 8: Constitutional Compliance Gate

Before executing, scan the plan against AGENTS.md hard constraints.

### Automated Checks

Scan `plan.md` content for these patterns:

| Violation Pattern                                 | AGENTS.md Rule                              | Severity     |
| ------------------------------------------------- | ------------------------------------------- | ------------ |
| `git add .` or `git add -A`                       | Multi-Agent Safety: stage specific files    | **CRITICAL** |
| `--force` push or `force push`                    | Git Safety: never force push main           | **CRITICAL** |
| `--no-verify`                                     | Git Safety: never bypass hooks              | **CRITICAL** |
| `as any` or `@ts-ignore` without justification    | Quality Bar: strong typing                  | **WARNING**  |
| New package/dependency without approval step      | Guardrails: no new deps without approval    | **WARNING**  |
| `reset --hard` or `checkout .` or `clean -fd`     | Git Restore: never without explicit request | **CRITICAL** |
| Secret/credential patterns                        | Security: never expose credentials          | **CRITICAL** |

### Violation Response

| Severity     | Action                                                             |
| ------------ | ------------------------------------------------------------------ |
| **CRITICAL** | Stop. Remove violation from plan. Report to user.                  |
| **WARNING**  | Flag in plan output. Add confirmation checkpoint to affected task. |

## Phase 9: Report

1. **Discovery Level:** [0-3] with rationale
2. **Must-Haves:** [N] observable truths, [M] required artifacts, [K] key links
3. **Context Budget:** [Estimated usage]
4. **Dependency Waves:** [N] waves for parallel execution
5. **Task count:** [N] tasks, [M] TDD steps
6. **Files affected:** [List]
7. **Plan location:** `.pi/artifacts/$(cat .pi/artifacts/.active)/plan.md`
8. **Next step:** `/ship`

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create spec    | `/create`    |
| Execute plan   | `/ship`      |
| Research first | `/research`  |
