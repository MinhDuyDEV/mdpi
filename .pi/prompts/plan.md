---
description: Create detailed implementation plan with TDD steps
argument-hint: "[--level 0-3] [--dry-run] [--help]"
---

# Plan

Create a detailed implementation plan with TDD steps. Optional deep-planning between `/create` and `/ship`.

> **Workflow:** `/create` → **`/plan`** (optional) → `/ship`
>
> **When to use:** Complex tasks where spec verification steps aren't enough guidance. Skip for simple tasks.

## Parse Arguments

| Argument    | Default | Description                               |
| ----------- | ------- | ----------------------------------------- |
| `--level`   | auto    | Force discovery level: 0 (skip), 1 (quick), 2 (standard), 3 (deep) |
| `--dry-run` | false   | Preview plan without writing to disk       |
| `--help`    | false   | Show this usage                           |

## Guard Phase

Before planning:
- Verify `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` exists (if not, tell user to run `/create` first)
- If `plan.md` already exists, ask user: overwrite or skip?
- If `tasks.json` already exists (from a prior `/plan` run), read it to understand existing task structure — avoid re-decomposing

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `planning-and-task-breakdown` | Always | Goal-backward methodology, dependency graphing, wave assignment |
| `context-engineering` | Always | Context budget management — plans target ~50% context per execution |
| `test-driven-development` | Always | Structure tasks as RED-GREEN-REFACTOR steps |
| `incremental-implementation` | Always | Thin vertical slice discipline — each task is verify-after-each |
| `subagent-driven-development` | Multi-wave plan | Plan tasks for fresh subagent dispatch per task |
| `source-driven-development` | Level 1-3 | Ground decisions in official docs when researching dependencies |
| `dcp-hygiene` | Phase 8 Report | Compress closed git-history + research work-stream when `compress` is available |

## Phase 0: Institutional Research (Mandatory)

### Step 1: Search institutional memory

Use `vcc_recall` to search for bugfixes and existing plans. Also use `memory_search({ query: "<plan topic>", target: "failure", category: "insight" })` for durable institutional knowledge. If relevant observations found, incorporate them.

### Step 2: Mine git history

```bash
git log --oneline -20
git log --oneline --follow -- <relevant-file-path>
git log --oneline --all | head -30
```

Look for: commit conventions, recent changes (merge conflict risk), similar features, footgun zones.

### Step 3: Spawn learnings-researcher (Level 2-3 work)

```typescript
subagent({
  agent: "explore",
  prompt: "Search the codebase for patterns, conventions, and existing implementations related to: [FEATURE]. Return: existing patterns to follow, files to be aware of, and any gotchas."
});
```

## Phase 1: Discovery Assessment

Determine discovery level (same Level 0-3 taxonomy as `/create`):

| Level | Name | Scope | Action |
|-------|------|-------|--------|
| **0** | Skip | Pure internal work, existing patterns only | Skip external research |
| **1** | Quick | Single known library (~30 sec) | `context7` resolve + query |
| **2** | Standard | Choosing between 2-3 options (~1 min) | Spawn `scout` subagent for research |
| **3** | Deep | Architectural decision (~2 min) | Full research with parallel `scout` subagents |

Force with `--level N` flag. Default: auto-detect from spec complexity.

## Phase 2: Research (Level 1-3)

Spawn parallel agents:

| Agent     | Purpose                                                              |
| --------- | -------------------------------------------------------------------- |
| `explore` | Codebase patterns, affected file structure, test patterns, conflicts |
| `scout`   | External best practices, common patterns, pitfalls                   |

## Phase 3: Goal-Backward Analysis

Load `planning-and-task-breakdown` skill. Follow its methodology:

**Step 1: Extract Goal from PRD** — outcome-shaped, not task-shaped.

**Step 2: Derive Observable Truths** — 3-7 truths from USER's perspective.

**Step 3: Derive Required Artifacts** — for each truth, what must EXIST.

**Step 4: Identify Key Links** — critical connections where breakage causes cascading failures.

## Phase 4: Decompose with Context Budget

Load `context-engineering` skill. Target ~50% context per execution.

| Task Complexity | Max Tasks | Context/Task | Total |
|------------------|-----------|--------------|-------|
| Simple (CRUD)    | 3         | ~10-15%      | ~30-45% |
| Complex (auth)   | 2         | ~20-30%      | ~40-50% |
| Very complex     | 1-2       | ~30-40%      | ~30-50% |

