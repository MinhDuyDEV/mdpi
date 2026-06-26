# Pi Kit Project Rules

**Purpose**: Behavioral rules and operational discipline for AI agents working in this project.

This project maintains a **curated `.pi/` kit** — a standalone scaffold of agents, prompts, skills, templates, workflows, and extensions installable into any repo.

---

## Scoped AGENTS.md

Pi auto-loads AGENTS.md from multiple locations:

| Location | Auto-loaded when... |
|----------|---------------------|
| `~/.pi/agent/AGENTS.md` | Always (your global config) |
| `AGENTS.md` (this file) | When working in this project |
| `.pi/AGENTS.md` | When working inside `.pi/` subdirectory |

When you operate inside `.pi/`, both this file AND `.pi/AGENTS.md` are loaded. The scoped file adds format conventions and operational discipline for editing `.pi/` content. Read both when editing `.pi/` content.

---

## Project Overview

The deliverable is a **curated `.pi/` kit**, not the agent's own runtime config. Contents:

- **`.pi/agents/`** — 10 agent personas (explore, general, plan, review, scout, vision + code-reviewer, test-engineer, security-auditor, web-performance-auditor)
- **`.pi/skills/`** — 86 skills (4 Tier-1 auto-loaded + 82 Tier-2 on-demand)
- **`.pi/prompts/`** — slash commands (init, clarify, create, plan, fix, verify, ship, audit, research, gc, status, close)
- **`.pi/workflows/`** — DAG workflows (audit-pattern, batch-implement, deep-research, development-lifecycle-workflow, frontend-feature-workflow, garbage-collection, quality-loop)
- **`.pi/templates/`** — project context templates (prd, project, state, tech-stack, roadmap, etc.)
- **`.pi/context/`** — reference docs (architecture + 7 adapted addyosmani checklists: definition-of-done, testing-patterns, security/performance/accessibility/observability-checklist, orchestration-patterns)
- **`.pi/extensions/`** — TypeScript extensions (workflows-runner, templates-injector, memory, skill-manage, session-search, context-optimizer); in-house markdown long-term memory (no external dep, no SQLite, no LLM subprocess) — see `.pi/README.md` ## Memory

Treat `.pi/` content as the **deliverable**. Don't modify it unless the user explicitly requests changes.

---

## Behavioral Kernel

_Core behavioral kernel (rules 1–4, Drift Signals, Recovery Move) lives in `~/.pi/agent/AGENTS.md` and is auto-loaded alongside this file. Only project-specific additions are repeated here._

5. **Mode discipline** — read `MODE:` from the auto-injected `state.md` before any non-trivial change.
   - **Greenfield:** no deployed consumers — skip backwards-compat layers, version prefixes, and legacy handlers on day one.
   - **Brownfield:** deployed consumers exist — run `semantic_inspect` callers/callees before any rename/delete to prove unreferenced; conform to existing code conventions, do not import training-distribution style ("works but doesn't fit").
   - **Mixed:** state the mode per-task in the first sentence.

---

## Conventions

### Idempotency

Kit operations should be **idempotent** — re-running should not duplicate or corrupt content. Always check before adding new files.

### Skills Protocol

This project uses **Tier 1 inline** + **Tier 2 on-demand** skill loading.

**Tier 1 (auto-loaded by extension discovery):**
- behavioral-kernel
- defense-in-depth
- incremental-implementation
- verification-before-completion

**Tier 2 (load on-demand via `/skill:<name>` or context-aware discovery):**
- 82 domain-specific skills (frontend-design, react-best-practices, test-driven-development, etc.)

---

## Verification & Tool Discipline

- **Fresh evidence always** — no success claims without running verification
- **2-failure rule** — if verification fails twice on the same approach, stop and escalate
- **Auto-detect** — check for existing `.pi/` content before adding new files

Before adding files:

```bash
ls .pi/                          # verify no collision
head -5 .pi/agents/<name>.md     # verify frontmatter format
npx tsc --noEmit .pi/extensions/*.ts  # verify extensions compile (when TypeScript available)
```

### Pi Tools Reference

| Tool | Purpose |
|------|---------|
| `semantic_query` | NL → ranked code evidence |
| `semantic_inspect` | Symbol context + callers + callees |
| `semantic_grep` | Trigram-indexed text/regex |
| `semantic_show` | Path:line → surrounding source |
| `semantic_review` | Diff review with srcwalk evidence |
| `websearch` / `codesearch` / `context7` / `web_fetch` | External research |
| `subagent` | Single/parallel/chain subagent delegation |
| `vcc_recall` | Session history search |
| `memory` / `memory_search` / `session_search` / `skill_manage` | Long-term memory + session search + procedural skills |

### Context Optimization (auto-active 3-layer stack)

Context is kept lean automatically by `rtk` (tool-output compaction) → `dcp` (in-flight dedup/purge + compress nudge) → `vcc` (deterministic compaction + `vcc_recall`). The `context-optimizer` extension patches vcc auto-compaction + injects the policy every turn — so this works in **normal usage**, not just workflow prompts. Auto-use: `vcc_recall` before re-exploring a topic; `compress` closed work-streams when dcp nudges (keep file:line + decisions + results in the summary); `/pi-vcc` for manual compaction. See `.pi/skills/context-optimization/SKILL.md`. `/context-check` reports status.

---

## Hard Constraints (Never Violate)

| Constraint | Rule |
|------------|------|
| **Security** | Never expose or invent credentials |
| **Git Safety** | Never force push main/master; never bypass hooks |
| **Git Restore** | Never run `reset --hard`, `checkout .`, `clean -fd` without explicit user request |
| **Honesty** | Never fabricate tool output; never guess URLs; label inferences |
| **Idempotency** | Re-running kit operations should not duplicate or corrupt files |
| **Surgical Scope** | Add only what the request requires; don't invent features for single use cases |

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
- When reviewing kit output: verify format matches pi conventions, not just content

---

## See Also

- **`.pi/AGENTS.md`** — scoped rules for working inside `.pi/` (format conventions, operational discipline, recovery)
- **`.pi/README.md`** — directory structure overview, format conventions, how to use the kit

_Complexity is the enemy. Minimize moving parts._