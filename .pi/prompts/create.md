---
description: Create a specification with PRD, tasks, and workspace setup
argument-hint: "<description>"
---

# Create: $ARGUMENTS

Create a specification (PRD), set up workspace, and define executable tasks — ready for `/ship`.

> **Workflow:** **`/create`** → `/ship`

## Parse Arguments

| Argument        | Default       | Description                               |
| --------------- | ------------- | ----------------------------------------- |
| `<description>` | required      | What to build/fix (quoted string)         |

## Before You Create

- **Be certain**: Only create specs you're confident have clear scope
- **Don't over-spec**: If the description is vague, ask clarifying questions first
- **Check duplicates**: Always check for existing work
- **No implementation**: This command creates specs and workspace — don't write implementation code
- **Verify PRD**: Before saving, verify all sections are filled (no placeholders)
- **Flag uncertainty**: Use `[NEEDS CLARIFICATION]` markers for unknowns — never guess silently

## Load Skills

Before creating the spec, load these skills from `.pi/skills/`:

| Skill | Why |
|-------|-----|
| `brainstorming` | Refine vague descriptions into concrete designs before spec |
| `spec-driven-development` | Convert clarified idea into well-structured PRD |
| `grill-me` | Adversarial validation of spec decisions before committing |

## Available Tools

| Tool               | Use When                                              |
| ------------------ | ----------------------------------------------------- |
| `subagent`         | Delegate to `explore`, `scout`, `review`, `general` agents |
| `semantic_query`   | Find code patterns by natural language                |
| `semantic_grep`    | Search codebase by regex pattern                      |
| `semantic_inspect` | Inspect symbol definitions, callers, callees          |
| `semantic_show`    | Read source at path:line                              |
| `websearch`        | Search the web for external references                |
| `context7`         | Look up official library documentation                |
| `memory_search`    | Search durable project memory (decisions, patterns)   |
| `observation`      | Persist findings to long-term memory                  |

## Phase 1: Duplicate Check

### Session Memory Search

Use `vcc_recall` to search session history for prior decisions, similar work.

### Existing Work Check

Check `.pi/artifacts/.active` for existing work in progress. If active slug exists with a `spec.md`, ask user if they want to continue with `/ship` instead.

## Phase 2: Choose Research Depth

Ask user before spawning agents:

| Option | Description |
|--------|-------------|
| **Deep** (Recommended for complex work) | 3-5 agents: patterns, tests, deps, best practices (~2 min) |
| **Standard** | 2 agents: patterns + tests (~1 min) |
| **Minimal** | 1 agent: quick file scan (~30 sec) |
| **Skip** | I know the codebase, use existing knowledge |

## Phase 3: Gather Context

Based on research depth choice, spawn agents using `subagent` tool:

**If Deep:**
   - 3x subagent calls with `explore` agent (patterns, tests, deps)
   - 1x subagent call with `scout` agent (feature/epic)
   - 1x subagent call with `review` agent (epic)

**If Standard:**
   - 2x subagent calls with `explore` agent (patterns, tests)
   - 1x subagent call with `scout` agent (feature/epic only)

**If Minimal:**
   - 1x subagent call with `explore` agent (patterns)

**If Skip:**
- No agents, use existing AGENTS.md context

## Phase 4: Initialize Plan

Extract title and description from `$ARGUMENTS`. Derive a kebab-case slug:

```bash
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
mkdir -p ".pi/artifacts/$SLUG"
echo "$SLUG" > ".pi/artifacts/.active"
```

> **`.active` convention:** The active slug is written to `.pi/artifacts/.active`. All downstream commands (`/plan`, `/ship`, `/verify`) read this file to know which feature is current. If `.active` is missing or stale, the agent should ask the user to re-run `/create`.

## Phase 5: Determine PRD Rigor

| Signal | Lite PRD | Full PRD |
|--------|----------|----------|
| Scope | Simple, single-concern | Cross-cutting, multi-system |
| Files affected | 1-3 | 4+ |
| Research depth | Skip or Minimal | Standard or Deep |

**Auto-detect:** If research was Skip/Minimal AND description is a single sentence → default to Lite.

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

## Phase 6: Write PRD

Copy and fill the PRD template (lite or full) using context from Phase 3.

## Phase 7: Validate PRD

Before saving, verify:
- No placeholder text remains
- Success criteria include `Verify:` commands
- Technical context references actual `src/` paths
- Affected files list real paths
- Tasks have `[category]` headings
- Each task has verification
- No implementation code in the PRD
- No unresolved `[NEEDS CLARIFICATION]` markers

## Phase 8: Prepare Workspace

### Workspace Check

```bash
git status --porcelain
git branch --show-current
```

- If uncommitted changes: ask user to stash, commit, or continue

### Create Branch

Create feature branch and install deps if needed.

## Phase 9: Convert PRD to Tasks

Convert PRD markdown → executable JSON (`prd.json`).

## Failure Handling

| Scenario | Action |
|----------|--------|
| Active work already exists | Ask user: continue with `/ship` or start new? |
| Subagent research fails | Retry once with adjusted prompt, then proceed with existing knowledge |
| PRD validation fails | Fix issues inline, re-validate, max 2 retries |
| Missing template file | Report exact missing path, suggest running `/init` first |

## Stop Conditions

- Active slug exists with valid spec → ask: continue existing or start new?
- PRD has unresolved `[NEEDS CLARIFICATION]` markers → block, resolve first
- Uncommitted changes in workspace → ask: stash, commit, or continue?
- Verification fails 2x on same approach → stop, escalate

## Phase 10: Report

1. Summary: task count, success criteria count, affected files count
2. Branch name and workspace
3. Active feature: `.pi/artifacts/$(cat .pi/artifacts/.active)/`
4. Next step: `/ship` (or `/plan` for complex work)

## Related Commands

| Need               | Command      |
| ------------------ | ------------ |
| Research first     | `/research`  |
| Plan after spec    | `/plan`      |
| Implement and ship | `/ship`      |

## Related Skills

See `.pi/skills/INDEX.md` for the complete task → skill routing table.
