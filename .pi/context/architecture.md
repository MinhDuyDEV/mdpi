---
purpose: Layered architecture and dependency rules for the .pi/ drop-in kit
updated: 2026-06-17
---

# Architecture & Dependency Rules

## Pi Coding Agent — 5 Layers

The `.pi/` drop-in kit for pi-coding-agent follows a layered architecture. Each layer can only depend on layers below it.

```
┌────────────────────────────────────────────┐
│  1. Core                                   │  pi-coding-agent (jiti + ExtensionAPI)
├────────────────────────────────────────────┤
│  2. Settings                               │  settings.json — JSON config
│     (packages, extensions, skills, prompts)│  merge with ~/.pi/agent/settings.json
├────────────────────────────────────────────┤
│  3. Skills + Prompts                       │  .pi/skills/<name>/SKILL.md
│     (declarative, loaded on-demand)        │  .pi/prompts/*.md (non-recursive)
├────────────────────────────────────────────┤
│  4. Agents                                 │  .pi/agents/*.md
│     (custom subagent personas)             │  loaded by pi-subagents extension
├────────────────────────────────────────────┤
│  5. Extensions                             │  .pi/extensions/*.ts
│     (programmatic, jiti-loaded)            │  use ExtensionAPI (registerTool, on, etc.)
└────────────────────────────────────────────┘
```

## Layer Details

### Layer 1: Core (`pi-coding-agent`)

The core runtime. Provides:
- `ExtensionAPI` interface
- Lifecycle events (`session_start`, `tool_call`, `before_agent_start`, `context`, etc.)
- Jiti-based TypeScript loader
- Built-in tools (`read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`)

Cannot depend on user code. Distributed as `@earendil-works/pi-coding-agent` npm package.

### Layer 2: Settings (`settings.json`)

JSON configuration that controls which extensions, skills, prompts are loaded. Merges with global `~/.pi/agent/settings.json` (project overrides global).

```json
{
  "extensions": ["./extensions/*.ts"],
  "skills": ["./skills"],
  "prompts": ["./prompts"],
  "packages": ["npm:@tintinweb/pi-subagents", "npm:@sting8k/pi-srcwalk"],
  "enableSkillCommands": true
}
```

### Layer 3: Skills + Prompts (declarative)

**Skills** (`.pi/skills/<name>/SKILL.md`):
- Agent Skills spec frontmatter: `name`, `description` (required), others optional
- Loaded into system prompt at startup
- Agent can `read` full SKILL.md on-demand via `/skill:name` command
- Tier 1 (5 skills): always loaded, core execution discipline
- Tier 2 (12 skills): loaded on-demand when relevant

**Prompts** (`.pi/prompts/*.md`):
- Non-recursive — only root `*.md` files
- Filename = command name (`/init`, `/fix`, etc.)
- Frontmatter: `description`, `argument-hint` (optional)
- Body supports `$1`, `$2`, `$@`, `$ARGUMENTS` for argument substitution

### Layer 4: Agents (custom subagents)

`.pi/agents/*.md`:
- Loaded by `@tintinweb/pi-subagents` extension (auto-installed via `packages` field)
- Frontmatter: `name`, `description`, `tools` (CSV), `disallowed_tools`, `model`, `thinking`, `prompt_mode`, etc.
- Project-level agents override global `~/.pi/agent/agents/*.md` with same name
- Body = system prompt for that subagent

Built-in agent types: `general`, `explore`, `plan`, `review`, `scout`, `vision`.

### Layer 5: Extensions (programmatic)

`.pi/extensions/*.ts` (or `<name>/index.ts`):
- TypeScript modules using `ExtensionAPI`
- Loaded via jiti (no compile step)
- Can register tools, commands, hooks, providers, shortcuts, flags
- Project-local extensions require project to be trusted

## Dependency Rules

| Layer | Can Import From | Cannot Import From |
|---|---|---|
| 1. Core | (external: `node:*`, `@earendil-works/*`) | Layer 2-5 |
| 2. Settings | (JSON only — no imports) | — |
| 3. Skills/Prompts | (markdown only — no imports) | — |
| 4. Agents | (markdown only — no imports) | — |
| 5. Extensions | Core (`ExtensionAPI`, event types) | Other extensions (use events or pi-state instead) |

**Critical rule:** Extensions must NOT import from other extensions. They communicate via:
- Lifecycle events (`pi.on("event", ...)`)
- Session state (`ctx.sessionManager.appendEntry(...)`)
- Shared state via `pi.appendEntry(...)`

## File Boundaries (recommended)

| Layer | Recommended max lines | Why |
|---|---|---|
| Extension (single file) | 300 | Testable, debuggable |
| Extension (with helpers) | 500 total | Split if exceeded |
| Skill (SKILL.md body) | 200 | Loaded on-demand, keep focused |
| Prompt (body) | 500 | Long prompts waste context |
| Agent (body) | 400 | Subagent system prompt |
| Template | 200 | Reference doc, not active context |

## Resource Discovery Paths (project-local)

| Resource | Path | Pattern | Notes |
|----------|------|---------|-------|
| Settings | `.pi/settings.json` | single file | merge with global |
| Extensions | `.pi/extensions/*.ts` or `*/index.ts` | jiti auto-discover | require trust |
| Skills | `.pi/skills/<name>/SKILL.md` | recursive on directories, also root `.md` | Agent Skills spec |
| Prompts | `.pi/prompts/*.md` | non-recursive root only | filename = command |
| Agents | `.pi/agents/*.md` | root only (loaded by pi-subagents) | frontmatter schema |

## Comparison to OpenCodeKit

OpenCodeKit's 6 layers (Instructions / Commands / Workflows / Plugins / Tools / SDK) don't map 1:1 to pi:

| OpenCodeKit concept | Pi equivalent | Notes |
|---|---|---|
| Instructions (AGENTS.md, skills) | Skills + Prompts (Layer 3) | Both declarative |
| Commands (slash) | Prompts (Layer 3) | Pi-native pattern |
| Workflows (DAG) | Skills (`subagent-driven-development`) or `.pi/workflows/*.md` (custom) | Pi has no native DAG, use `workflows-runner` extension |
| Plugins (TS runtime) | Extensions (Layer 5) | Same concept, different SDK |
| Tools (agent-callable) | Built-in tools + `registerTool` in extensions | Same concept |
| SDK (shared types) | `ExtensionAPI` types from `@earendil-works/pi-coding-agent` | External npm package |

## Principles

### Extension Isolation
Each extension is independent. Extensions communicate via lifecycle events, not direct imports. This prevents circular dependencies and keeps the runtime predictable.

### No Cross-Extension State
Don't import other extensions' modules. Use `pi.appendEntry()` for persistent state shared across extensions.

### Minimal Surface Area
Keep `ExtensionAPI` usage small and stable. New features should follow existing patterns (events, registerTool, etc.).

### File Boundaries
- Extension files: 300-500 lines max
- Skill bodies: 100-200 lines
- Prompt bodies: 200-500 lines
- Agent bodies: 200-400 lines
- Templates: 100-200 lines
