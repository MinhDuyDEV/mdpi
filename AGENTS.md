# Ockit-Mapping — Pi Project Rules

**Purpose**: Behavioral rules and operational discipline for AI agents working in this project.

This project is the **mapping of OpenCodeKit → Pi** for project-local `.pi/` configuration.

---

## Scoped AGENTS.md

Pi auto-loads AGENTS.md from multiple locations:

| Location | Auto-loaded when... |
|----------|---------------------|
| `~/.pi/agent/AGENTS.md` | Always (your global config) |
| `AGENTS.md` (this file) | When working in this project |
| `.pi/AGENTS.md` | When working inside `.pi/` subdirectory |

When you operate inside `.pi/`, both this file AND `.pi/AGENTS.md` are loaded. The scoped file adds mapping-specific rules (format conversions, idempotency, what-not-to-do). Read both when editing `.pi/` content.

---

## Project Overview

This is a **mapping/porting project**, NOT a typical coding project. The contents:

- **`.pi/agents/`** — 7 agent personas (build, explore, general, plan, review, scout, vision)
- **`.pi/skills/`** — 59 skills (4 Tier-1 + 55 Tier-2), adapted from opencodekit
- **`.pi/prompts/`** — 9 slash commands (init, fix, verify, ship, audit, research, gc, create, plan)
- **`.pi/workflows/`** — 5 DAG workflows (audit-pattern, batch-implement, deep-research, garbage-collection, development-lifecycle)
- **`.pi/templates/`** — 10 project context templates (prd, project, state, tech-stack, etc.)
- **`.pi/context/`** — 2 reference docs (architecture, fallow)
- **`.pi/extensions/`** — 2 TypeScript extensions (workflows-runner, templates-injector); long-term memory via external `npm:pi-hermes-memory`

When working in this project, agents should treat `.pi/` content as the **deliverable**, not as their own configuration. Don't modify `.pi/` files unless the user explicitly requests porting changes.

---

## Behavioral Kernel

1. **Clarify before committing** — surface assumptions or ask instead of silently choosing
2. **Choose the smallest working change** — solve today's problem directly before inventing flexibility
3. **Keep diffs surgical** — change only what the request requires; log unrelated issues
4. **Define proof before acting** — for non-trivial work, name the success check before implementation

## Drift Signals — STOP and reload

- Adding abstraction for a single use case
- Changing adjacent code "while you're here"
- Postponing verification until the end
- Claiming completion without a named proof path
- Silently picking one interpretation from multiple valid readings

## Recovery Move

1. Re-state the request in one sentence
2. Re-state the smallest working change
3. Re-state the proof path
4. Delete or avoid anything outside that boundary

---

## Project-Specific Conventions

### File Format Mapping

| OpenCodeKit (source) | Pi (target) | Notes |
|----------------------|-------------|-------|
| `AGENTS.md` (200 lines, behavioral) | `AGENTS.md` (project rules) | Different purpose; OpenCodeKit's AGENTS.md is the canonical version |
| `agent/*.md` (with `mode`, `temperature`, `permission`) | `agents/*.md` (with `tools`, `model`) | Format differs; pi uses simpler YAML |
| `command/*.md` (with `agent` field) | `prompts/*.md` (no agent field) | Pi dispatches via prompt templates + subagent tool |
| `workflows/*.md` (DAG with phases) | `workflows/*.md` (DAG with phases) | Same format, but execution via subagent tool not native |
| `skill/<name>/SKILL.md` (with `version`, `tags`, `dependencies`, `agent_types`, `tools`) | `skills/<name>/SKILL.md` (only `name`, `description`) | Pi uses simpler frontmatter (Agent Skills spec) |
| `templates/*.md` (project context) | `templates/*.md` (same) | Direct copy |
| `plugin/*.ts` (OpenCode plugin SDK) | `extensions/*.ts` (Pi extension SDK) | Different SDKs; pi uses `@earendil-works/pi-coding-agent` |
| `dcp.jsonc` + `dcp-prompts/` | N/A | Pi uses `@sting8k/pi-vcc` (different paradigm) |
| `memory` plugin (4-tier LTM) | `npm:pi-hermes-memory` (markdown + SQLite FTS5, learning loop, secret scan, two-tier) | External package — replaces former in-house `pi-memory` |

### Mapping Rules

When porting opencodekit content to `.pi/`:

1. **Agents**: Strip `mode`, `temperature`, `permission` from frontmatter. Add `tools` and `model` per pi format. Replace `srcwalk` with `semantic_query/inspect/grep/show`, replace `webclaw` with `websearch/codesearch/context7`, replace `task()` with `subagent`.