## Phase 5: Dependency Graph & Wave Assignment

For each task, record:
- `needs`: What must exist before this runs
- `creates`: What this produces
- `has_checkpoint`: Requires user interaction?

Build wave analysis for parallel execution. Reference `subagent-driven-development` skill for task formats compatible with subagent dispatch.

## Phase 6: Write Plan

Write `.pi/artifacts/$SLUG/plan.md`:

```markdown
# [Feature] Implementation Plan

**Goal:** [Outcome-shaped goal from PRD]
**Discovery Level:** [0-3]
**Context Budget:** [Estimated context usage, target ~50%]

## Must-Haves

### Observable Truths
1. [Truth 1]
2. [Truth 2]
...

### Required Artifacts
| Artifact | Provides | Path |
|----------|----------|------|
...

### Key Links
| From | To | Via | Risk |
...

## Dependency Graph

Task A: needs nothing, creates src/models/X.ts
Task B: needs Task A, creates src/api/X.ts

Wave 1: A
Wave 2: B

## Tasks
[Task definitions with TDD steps]
```

After writing `plan.md`, derive the runtime `tasks.json` from it and write to `.pi/artifacts/$SLUG/tasks.json`:

```json
{
  "slug": "<slug>",
  "title": "<title>",
  "tasks": [
    {
      "id": "task-1",
      "description": "...",
      "files": ["src/path.ts"],
      "depends_on": [],
      "verification": ["npm run typecheck", "npm test -- path"],
      "tdd": false,
      "checkpoint": null
    }
  ]
}
```

`plan.md` remains the **authoritative** decomposition; `tasks.json` is the runtime mirror consumed by `/ship`. Keep them in sync.

### Task Standards

- **Exact file paths** — never "add to the relevant file"
- **Complete code** — never "add validation logic here"
- **Exact commands with expected output**
- **TDD order** — test first, then implementation (per `test-driven-development` skill)
- **Each step is 2-5 minutes** — one action per step
- **UI state coverage** — empty/loading/error/success states when applicable
- **Thin vertical slices** — per `incremental-implementation` skill

Use `.pi/templates/tasks.md` as the body template for the `## Tasks` section (task IDs, YAML metadata blocks, verification bullets).

## Phase 7: Constitutional Compliance Gate

Scan plan against AGENTS.md hard constraints:

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

## Failure Handling

| Scenario | Action |
|----------|--------|
| Plan already exists | Ask user: overwrite or skip? |
| Missing spec artifact | Report: "No spec found. Run `/create` first." |
| Subagent research fails | Retry once with adjusted prompt, then proceed with existing knowledge |
| Verification fails 2x | Stop, report blocker with file:line evidence. **Also:** save the failed approach to `memory(action: "add", target: "failure", category: "failure")` — the plan decomposition or approach that failed, and why. |

## Stop Conditions

- Spec artifact missing → stop, tell user: run `/create` first
- Plan already exists → ask user before overwriting
- Constitutional violation found (CRITICAL) → remove violation from plan, report to user
- Verification fails 2x on same approach → stop, escalate

## Phase 8: Report

> **DCP hygiene:** Before reporting, if the `compress` tool is available, compress the closed Phase 0-2 institutional-research + git-history + scout work-stream per the `dcp-hygiene` skill — observable truths, artifacts, and dependency waves are captured in `plan.md` and `tasks.json`. Skip if `compress` is unavailable.

1. **Discovery Level:** [0-3] with rationale
2. **Must-Haves:** [N] observable truths, [M] required artifacts, [K] key links
3. **Context Budget:** [Estimated usage]
4. **Dependency Waves:** [N] waves for parallel execution
5. **Task count:** [N] tasks, [M] TDD steps
6. **Files affected:** [List]
7. **Plan location:** `.pi/artifacts/$SLUG/plan.md`
8. **Next step:** `/ship`

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create spec    | `/create`    |
| Execute plan   | `/ship`      |
| Research first | `/research`  |

## Related Skills

- `planning-and-task-breakdown` — goal-backward decomposition, dependency graphing (Phases 3-5)
- `context-engineering` — context budget management (Phases 0, 4)
- `test-driven-development` — RED-GREEN-REFACTOR task structuring (Phase 6)
- `incremental-implementation` — thin vertical slice discipline (Phase 6)
- `subagent-driven-development` — task format for subagent dispatch (Phase 5)
- `source-driven-development` — doc-backed research (Phase 2)
