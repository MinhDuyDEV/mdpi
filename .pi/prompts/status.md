---
description: Show active feature, recent progress, and blockers
argument-hint: "[--full] [--help]"
---

# Status: $ARGUMENTS

Surface where the project is right now: active feature, recent work, open blockers, and the next step. Read-only — never modifies state.

## Parse Arguments

| Argument  | Default | Description                                   |
| --------- | ------- | --------------------------------------------- |
| `--full`  | false   | Include full `progress.md` tail (last 50 lines) and `tasks.json` summary |
| `--help`  | false   | Show this usage                               |

## Guard Phase

- If `.pi/artifacts/.active` is missing or empty → report "No active feature." and surface `state.md` current position + roadmap phase instead.
- Read `.pi/templates/state.md` (the canonical "you are here" marker).

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `verification-before-completion` | Never (read-only) | Not needed — listed for symmetry only |

## Phase 1: Read State

1. `cat .pi/artifacts/.active` → active slug
2. Read `.pi/artifacts/$SLUG/spec.md` (PRD title + success criteria only)
3. Read `.pi/artifacts/$SLUG/plan.md` if exists (discovery level, task count)
4. Read `.pi/artifacts/$SLUG/tasks.json` if exists (task status: passes/completed flags)
5. Read `.pi/artifacts/$SLUG/progress.md` if exists (tail; `--full` → last 50 lines)
6. Read `.pi/artifacts/$SLUG/review-state.json` if exists (quality-loop score)
7. Read `.pi/templates/state.md` for blockers + open questions

## Phase 2: Check Workspace

```bash
git status --porcelain | head -20
git log --oneline -5
```

Report uncommitted changes and recent commits (count only, not full diff).

## Phase 3: Report

```
## Project Status

**Active Feature:** <slug> — <title>  (or: none)
**Phase:** <from state.md>
**Status:** In Progress / Blocked / Review

### Recent Work (last 5 progress entries)
- ...

### Task Completion
- Completed: X / Y tasks
- Pending verification: Z

### Blockers
- ... (from state.md)

### Workspace
- Uncommitted changes: <count>
- Last commit: <hash> <subject>

### Next Step
- /ship  (if tasks pending)
- /verify (if implementation done, not yet verified)
- /fix "<blocker>" (if blocked)
- /close (if feature done)
```

## Stop Conditions

- No active feature → report that, suggest `/create` or `/init`
- Missing artifact files → note which are missing, continue with what exists

## Related Commands

| Need             | Command   |
| ---------------- | --------- |
| Close feature    | `/close`  |
| Start feature    | `/create` |
| Continue feature | `/ship`   |

## Related Skills

- `context-engineering` — only if status reveals context degradation; not loaded by default