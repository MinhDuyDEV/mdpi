---
description: Close the active feature — finalize, clear .active, record outcome
argument-hint: "[--done | --blocked | --abandoned] [--note <text>] [--help]"
---

# Close: $ARGUMENTS

Finalize the active feature: record its outcome, update `state.md`, and clear `.pi/artifacts/.active`. Use to recover from a dangling `.active` left by a failed/abandoned `/ship`, or to mark a completed feature done without running the full `/ship` review.

## Parse Arguments

| Argument       | Default | Description                                          |
| -------------- | ------- | --------------------------------------------------- |
| `--done`       | false   | Mark feature complete (success). Append completion summary to progress.md. |
| `--blocked`    | false   | Mark feature blocked. Record blocker in state.md.  |
| `--abandoned`  | false   | Mark feature abandoned. Note reason.               |
| `--note`       | —       | Free-text reason/note appended to progress.md      |
| `--help`       | false   | Show this usage                                     |

If no outcome flag is given, ask the user: done / blocked / abandoned?

## Guard Phase

- Read `.pi/artifacts/.active`. If missing → report "No active feature to close." and stop.
- If `--done` and uncommitted changes exist → warn user, ask: commit first or close anyway?
- Never delete artifact directories — closing only updates markers and `state.md`.

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `git-workflow-and-versioning` | If uncommitted changes present | Decide commit/stash before closing |
| `documentation-and-adrs` | If `--done` | Capture a one-line outcome for handoff |

## Phase 1: Capture Outcome

1. Read active slug from `.pi/artifacts/.active`
2. Append to `.pi/artifacts/$SLUG/progress.md`:
   ```
   ## Close — <date>
   **Outcome:** <done|blocked|abandoned>
   **Note:** <user note or "" >
   ```
3. If `--done`: update `tasks.json` → mark all tasks `completed: true`.

## Phase 2: Update state.md

Update `.pi/templates/state.md` "Recent Completed Work" (or "Blockers" if `--blocked`):
- Add row: `<slug> | <title> | <date> | <one-line summary>`

## Phase 3: Clear .active

```bash
: > .pi/artifacts/.active   # truncate to empty (preserves the file)
```

Do **not** `rm` the file (other tooling may expect it to exist).

## Phase 4: Optional Memory

If `--done` and the outcome is non-trivial, persist a memory entry via the `memory` tool (pi-hermes-memory, action: `add`, target: `failure`, category: `insight`):
- content: "Feature <slug> closed — <outcome> — <key learning>"
- (target `failure` holds ALL categorized memories — failure/correction/insight/preference/convention/tool-quirk — not just failures; `insight` = durable learning from completing the feature)

## Stop Conditions

- No active feature → report and stop (not an error)
- `--done` with uncommitted changes and user declines to commit → stop, don't close

## Phase 5: Report

1. Outcome recorded
2. state.md updated (which section)
3. `.active` cleared
4. Next suggestion: `/status` to confirm, `/create` to start next feature

## Related Commands

| Need              | Command   |
| ----------------- | --------- |
| Check state       | `/status` |
| Start next        | `/create` |
| Resume (if wrong) | `/ship`   |

## Related Skills

- `git-workflow-and-versioning` — commit/stash discipline before closing
- `documentation-and-adrs` — outcome capture for handoff