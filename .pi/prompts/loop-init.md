---
description: Scaffold a new unattended loop at .pi/loops/<name>/ with VISION, STATE, and a per-loop SKILL stub
argument-hint: "<name> [--help]"
---

# Loop Init: $ARGUMENTS

Scaffold a new loop-engineering harness at `.pi/loops/<name>/` from the templates shipped in `.pi/templates/`. Run once per loop. The scaffold is the contract + ledger + procedure the orchestrator (T9/T10) drives unattended.

> **Prerequisite:** `/loop-check <task>` returned GO. If not, refuse and tell the user to qualify the task first.

## Parse Arguments

| Argument | Default   | Description                                  |
| -------- | --------- | -------------------------------------------- |
| `<name>` | required  | Loop slug; used as directory name `loop/<name>/<ts>` branch prefix |
| `--help` | false     | Show this usage                              |

**Validation:** `<name>` must be a filesystem-safe slug (`^[a-z0-9][a-z0-9-]*$`, lowercase). Reject names containing `/`, spaces, or upper-case. Trim surrounding whitespace before use.

## When to Use

- You want to start a new unattended loop (nightly CI triage, dependency bumps, doc sync, PR babysitting).
- `/loop-check <task>` already returned GO (verification automated + token budget absorbs waste + human approves merge/deploy/deps).
- You need the contract (VISION.md), dedup ledger (STATE.json + STATE.md), and per-loop procedure (SKILL.md) that the orchestrator will drive.

Do NOT use for:
- One-off tasks (use `/create` or `/fix`).
- Tasks `/loop-check` refused (auth, payments, architecture) — refuse here too.

## The Scaffold Steps

### 1. Create the loop directory

Create `.pi/loops/<name>/` (parent `.pi/loops/` may not exist yet — create it).

### 2. Copy the four artifacts

Copy map (exact source → destination):

| Source (template)                         | Destination                          | Purpose                                   |
| ----------------------------------------- | ------------------------------------ | ----------------------------------------- |
| `.pi/templates/loop-vision.md`            | `.pi/loops/<name>/VISION.md`         | Anti goal-drift contract (FR2)            |
| `.pi/templates/loop-state.md`             | `.pi/loops/<name>/STATE.md`           | Human-readable state mirror (FR3)        |
| `.pi/templates/loop-state.json`           | `.pi/loops/<name>/STATE.json`         | Machine dedup ledger (FR3, authoritative) |
| (new stub)                                | `.pi/loops/<name>/SKILL.md`           | Per-loop procedure (classification + fix patterns) |

Copy the three templates byte-for-byte first (placeholders intact), then fill placeholders in the copied files. The `SKILL.md` stub is not a template — write a minimal seed:

```markdown
---
description: Per-loop procedure for <name> — classify, fix, escalate
---

# Loop Procedure: <name>

Reread `VISION.md` at the start of every run. Do not act outside it.

## Procedure

1. Reread `VISION.md` (boundaries authoritative).
2. Read `STATE.json` — build the dedup set from `processed[]`.
3. Fetch candidate items (per the loop's source: CI runs, PRs, packages, commits).
4. For each item: skip if in `processed[]`; else classify → fix / escalate / reject.
5. Run the Gate command (the ```bash block directly under `## Gate` in VISION.md); ship only on exit 0.
6. Append to `STATE.json.processed[]`, `completed[]`, `escalated[]`, or `failures[]`.
7. Enforce hard stops (see VISION.md "Hard stops").

## Classification rubric

<!-- Fill by hand after supervising the first manual runs. -->

## Fix patterns

<!-- Fill by hand as repeatable fixes are discovered. -->
```

### 3. Fill `<name>` placeholders

In the copied `VISION.md`, `STATE.md`, and `STATE.json`, replace every placeholder occurrence with the actual loop name:

- `<loop-name>` → `<name>`
- Leave human-fill placeholders (`[Owner]`, `[Date]`, `[cron expression or "manual"]`, `[Allowed action 1]`, `<GATE_COMMAND>`, etc.) as bracketed prompts for the user to edit by hand — do NOT invent values.

Tell the user explicitly which placeholders still need their input.

### 4. Print the rollout order

After scaffolding, print this rollout order so the user knows the path from scaffold to unattended run:

```
Rollout order:
  1. check      — /loop-check <task> (already GO; re-run if scope changes)
  2. init       — /loop-init <name>   (this step — scaffold created)
  3. supervise  — run the loop's SKILL.md manually in a session; refine classification/fix patterns
  4. wire       — copy loop-orchestrator.ts/.sh + loop-github-action.yml; set cadence + gate + scope
  5. run        — schedule cron/launchd (local) or GitHub Actions `on: schedule` (CI); loop runs unattended
  6. review     — /loop-review <name> for interactive maker/checker verify
  7. audit/cost — loop-audit scores readiness (L0-L3); track cost-per-accepted-change; kill if acceptance < 50%
```

## Idempotency Guard

Before writing anything:

1. Check whether `.pi/loops/<name>/` already exists.
2. **If it exists:** STOP. Do not overwrite. Ask the user:
   > `.pi/loops/<name>/` already exists. Overwrite all files (VISION.md, STATE.md, STATE.json, SKILL.md)? This destroys any hand-edited contract/state. (y/N)
3. **Refuse overwrite without explicit confirmation.** On `N` or no answer, abort and report the existing tree without modifying it.
4. **If it does not exist:** proceed with the scaffold.

This guard protects hand-edited VISION.md contracts and STATE.json dedup ledgers from being clobbered by a re-run.

## Output

Print:

1. **Created tree** (e.g.):
   ```
   .pi/loops/<name>/
   ├── VISION.md   (contract — fill [Owner], [Date], cadence, Scope, Gate)
   ├── STATE.md    (human-readable state mirror)
   ├── STATE.json  (machine dedup ledger — authoritative)
   └── SKILL.md    (per-loop procedure — fill classification + fix patterns by hand)
   ```
2. **Rollout order** (the 7-step block above).
3. **Placeholders still needing input** (list each `[...]` / `<GATE_COMMAND>` the user must fill by hand, with file:line where useful).
4. **Next step:** `supervise` — run the loop's `SKILL.md` manually in a session and refine classification/fix patterns before wiring the orchestrator.

## Failure Handling

| Scenario                              | Action                                                        |
| ------------------------------------- | ------------------------------------------------------------ |
| `<name>` missing or invalid slug      | Abort with the validation regex and an example               |
| `.pi/loops/<name>/` exists, no confirm| Abort, print existing tree, do not modify                     |
| Template missing from `.pi/templates/`| Abort, list which template is missing (T2 must be shipped first) |
| `<name>` would collide with a reserved path | Abort, suggest an alternate slug                        |

## Stop Conditions

- `<name>` invalid → stop, report the regex.
- Directory exists and user declines overwrite → stop, report existing tree.
- Any of the three templates missing → stop, report (T2 prerequisite unmet).

## Related Commands

| Need                     | Command           |
| ------------------------ | ----------------- |
| Qualify a task first     | `/loop-check`     |
| Review a running loop    | `/loop-review`    |
| Audit loop readiness     | `loop-audit`      |

## Related Skills

- `loop-engineering` — 2-condition test, 5 building blocks, VISION/state contract, failure modes
- `planning-and-task-breakdown` — decompose the loop's procedure into verifiable steps