# `.pi/` — Agent Rules (scoped)

**Purpose**: Context-specific rules for AI agents working **inside** the `.pi/` directory of this project.

You are reading this because you (the agent) are operating within `.pi/`. This file is **scoped**: it only auto-loads when your current work targets files under this directory.

For project-wide rules (kernel, drift signals, hard constraints, output style), also read `../../AGENTS.md` — both files load together when you're working inside `.pi/`.

---

## What This Directory Is

`.pi/` is the **curated kit deliverable** — a standalone `.pi/` scaffold installable into any repo. It is **not** your personal configuration. Treat it as the artifact being built/maintained, not a system you own.

### What lives here

| Subdir | Purpose | Treat as |
|--------|---------|----------|
| `agents/` | 6 agent personas (pi format) | Source of truth — don't modify casually |
| `skills/` | 59 skills (Agent Skills spec) | Tier-1 auto-load + Tier-2 on-demand |
| `prompts/` | slash commands | Dispatched by primary agent |
| `workflows/` | DAG workflows | Executed via subagent tool |
| `templates/` | project context templates | Referenced via auto-inject |
| `context/` | reference docs (architecture) | Manual reference only, never auto-injected |
| `extensions/` | TypeScript extensions | Compiled JS code, gated by pi extension SDK |

---

## When You Should Read This File

✅ **Auto-loaded** when you (the agent) are:
- Editing any file under `.pi/`
- Creating new files under `.pi/`
- Verifying format compliance of `.pi/` content

❌ **NOT auto-loaded** when:
- Working in project root (project rules live in `../../AGENTS.md`)
- Working in any other subdirectory of the project
- The user's request has nothing to do with `.pi/`

---

## Format Conventions

### 1. Idempotency

Kit edits must not duplicate or corrupt files. Before adding a file:

```bash
ls .pi/agents/<name>.md 2>/dev/null  # Check collision
head -5 .pi/agents/<name>.md          # Check existing frontmatter
```

### 2. Frontmatter Hygiene

YAML frontmatter is strict. Always quote values containing `:`, `#`, or special chars:

```yaml
---
name: my-skill
description: "Use when the request contains: colons, or: weird: punctuation"
---
```

Unquoted values with `:` cause "Nested mappings are not allowed in compact mappings" parse errors.

### 3. Skill Frontmatter — Minimal

Pi uses the Agent Skills spec — only 2 fields required:

```yaml
---
name: skill-name-kebab-case
description: "When to use this skill, max 1024 chars"
---
```

Do **not** add `version`, `tags`, `dependencies`, `agent_types`, or `tools`. Put that metadata in the body if needed.

### 4. Agent Frontmatter — Pi Format

Agents use `tools` and `model` fields. Do **not** add `mode`, `temperature`, or `permission.*` blocks — pi uses model defaults and `settings.json` for permissions.

### 5. Workflows — Preserve DAG Structure

DAG workflows in `.pi/workflows/` follow this schema:

```markdown
### Phase N: <name>
- **Agent:** @<agent-name>
- **Concurrency:** 1 | N | Dynamic (rule)
- **Depends on:** Phase M (optional)
- **Prompt:**
  ...
```

Sub-workflow composition (`**Workflow:** <name>`) is executed via recursive `run_workflow` tool calls. Pi's primary agent does this manually when reading the workflow.

### 6. Extensions — Use Pi SDK

All extensions in `.pi/extensions/*.ts` must use `@earendil-works/pi-coding-agent`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({ ... });
  pi.registerCommand({ ... });
  pi.on("event_name", async (event, ctx) => { ... });
}
```

---

## What You Must NOT Do

| Forbidden | Why |
|-----------|-----|
| Modify global `~/.pi/agent/AGENTS.md` | That's the user's personal config, not part of this kit |
| Add `permission.bash` blocks to agent frontmatter | Pi uses settings.json for permissions |
| Quote-skip in YAML when value has `:` | Causes parse errors |
| Add OAuth providers for Copilot/Codex | Already supported globally; no need to re-add here |
| Strip `.ts` from `.pi/extensions/` | Pi loads them via jiti at startup |
| Add net-new files for single-use cases | Violates smallest-working-change; extend existing files first |

---

## Verification Before Touching `.pi/`

```bash
# 1. List what's there
ls -la .pi/

# 2. Verify frontmatter on every YAML file
for f in $(find .pi -name "*.md"); do
  head -3 "$f" | head -1 | grep -q "^---$" || echo "Missing frontmatter: $f"
done

# 3. Validate YAML parses (requires yq or python)
python3 -c "
import yaml, glob, sys
for f in glob.glob('.pi/**/*.md', recursive=True):
    with open(f) as fh:
        content = fh.read()
    if content.startswith('---'):
        try:
            yaml.safe_load(content.split('---')[1])
        except yaml.YAMLError as e:
            print(f'{f}: {e}')
            sys.exit(1)
print('All YAML valid')
"

# 4. Verify extensions are syntactically valid TypeScript
npx tsc --noEmit .pi/extensions/*.ts 2>&1 | head -20
```

---

## Common Tasks

### Adding a new agent

1. Create `.pi/agents/<name>.md`
2. Use pi format frontmatter: `tools`, `model` (no `mode`/`temperature`/`permission`)
3. Describe persona, when to use, tools available
4. Update `.pi/agents/INDEX.md` if present
5. Verify with `head -8 .pi/agents/<name>.md`

### Adding a new prompt (slash command)

1. Create `.pi/prompts/<name>.md`
2. Include `description` and `argument-hint` frontmatter
3. Describe phases, load skills, dispatch via `subagent({ agent: "X" })`
4. Update `.pi/prompts/INDEX.md`

### Adding a new skill

1. Create `.pi/skills/<name>/SKILL.md`
2. Frontmatter: only `name` and `description` (quote if value has `:` or special chars)
3. Body: When to Use, Procedure, Pitfalls, Verification
4. Update `.pi/skills/INDEX.md`

### Adding a new extension

1. Create `.pi/extensions/<name>.ts`
2. Use `@earendil-works/pi-coding-agent` ExtensionAPI
3. Register in `.pi/settings.json` under `extensions` array
4. Run `/reload` in pi to verify load

---

## Skills to Load When Working in `.pi/`

These skills are most relevant when editing `.pi/` content:

| Situation | Load skill |
|-----------|------------|
| Editing content semantically | `behavioral-kernel` (clarify before committing) |
| Validating edge cases | `defense-in-depth` |
| Multi-file edit | `incremental-implementation` (thin slices) |
| Before claiming work done | `verification-before-completion` (MUST run verification) |
| Reformatting/cleanup | `code-cleanup` |
| Code review before merge | `code-review-and-quality` |
| Subagent usage in workflows | `subagent-driven-development` |
| Spec-driven work | `spec-driven-development` |

---

## Recovery — If You Make a Mistake

```bash
# Undo last edit
git checkout HEAD -- .pi/<file>

# See what you changed
git diff .pi/

# Restore entire .pi/ from a clean state
git restore .pi/

# If commit was made
git revert <commit-sha>
```

**Always read `.pi/` files before editing** — this directory is the project's deliverable, mistakes compound.