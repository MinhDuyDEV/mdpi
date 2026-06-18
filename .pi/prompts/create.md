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
- Use `vcc_recall` to search session history for prior decisions on this topic

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `brainstorming` | Description is vague | Refine into concrete designs before spec |
| `spec-driven-development` | Always | Convert clarified idea into well-structured PRD |
| `context-engineering` | Deep or Standard research | Context budget management, selective loading for subagent handoffs |
| `doubt-driven-development` | Before saving PRD | Adversarial validation — challenge assumptions before committing |
| `grill-me` | Complex or cross-cutting | Adversarial interrogation of spec decisions |

## Phase 1: Choose Research Depth

Ask user before spawning agents:

| Option | Description |
|--------|-------------|
| **Deep** (Recommended for complex work) | 3-5 agents: patterns, tests, deps, best practices (~2 min) |
| **Standard** | 2 agents: patterns + tests (~1 min) |
| **Minimal** | 1 agent: quick file scan (~30 sec) |
| **Skip** | I know the codebase, use existing knowledge |

## Phase 2: Gather Context

Based on research depth choice, spawn agents using `subagent` tool:

**Deep:**
- 3x subagent with `explore` agent (patterns, tests, deps)
- 1x subagent with `scout` agent (external best practices)
- 1x subagent with `review` agent (epic review)

**Standard:**
- 2x subagent with `explore` agent (patterns, tests)
- 1x subagent with `scout` agent (external research)

**Minimal:**
- 1x subagent with `explore` agent (patterns)

**Skip:** No agents — use existing knowledge.

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
| Research depth | Skip or Minimal | Standard or Deep |
| `--lite` flag | ✓ | — |

**Auto-detect:** If research was Skip/Minimal AND description is a single sentence → default to Lite. `--lite` flag overrides to Lite regardless.

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

## Phase 7: Convert PRD to Tasks

Convert PRD markdown → structured `tasks.json`:

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
      "tdd": false
    }
  ]
}
```

Write to `.pi/artifacts/$SLUG/tasks.json`.

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

1. Summary: task count, success criteria count, affected files count
2. Branch name and workspace
3. Artifact location: `.pi/artifacts/$SLUG/`
4. Next step: `/plan` (complex) or `/ship` (simple)

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
