# `.pi/` — Agent Rules (scoped)

**Purpose**: Context-specific rules for AI agents working **inside** the `.pi/` directory of this project.

You are reading this because you (the agent) are operating within `.pi/`. This file is **scoped**: it only auto-loads when your current work targets files under this directory.

For project-wide rules (kernel, drift signals, hard constraints, output style), also read `../../AGENTS.md` — both files load together when you're working inside `.pi/`.

---

## What This Directory Is

`.pi/` is the **mapped deliverable** of OpenCodeKit → Pi coding agent format. It is **not** your personal configuration. Treat it as the artifact being built, not a system you own.

### What lives here

| Subdir | Purpose | Treat as |
|--------|---------|----------|
| `agents/` | 7 agent personas (pi format) | Source of truth — don't modify casually |
| `skills/` | 59 skills (Agent Skills spec) | Content ported from opencodekit |
| `prompts/` | 9 slash commands | Content ported, dispatched by primary agent |
| `workflows/` | 5 DAG workflows | Content ported, executed via subagent tool |
| `templates/` | 10 project context templates | Direct copies, referenced via auto-inject |
| `context/` | 2 reference docs (architecture, fallow) | Manual reference only, never auto-injected |
| `extensions/` | 4 TypeScript extensions | Compiled JS code, gated by pi extension SDK |

---

## When You Should Read This File

✅ **Auto-loaded** when you (the agent) are:
- Editing any file under `.pi/`
- Creating new files under `.pi/`
- Mapping new opencodekit content into `.pi/`
- Verifying format compliance of `.pi/` content

❌ **NOT auto-loaded** when:
- Working in `ockit-mapping/` root (project rules live in `../../AGENTS.md`)
- Working in any other subdirectory of the project
- The user's request has nothing to do with `.pi/`

---

## Mapping Discipline (Critical)

When porting opencodekit content, follow these rules:

### 1. Idempotency

Re-running port operations must not duplicate or corrupt files.

Before adding a file:

```bash
ls .pi/agents/<name>.md 2>/dev/null  # Check collision
head -5 .pi/agents/<name>.md          # Check existing frontmatter
```

### 2. Format Conversion Rules

| Source (opencodekit) | Target (pi) |
|----------------------|-------------|
| `mode: primary\|subagent` | Remove (pi primary agent dispatches dynamically) |
| `temperature: 0.1` | Remove (pi uses model defaults) |
| `permission.bash.*` | Remove (pi uses settings.json permissions) |
| `permission.write\|edit` paths | Remove (pi uses default tool permissions) |
| `tools:` in skill frontmatter | Remove (pi infers tool usage) |
| `agent: <name>` in command | Remove (dispatched via subagent tool) |
| `version:`, `tags:`, `dependencies:` | Strip to `name` + `description` only |
| `webclaw` | Replace with `websearch` / `codesearch` / `web_fetch` |
| `srcwalk` CLI | Replace with `semantic_query` / `semantic_inspect` / `semantic_grep` / `semantic_show` |
| `task({ subagent_type })` | Replace with `subagent({ agent })` |
| `observation()` / `memory-search()` | Replace with `observation` / `memory_search` tools (pi-memory extension) |
| `compress` (DCP) | Remove (pi-vcc handles compaction at end-of-task) |
| `fallow` references | Keep as-is (CLI tool, language-agnostic) |

### 3. Frontmatter Hygiene

YAML frontmatter is strict. Always quote values containing `:`, `#`, or special chars:

```yaml
---
name: my-skill
description: "Use when the request contains: colons, or: weird: punctuation"
---
```

Unquoted values with `:` cause "Nested mappings are not allowed in compact mappings" parse errors.

### 4. Skill Frontmatter — Minimal

Pi uses the Agent Skills spec — only 2 fields required:

```yaml
---
name: skill-name-kebab-case
description: "When to use this skill, max 1024 chars"
---
```

Do **not** add `version`, `tags`, `dependencies`, `agent_types`, or `tools`. Migrate that metadata into the body if needed.

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

Do **not** use opencodekit's `@opencode-ai/plugin` SDK — different API surface.

---

## What You Must NOT Do

| Forbidden | Why |
|-----------|-----|
| Modify global `~/.pi/agent/AGENTS.md` | That's the user's personal config, not part of this mapping |
| Add `webclaw` / `srcwalk` / `task()` to `.pi/` content | Pi has stricter-superset replacements already |
| Add DCP-style mid-session compression | Pi-vcc handles end-of-task compaction; DCP paradigm not ported |
| Add `permission.bash` blocks to agent frontmatter | Pi uses settings.json for permissions |
| Quote-skip in YAML when value has `:` | Causes parse errors |
| Reimplement opencodekit's `srcwalk` Rust binary | `pi-srcwalk` is already a superset |
| Add OAuth providers for Copilot/Codex | Already supported globally; no need to re-add here |
| Strip `.ts` from `.pi/extensions/` | Pi loads them via jiti at startup |

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

### Porting a new opencodekit agent

1. Read source: `cat /tmp/opencodekit-template/.opencode/agent/<name>.md`
2. Strip `mode`, `temperature`, `permission.*` from frontmatter
3. Add `tools:` and `model:` per pi conventions
4. Replace tool references per Format Conversion Rules table
5. Write to `.pi/agents/<name>.md`
6. Verify with `head -8 .pi/agents/<name>.md`

### Porting a new opencodekit command

1. Read source: `cat /tmp/opencodekit-template/.opencode/command/<name>.md`
2. Strip `agent:` field (pi dispatches dynamically)
3. Keep `description` and `argument-hint`
4. Replace `skill({ name: "X" })` with descriptive instruction (pi auto-loads skills)
5. Replace `task({ subagent_type: "X" })` with `subagent({ agent: "X" })`
6. Write to `.pi/prompts/<name>.md`

### Porting a new opencodekit skill

1. Read source: `cat /tmp/opencodekit-template/.opencode/skill/<name>/SKILL.md`
2. Strip everything except `name` and `description` from frontmatter
3. If value contains `:` or special chars, wrap in double quotes
4. Copy references/, rules/, scripts/ subdirs as-is
5. Write to `.pi/skills/<name>/SKILL.md`

### Adding a new extension

1. Create `.pi/extensions/<name>.ts`
2. Use `@earendil-works/pi-coding-agent` ExtensionAPI
3. Register in `.pi/settings.json` under `extensions` array
4. Run `/reload` in pi to verify load

---

## Skills to Load When Working in `.pi/`

These skills are most relevant when porting/editing `.pi/` content:

| Situation | Load skill |
|-----------|------------|
| Mapping content semantically | `behavioral-kernel` (clarify before committing) |
| Validating edge cases | `defense-in-depth` |
| Multi-file port | `incremental-implementation` (thin slices) |
| Before claiming port is done | `verification-before-completion` (MUST run verification) |
| Reformatting/cleanup | `code-cleanup` |
| Code review before merge | `code-review-and-quality` |
| Subagent usage in workflows | `subagent-driven-development` |
| Spec-driven port | `spec-driven-development` |

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