2. **Commands**: Strip `agent:` field. The pi primary agent dispatches via `subagent` tool based on command context, not static routing. Replace `skill()` calls with skill load instructions (pi auto-loads via SKILL.md frontmatter).

3. **Workflows**: Keep DAG structure (`Phases`, `Agent`, `Concurrency`, `Depends on`, `Prompt`). Mark sub-workflow composition (`**Workflow:** <name>`) — execute via recursive `run_workflow` tool.

4. **Skills**: Keep only `name` + `description` frontmatter (Pi uses Agent Skills spec). Convert other metadata into the skill body if needed.

5. **Templates**: Direct copy (markdown thuần).

6. **Extensions**: Reimplement using `@earendil-works/pi-coding-agent` ExtensionAPI. Use `registerTool`, `registerCommand`, lifecycle events.

### Idempotency

Mapping operations should be **idempotent** — re-running should not duplicate content. Always check before adding new files.

---

## Verification & Tool Discipline

- **Fresh evidence always** — no success claims without running verification
- **2-failure rule** — if verification fails twice on the same approach, stop and escalate
- **Auto-detect** — check for existing `.pi/` content before porting

### For this mapping project specifically:

- Run `ls .pi/` before adding new files to verify no collision
- Run `head -5 .pi/agents/<name>.md` to verify frontmatter format
- Run `npx tsc --noEmit .pi/extensions/*.ts` to verify extensions compile (when TypeScript is available)

---

## Skills Protocol

This project uses **Tier 1 inline** + **Tier 2 on-demand** skill loading.

**Tier 1 (auto-loaded by extension discovery):**
- behavioral-kernel
- defense-in-depth
- incremental-implementation
- verification-before-completion

**Tier 2 (load on-demand via `/skill:<name>` or context-aware discovery):**
- 55 domain-specific skills (frontend-design, react-best-practices, test-driven-development, etc.)

When porting opencodekit content, load skills as needed:
- Porting `command/init.md` → load `brainstorming` skill for design questions
- Porting `command/fix.md` → load `root-cause-tracing` skill
- Porting any work that touches code → load `verification-before-completion` skill

---

## Pi Tools Reference

When working in this project, agents have access to:

| Tool | Purpose | Replaces (opencodekit) |
|------|---------|------------------------|
| `semantic_query` | NL → ranked code evidence | `srcwalk find` |
| `semantic_inspect` | Symbol context + callers + callees | `srcwalk_read` + `srcwalk_callers` |
| `semantic_grep` | Trigram-indexed text/regex | `grep` |
| `semantic_show` | Path:line → surrounding source | `read` |
| `semantic_review` | Diff review with srcwalk evidence | N/A |
| `websearch` / `codesearch` / `context7` / `web_fetch` / `grepsearch` | External research | `webclaw`, `context7`, `grepsearch`, `codesearch` |
| `subagent` | Single/parallel/chain subagent delegation | `task()` |
| `vcc_recall` | Session history search | `vcc_recall` |
| `memory` / `memory_search` / `session_search` / `skill_manage` | Long-term memory + session search + procedural skills | `observation` / `memory-search` / `memory-admin` (pi-hermes-memory) |

---

## Hard Constraints (Never Violate)

| Constraint | Rule |
|------------|------|
| **Security** | Never expose or invent credentials |
| **Git Safety** | Never force push main/master; never bypass hooks |
| **Git Restore** | Never run `reset --hard`, `checkout .`, `clean -fd` without explicit user request |
| **Honesty** | Never fabricate tool output; never guess URLs; label inferences |
| **Mapping Integrity** | When porting opencodekit content, preserve semantic meaning — don't add features |
| **Idempotency** | Re-running port operations should not duplicate or corrupt files |

---

## Multi-Agent Safety

- **Scope commits to your changes only** — never use `git add .`, stage specific files
- **No speculative cleanup** — don't reformat or refactor files you didn't change
- **Parallelize independent work** — multiple agents can work on different `.pi/` subdirs in parallel

---

## Output Style

- Be concise and direct. Cite concrete file paths and line numbers.
- **No cheerleading** — no filler, no artificial reassurance
- **Never narrate abstractly** — explain what you're doing, not that you're "going to look into it"
- When reviewing mapping output: verify format matches pi conventions, not just content

---

## See Also

- **`.pi/AGENTS.md`** — scoped rules for working inside `.pi/` (format conversions, mapping discipline, recovery)
- **`.pi/README.md`** — directory structure overview, format mapping tables, how to use the mapped setup
- **`/tmp/opencodekit-template/.opencode/`** — source content being mapped (reference only, do not modify)

_Complexity is the enemy. Minimize moving parts._
