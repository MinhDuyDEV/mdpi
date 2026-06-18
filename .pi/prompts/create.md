---
description: Create a specification with PRD, tasks, and workspace setup
argument-hint: "<description> [--lite] [--dry-run] [--help]"
---

# Create: $ARGUMENTS

Create a specification (PRD), set up workspace, and define executable tasks — ready for `/plan` or `/ship`.

> **Workflow:** `/init` → **`/create`** → `/plan` (optional) → `/ship`

## Parse Arguments

| Argument        | Default  | Description                               |
| --------------- | -------- | ----------------------------------------- |
| `<description>` | required | What to build/fix (quoted string)         |
| `--lite`        | false    | Force Lite PRD (skip auto-detection)      |
| `--dry-run`     | false    | Preview research depth and PRD format without writing |
| `--help`        | false    | Show this usage                           |

## Guard Phase

Before creating, verify:
- Check `.pi/artifacts/.active` for existing work in progress
- If active slug exists with a `spec.md`, ask user: continue with `/ship` or start new?
- Check `git status --porcelain` — if uncommitted changes, ask user to stash, commit, or continue
- Use `vcc_recall` to search session history for prior decisions on this topic — avoid repeating explored/rejected approaches

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `brainstorming` | Description is vague | Refine into concrete designs before spec |
| `spec-driven-development` | Always | Convert clarified idea into well-structured PRD |
| `context-engineering` | Deep or Standard research | Context budget management, selective loading for subagent handoffs |
| `doubt-driven-development` | Before saving PRD | Adversarial validation — challenge assumptions before committing |
| `grill-me` | Complex or cross-cutting | Adversarial interrogation of spec decisions |

## Phase 1: Choose Research Depth

Use the same Level 0-3 taxonomy as `/plan` so depth is consistent across commands.

Ask user before spawning agents:

| Level | Name | Description |
|-------|------|-------------|
| **0** | Skip | I know the codebase, use existing knowledge (no agents) |
| **1** | Quick | 1 agent: quick file scan (~30 sec) — single known library |
| **2** | Standard | 2-3 agents: patterns + tests (~1 min) — choosing between options |
| **3** | Deep | 3-5 agents: patterns, tests, deps, best practices (~2 min) — complex/cross-cutting |

Default: **Level 2** for new features, **Level 1** for bugfixes, **Level 0** when user says "I know the codebase".

## Phase 2: Gather Context

Based on the Level chosen in Phase 1, spawn agents using `subagent` tool:

**Level 3 (Deep):**
- 3x subagent with `explore` agent (patterns, tests, deps)
- 1x subagent with `scout` agent (external best practices)
- 1x subagent with `review` agent (epic review)

**Level 2 (Standard):**
- 2x subagent with `explore` agent (patterns, tests)
- 1x subagent with `scout` agent (external research)

**Level 1 (Quick):**
- 1x subagent with `explore` agent (patterns)

**Level 0 (Skip):** No agents — use existing knowledge.

## Phase 3: Initialize Workspace

Extract title from `$ARGUMENTS`. Derive a kebab-case slug:

```bash
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
mkdir -p ".pi/artifacts/$SLUG"
echo "$SLUG" > ".pi/artifacts/.active"
```

> **`.active` convention:** The active slug is written to `.pi/artifacts/.active`. All downstream commands (`/plan`, `/ship`, `/verify`) read this file to know which feature is current.

## Phase 4: Determine PRD Rigor

| Signal | Lite PRD | Full PRD |
|--------|----------|----------|
| Scope | Simple, single-concern | Cross-cutting, multi-system |
| Files affected | 1-3 | 4+ |
| Research depth | Level 0-1 | Level 2-3 |
| Logic complexity | Low (single behavior) | High (multi-step, stateful) |
| `--lite` flag | ✓ | — |

**Auto-detect:** If research was Level 0-1 AND description is a single sentence AND logic complexity is low → default to Lite. `--lite` flag overrides to Lite regardless. File count alone is not enough — a 3-file change with complex stateful logic is Full.

### Lite PRD Format

```markdown
# [Title]

## Problem
[1-2 sentences: what's wrong or what's needed]

## Solution
[1-2 sentences: what to do]

## Affected Files
- `src/path/to/file.ts`

## Tasks
- [ ] [Task description] → Verify: `[command]`

## Success Criteria
- Verify: `npm run typecheck && npm run lint`
- Verify: `[specific test or check]`
```

### Full PRD Format

Use the full template from `.pi/templates/prd.md`.

## Phase 5: Write & Validate PRD

Copy and fill the PRD template (lite or full) using context from Phase 2.

**Before saving, verify:**
- No placeholder text remains
- Success criteria include `Verify:` commands
- Technical context references actual `src/` paths
- Affected files list real paths
- Each task has verification
- No implementation code in the PRD
- No unresolved `[NEEDS CLARIFICATION]` markers

## Phase 6: Create Workspace Branch

```bash
git status --porcelain
git branch --show-current
```

Create feature branch and install deps if needed.

## Phase 7: Leave Task Decomposition to `/plan`

The PRD (Phase 5) contains a high-level **Tasks** outline ( Lite: checklist; Full: the template's Tasks section). Do **not** generate `tasks.json` here — task decomposition into the runtime `tasks.json` format is `/plan`'s job.

**Artifact chain (authoritative):**

```
/create  → .pi/artifacts/$SLUG/spec.md   (the PRD; high-level task outline only)
/plan    → .pi/artifacts/$SLUG/plan.md   (authoritative task decomposition)
         → .pi/artifacts/$SLUG/tasks.json (runtime, derived from plan.md)
/ship    → reads tasks.json (primary) or plan.md (fallback)
```

If the user skips `/plan` and goes straight to `/ship` for a Lite PRD, `/ship` derives `tasks.json` from the PRD's task outline on the fly.

## Failure Handling

| Scenario | Action |
|----------|--------|
| Active work already exists | Ask user: continue with `/ship` or start new? |
| Subagent research fails | Retry once with adjusted prompt, then proceed with existing knowledge |
| PRD validation fails | Fix issues inline, re-validate, max 2 retries |
| Missing template file | Report exact missing path, suggest running `/init` first |
| Uncommitted changes in workspace | Ask: stash, commit, or continue? |

## Stop Conditions

- Active slug exists with valid spec → ask: continue existing or start new?
- PRD has unresolved `[NEEDS CLARIFICATION]` markers → block, resolve first
- Verification fails 2x on same approach → stop, escalate

## Phase 8: Report

1. Summary: PRD type (Lite/Full), success criteria count, affected files count, task outline count
2. Branch name and workspace
3. Artifact location: `.pi/artifacts/$SLUG/spec.md`
4. Next step: `/plan` (complex — produces `plan.md` + `tasks.json`) or `/ship` (simple Lite — derives `tasks.json` on the fly)

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Research first | `/research`  |
| Plan execution | `/plan`      |
| Ship feature   | `/ship`      |
| Verify gates   | `/verify`    |

## Related Skills

- `spec-driven-development` — PRD structure and vocabulary concepts used in Phase 5
- `brainstorming` — idea refinement before spec writing
- `context-engineering` — subagent context budgets for Phase 2
- `doubt-driven-development` — adversarial validation in Phase 5
- `planning-and-task-breakdown` — task decomposition patterns (next step)
