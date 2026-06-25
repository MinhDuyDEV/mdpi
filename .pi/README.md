# `.pi/` — Drop-in Kit for Pi Coding Agent

A self-contained `.pi/` directory that turns any repository into a pi-coding-agent workspace with structured agents, skills, slash commands, workflows, templates, and safety guards.

Optimized for the **"copy and use"** workflow: no global setup required.

---

## Quick Start

```bash
# 1. Copy kit into your repo
cp -r /path/to/template/.pi /path/to/your-repo/.pi

# 2. Edit project-level AGENTS.md (the one at repo root, NOT .pi/AGENTS.md)
# - Set project name, vision, conventions

# 3. Fill key templates
vim .pi/templates/tech-stack.md   # framework, deps, verification commands
vim .pi/templates/project.md      # project vision, success criteria
vim .pi/templates/user.md         # (optional) your preferences

# 4. Run pi
cd /path/to/your-repo
pi

# 5. Bootstrap project context
/init --all
```

---

## What's Inside

```
.pi/
├── AGENTS.md                       # Scoped rules (auto-loads when editing .pi/)
├── README.md                       # This file
├── VERSION                         # Kit version (0.2.0)
├── .env.example                    # Environment variables (none required)
├── guard.example.json              # pi-guard ruleset example
├── settings.json                   # 4 extensions + 67 skills + 12 prompts
│
├── agents/                         # 6 subagent personas
│   ├── INDEX.md                    # Agent index + routing table
│   ├── explore.md                  # Read-only codebase search
│   ├── general.md                  # Surgical implementation (1-3 files)
│   ├── plan.md                     # Architecture & decomposition
│   ├── review.md                   # Code review & debugging
│   ├── scout.md                    # External research
│   └── vision.md                   # UI/UX & accessibility
│
├── extensions/                     # 5 custom TypeScript extensions (in-house markdown memory)
│   ├── workflows-runner.ts         # DAG workflow executor
│   ├── templates-injector.ts       # Auto-inject project templates
│   ├── memory.ts                   # memory + memory_search + auto-inject + correction detection
│   ├── skill-manage.ts             # skill_manage (CRUD procedural skills)
│   └── session-search.ts           # session_search (grep JSONL sessions)
│
├── prompts/                        # 12 slash commands (pi-native)
│   ├── INDEX.md                    # Command index + lifecycle diagram
│   ├── init.md                     # Bootstrap project context
│   ├── create.md                   # Create spec + task outline
│   ├── plan.md                     # Detailed implementation plan + tasks.json
│   ├── ship.md                     # Execute tasks, verify, review, close
│   ├── verify.md                   # Verify implementation (canonical gate owner)
│   ├── fix.md                      # Debug + fix bug
│   ├── research.md                 # Research topic
│   ├── audit.md                    # Audit codebase pattern
│   ├── gc.md                       # Garbage collection
│   ├── status.md                   # Show active feature + blockers
│   └── close.md                    # Finalize feature, clear .active
│
├── workflows/                      # 6 DAG workflows
│   ├── INDEX.md                    # Workflow index + phase format
│   ├── audit-pattern.md
│   ├── batch-implement.md
│   ├── deep-research.md
│   ├── development-lifecycle-workflow.md
│   ├── garbage-collection.md
│   └── quality-loop.md
│
├── skills/                         # 67 skills (all shipped)
│   ├── INDEX.md                    # Task → skill routing
│   ├── behavioral-kernel/          # Tier 1
│   ├── defense-in-depth/           # Tier 1
│   ├── incremental-implementation/ # Tier 1
│   ├── verification-before-completion/  # Tier 1
│   ├── (63 Tier 2 skills — all loaded on-demand)
│
├── templates/                      # 12 project context templates
│   ├── prd.md, project.md, state.md, tech-stack.md
│   ├── tasks.md, roadmap.md, user.md, design.md
│   ├── proposal.md, adr.md
│   └── progress.md, review-state.json   # runtime artifact schemas
│
├── scripts/                        # 1 utility script
│   └── gc-check.sh                 # Structural invariants for /gc
│
├── context/                        # 1 reference doc
│   └── architecture.md             # Pi 5-layer architecture
│
├── state/                          # Runtime state (gitignored)
│   └── session-summary.{json,md}
│
├── memory/                         # Runtime LTM storage (gitignored)
│   └── observations.json
│
├── artifacts/                      # Task output + template examples
│   └── example/                    # 4 template examples (plan/progress/research/spec)
│
└── tasks/                          # Runtime task list (json)
```

---

## Slash commands

12 pi-native slash commands (full detail + lifecycle in [`prompts/INDEX.md`](./prompts/INDEX.md)):

| Command | Purpose |
|---------|---------|
| `/init` | Bootstrap project context (AGENTS.md + templates + user profile) |
| `/clarify` | Discuss + clarify + stress-test a vague idea into a hardened spec |
| `/create` | Create spec (PRD) + workspace + task outline |
| `/plan` | Detailed implementation plan + tasks.json |
| `/ship` | Execute tasks, verify, review, close |
| `/verify` | Check completeness/correctness against PRD |
| `/fix` | Debug + fix a bug or failing test |
| `/research` | Gather info before implementation |
| `/audit` | Find all occurrences of a pattern, review, remediate |
| `/gc` | Fallow analysis + quality grades + cleanup |
| `/status` | Show active feature, progress, blockers |
| `/close` | Finalize active feature, clear `.active` |

---

## Workflows

### Greenfield Project (no existing code)

```
/init --all
  → Detect: no existing code
  → Skill: behavioral-kernel
  → Create: AGENTS.md (root) + 5 templates
  → Output: .pi/templates/{project,tech-stack,roadmap,state,user}.md

/plan "First feature"
  → Skill: brainstorming (if ambiguous) + incremental-implementation
  → Output: .pi/artifacts/<slug>/plan.md

/ship
  → Workflow: batch-implement → audit-pattern → final synthesis
  → Skill: verification-before-completion gates
  → Output: implementation + verification log
```

### Brownfield Project (existing code)

```
/init --deep
  → Detect: existing code
  → Skill: code-review-and-quality (audit existing)
  → Improve: AGENTS.md + templates

/research "<topic>" | /audit "<pattern>"
  → Workflow: deep-research | audit-pattern
  → Skill: root-cause-tracing (if bug)

/plan → /ship
```

### Bug Fix

```
/fix "<bug description>"
  → Skill: root-cause-tracing + debugging-and-error-recovery
  → 4 phases: reproduce → isolate → fix → verify
  → Skill: verification-before-completion gate
  → Output: root cause + fix + verification
```

### Daily Work (no command)

The primary agent routes based on user input:

| User says | Routes to |
|-----------|-----------|
| "find X" / "where is X" | `explore` subagent + `pi-srcwalk` |
| "research X" / "best practice" | `scout` subagent + `pi-search` |
| "review this code" | `review` subagent |
| "implement X" (small) | `general` subagent |
| "implement X" (large) | `plan` subagent first, then `general` per task |
| "design X" / "UI review" | `vision` subagent |

---

## Architecture (5 Layers)

See `context/architecture.md` for full details.

```
┌────────────────────────────────────────────┐
│  1. Core  — pi-coding-agent (jiti + API)  │
├────────────────────────────────────────────┤
│  2. Settings — settings.json              │
├────────────────────────────────────────────┤
│  3. Skills + Prompts — declarative         │
├────────────────────────────────────────────┤
│  4. Agents — subagent personas             │
├────────────────────────────────────────────┤
│  5. Extensions — programmatic             │
└────────────────────────────────────────────┘
```

**Key rule:** Extensions must NOT import from other extensions. They communicate via lifecycle events.

---

## Subagent Routing (built-in)

| Intent | Subagent | Tools |
|--------|----------|-------|
| Find/locate code | `explore` | read, grep, find, ls, bash, semantic_* |
| Research external | `scout` | read, bash, find, ls, websearch, codesearch, context7, web_fetch |
| Review/debug | `review` | read, grep, find, ls, bash, semantic_* |
| Plan/architect | `plan` | read, bash, find, ls, semantic_*, websearch, codesearch, context7 |
| Visual/UI | `vision` | read, bash, find, ls |
| Implement (1-3 files) | `general` | full tool set |

---

## Extensions

This kit ships **6 custom TypeScript extensions** (in-house memory + context-optimizer) and **5 core external npm packages** (`@tintinweb/pi-subagents`, `@sting8k/pi-srcwalk`, `@sting8k/pi-vcc`, `pi-rtk-optimizer`, `@davecodes/pi-dcp`) + 1 optional (`pi-guard`). Long-term memory is **in-house** (`.pi/extensions/{memory,skill-manage,session-search}.ts`) — no external memory dependency, no native SQLite, no LLM subprocess. `npm:pi-hermes-memory` was **fully removed** (global + project) on 2026-06-25. See [## Memory](#memory) for architecture and [## Context Optimization](#context-optimization) for the rtk/dcp/vcc stack.

### Custom (6)

| Extension | Purpose | Status |
|-----------|---------|--------|
| `workflows-runner` | Parses DAG workflows from `.pi/workflows/*.md`, returns execution plan with `subagent()` calls | Production |
| `templates-injector` | Auto-injects `project.md`, `tech-stack.md`, `state.md` into system prompt | Production |
| `memory` | `memory`/`memory_search` (markdown `.pi/memory/*.md`, in-process TF-IDF) + `before_agent_start` auto-inject brief + deterministic correction detection + secret-scan + `/memory-insights` `/memory-consolidate` `/memory-import-hermes` commands | Production |
| `skill-manage` | `skill_manage` CRUD (project→`.pi/skills/`, global→`~/.pi/agent/skills/`) | Production |
| `session-search` | `session_search` over pi's JSONL session store (no SQLite) | Production |
| `context-optimizer` | Coordinator: patches vcc auto-compaction + verifies `rtk` + injects `<context-optimization>` policy every turn + `/context-check` (rtk/dcp/vcc stack) | Production |

### External packages

The kit depends on external npm packages, split into two sets:

- **Core** — declared in `.pi/settings.json:packages`, auto-loaded by pi at
  startup. Single source of truth = `settings.json`.
- **Optional** — declared in `.pi/packages.json`, recommended add-ons you opt
  into.

| Package | Set | Purpose | Why external |
|---------|-----|---------|--------------|
| `@tintinweb/pi-subagents` | core | Subagent dispatch (`subagent()` tool) | Battle-tested pi-native package |
| `@sting8k/pi-srcwalk` | core | `semantic_*` code navigation tools | Trigram-indexed search, deep |
| `@sting8k/pi-vcc` | core | Deterministic no-LLM compaction + `vcc_recall` lineage recall | Context-optimization stack — compaction layer |
| `pi-rtk-optimizer` | core | Tool-output compaction (bash/read/grep) + `rtk` command rewriting | Context-optimization stack — inflow layer (`rtk` binary optional) |
| `@davecodes/pi-dcp` | core | Dynamic context pruning (dedup, error purge, `compress`) | Context-optimization stack — in-flight layer |
| `pi-guard` | optional | Tool permission system (bash AST parser, path globs) | AST parser handles `\|`, `&&`, `xargs` — regex can't |

Install the full set with one command (idempotent, safe to re-run):

```bash
mdpi install            # core + optional
mdpi install --core     # only settings.json:packages
mdpi install --optional # only packages.json:optional
mdpi install --check    # dry-run: report installed/missing
```

`mdpi install` shells out to `pi install npm:<pkg>` for each declared package.
The pi-guard config example lives at `.pi/guard.example.json` — copy the `guard`
block into `.pi/settings.json` to enable its rules.

### Removed (intentionally)

| Extension | Reason | Replaced by |
|-----------|--------|-------------|
| `commands-dispatcher` | Pi's built-in prompt template loader already does this | pi core (no install needed) |
| `dcp-strategies` | Superseded by `@davecodes/pi-dcp` (active globally) | `mdpi install --optional` |
| `pi-guard` (local) | Superseded by `jdiamond/pi-guard` (proper AST parser) | `mdpi install --optional` |

---

## Skills (67 all shipped)

See `skills/INDEX.md` for the full task → skill routing table.

**Tier 1 (4 skills, always loaded):**
- `behavioral-kernel` — Re-center on core execution discipline
- `defense-in-depth` — Validate at multiple system layers
- `incremental-implementation` — Thin vertical slices with verify-after-each
- `verification-before-completion` — Evidence before claiming completion

**Tier 2 (63 skills, loaded on-demand):**

| Category | Skills |
|----------|--------|
| Process | `brainstorming`, `spec-driven-development`, `planning-and-task-breakdown`, `subagent-driven-development`, `documentation-and-adrs`, `code-review-and-quality`, `agent-code-quality-gate`, `development-lifecycle`, `deprecation-and-migration`, `grill-me`, `source-driven-development`, `writing-skills`, `code-cleanup` |
| Implementation | `test-driven-development`, `testing-anti-patterns`, `deep-module-design`, `api-and-interface-design` |
| Debug | `debugging-and-error-recovery`, `root-cause-tracing` |
| Git | `git-workflow-and-versioning`, `using-git-worktrees` |
| Frontend/UI | `frontend-design`, `design-taste-frontend`, `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, `react-best-practices`, `redesign-existing-projects`, `mockup-to-code`, `accessibility-audit`, `design-system-audit` |
| Platform | `cloudflare`, `vercel-deploy-claimable`, `supabase`, `supabase-postgres-best-practices`, `ci-cd-and-automation`, `shipping-and-launch`, `performance-optimization`, `security-and-hardening` |
| Mobile | `swift-concurrency`, `swiftui-expert-skill`, `core-data-expert` |
| Tools | `figma`, `jira`, `polar`, `resend`, `playwright`, `chrome-devtools`, `browser-testing-with-devtools`, `srcwalk`, `opensrc`, `pdf-extract`, `webclaw`, `gemini-large-context`, `fallow` |

All skills live directly in `.pi/skills/<name>/SKILL.md`. Pi auto-discovers them on startup. No manual installation needed.

---

## Customization

### Add a new subagent persona

```bash
cat > .pi/agents/my-agent.md << 'EOF'
---
name: my-agent
description: What this agent does
tools: read, bash, grep, find, ls
model: claude-sonnet-4-5
---

# My Agent

System prompt here.
EOF
```

### Add a new slash command

```bash
cat > .pi/prompts/my-cmd.md << 'EOF'
---
description: What this command does
argument-hint: "<args>"
---

Prompt body here. Use $1, $@, $ARGUMENTS for arg substitution.
EOF
```

### Add a new skill

```bash
mkdir -p .pi/skills/my-skill
cat > .pi/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: Use when... (be specific)
---

# My Skill

Body here.
EOF
```

Then `/reload` in pi.

### Add a new workflow

```bash
cat > .pi/workflows/my-workflow.md << 'EOF'
# my-workflow

Brief description.

## Args

- `arg1` (required) — description

## Phases

### Phase 1: discover
- **Agent:** explore
- **Concurrency:** 1

**Prompt:**

\`\`\`
The prompt for this phase.
\`\`\`

## Final Synthesis (Main Agent)

Synthesize outputs from {phase_1_output}.
EOF
```

Then `/reload` in pi.

---

## Memory

The kit's memory layer is **in-house** — `.pi/extensions/memory.ts` (+ `skill-manage.ts`, `session-search.ts`), backed by markdown files in `.pi/memory/`. **No external memory dependency, no native SQLite, no LLM subprocess.** This replaces the former `npm:pi-hermes-memory` adoption (commit `d160db3`, 2026-06-18), **fully removed (global + project + data dirs) on 2026-06-25** because of recurring `better-sqlite3` corruption (2026-06-20 / 2026-06-23 / 2026-06-25), LLM-subprocess cost on every background review/correction/consolidation, policy-only injection that missed memory when the agent "forgot" to search, and user-home storage that wasn't repo-portable. Design + history: `.pi/artifacts/memory-markdown/spec.md`.

The kit still follows Addy Osmani's 4 memory-type model (*Lesson 5: memory and context*):

| Type | Duration | Kit component |
|------|----------|---------------|
| Short-term | one session | context window + pi-vcc compaction |
| Episodic | across sessions (searchable) | `session-search.ts` → grep over pi's JSONL session store (`~/.pi/agent/sessions/`); `session_search` tool |
| Long-term | across sessions (retrieved on demand) | `memory.ts` → `.pi/memory/*.md` (markdown) + in-process TF-IDF; `memory` / `memory_search` tools |
| Procedural | permanent | Agent Skills `.pi/skills/*` (67 curated, shipped) + `skill-manage.ts` `skill_manage` (project→`.pi/skills/`, global→`~/.pi/agent/skills/`) |
| Declarative | varies (RAG) | `templates/` + `context/` + `semantic_*` / `websearch` / `context7` |

**The in-house memory layer provides:**

1. **Capture** — `memory` tool (add/replace/remove; targets `memory`/`user`/`project` for uncategorized facts, `failure` + `category` for the 6 categories) + **deterministic correction detection** (regex strong/weak/negative patterns, EN + VI; auto-saves a `correction` entry on user `message_end`, rate-limited 1 per 3 turns; **0 LLM subprocess**). Disable: `PI_MEMORY_NO_CORRECTION=1`.
2. **Retrieval** — `memory_search` (in-process TF-IDF over the markdown, filter by `target`/`category`; no SQLite) + `session_search` (grep over JSONL sessions, current project by default, `project` param for others).
3. **Injection** — **auto-inject, NOT policy-only**: `before_agent_start` builds a keyword-matched **memory brief** (~1.5k chars, relevance to the user's prompt) + a compact `<memory-policy>` block. Memory surfaces automatically; the agent still calls `memory_search` for deeper recall.
4. **Security** — **secret scanning** before every write (API keys / tokens / SSH keys / `ghp_` / `AKIA` / `sk-` / JWT); blocked + warned. Zero-dep regex.
5. **Consolidation** — `/memory-consolidate` command: deterministic dedupe of exact-duplicate entries + cap per file (archive oldest beyond 60 to `.pi/memory/archive/`). **No LLM merge.**
6. **Storage** — `.pi/memory/{USER,PROJECT,MEMORY,LESSONS}.md` (markdown, gitignored, repo-local, portable). Entry format: `<!-- mem:<id> cat:<category> ts:<ts> -->` + `### <title>` + narrative. Cross-project user facts → existing `~/.pi/agent/AGENTS.md` (pi auto-loads); no separate global memory store.
7. **Migration (one-time, completed 2026-06-25)** — `/memory-import-hermes` migrated hermes markdown into `.pi/memory/` (26 entries, prefixed `[hermes]`). The hermes data dirs are now deleted (backup at `~/pi-hermes-memory-backup-20260625.tar.gz`); the command is retained but finds no source post-removal.

**Memory vs RAG** — don't conflate:

- **Memory** (`memory` / `memory_search` / `session_search`): personal — this project, this agent, written during sessions.
- **RAG** (`semantic_*` / `websearch` / `codesearch` / `context7`): general knowledge, looked up on demand.

**Honest tradeoffs (in-house, 2026-06-24):**

- **Lexical retrieval** — TF-IDF + keyword match, no embeddings/synonymy ("deploy" ≈ "ship" still needs embeddings). Same gap as hermes; deferred.
- **Deterministic correction capture is coarse** — it saves the raw user correction text (not an LLM-distilled lesson), rate-limited. Review/prune via `/memory-consolidate` or `memory remove`. Some noise is the trade-off for 0 LLM cost.
- **Repo-local only** — memory is this-project-this-user (gitignored). Not shared across projects automatically; cross-project facts go in `~/.pi/agent/AGENTS.md`.
- **`skill_manage` project scope writes to `.pi/skills/`** — runtime-created skills are committed (ship with the kit). Curate/prune or gitignore if personal-only.
- **`session_search` is bounded** — recent ~40 JSONL files, current project by default. Not a full cross-project/cross-time index.

### Integration notes

- **`memory` tool targets** — `target: "failure"` + `category` holds the 6 categorized types (failure/correction/insight/preference/convention/tool-quirk); `target: "memory"`/`"user"`/`"project"` are uncategorized facts (category ignored). Same shape as the former hermes tool — existing prompt wiring (`init.md`/`close.md`/Guard phases) works unchanged.
- **`npm:pi-hermes-memory` fully removed** — was filtered per-project, then fully removed (global settings + project filter entry + uninstalled node_modules + deleted data dirs `~/.pi/agent/pi-hermes-memory` + `projects-memory`) on 2026-06-25. No hermes reference remains in the kit; the in-house extensions own all memory tools (no conflict). Data backed up to `~/pi-hermes-memory-backup-20260625.tar.gz`.
- **No background LLM loop** — there is no every-N-turns LLM review (the main cost source in hermes). Capture is manual (`memory`) + deterministic correction detection. Consolidation is a manual/on-threshold command, not an LLM subprocess.

## Context Optimization

The kit ships a 3-layer context-optimization stack (all **required** core packages) that auto-activates in **any** `.pi/` kit usage — not just workflow prompts. The three hook disjoint pi events (no conflict); each owns a stage:

| Layer | Package | Pi event | Role | Auto? |
|-------|---------|----------|------|-------|
| Inflow | `pi-rtk-optimizer` | `tool_call`/`tool_result` | auto-rewrite bash→`rtk` + compact tool output (ANSI/test/build/git/linter/search/truncate) | ✅ |
| In-flight | `@davecodes/pi-dcp` | `context` (every LLM call) | auto dedup + purge stale errors + apply compressions + nudge `compress` | ✅ |
| Compaction | `@sting8k/pi-vcc` | `session_before_compact` | deterministic no-LLM structured summary (35–99% reduction) + `vcc_recall` recover lineage | ✅ (via `overrideDefaultCompaction:true`) |

**Pipeline:** rtk shrinks inflow → dcp prunes in-flight + nudges compress → vcc handles compaction deterministically + recall.

**Auto-activation (normal usage):** the `context-optimizer` extension (`.pi/extensions/context-optimizer.ts`):
- On `session_start` in a `.pi/` kit: patches `~/.pi/agent/pi-vcc-config.json` `overrideDefaultCompaction:true` (idempotent — vcc has no `.pi/` project config) + verifies the `rtk` binary (warns if missing; output compaction still works).
- On every `before_agent_start`: injects a `<context-optimization>` policy block guiding `vcc_recall` (before re-exploring) / `compress` (closed work-streams) / `/pi-vcc` (manual compaction).

**Agent auto-use (no workflow prompt needed):**
- Before re-exploring a topic → `vcc_recall({query:"<topic>"})`.
- When a work-stream closes or dcp nudges → `compress({startToolCallId, endToolCallId, topic, summary})` (keep file:line + decisions + results in the summary).
- Manual compaction → `/pi-vcc` (deterministic, 0 LLM) over `/compact`.

**Config:**
- vcc: `~/.pi/agent/pi-vcc-config.json` `overrideDefaultCompaction:true` (auto-patched; global only).
- dcp: `~/.pi-dcp/config.json` (global) + `.pi/dcp.json` (project override, **shipped by the kit** with optimal defaults: auto strategies, turn protection 3, strong compress nudge at 30k–70k tokens).
- rtk: `~/.pi/agent/extensions/pi-rtk-optimizer/config.json` (global, **user-owned — not overwritten**); defaults optimal.

**Observability:** `/context-check` (kit) reports stack status; `/dcp context` + `/dcp stats`; `/rtk stats`; vcc toast per compaction.

See `.pi/skills/context-optimization/SKILL.md` for the full protocol.

---

## Troubleshooting

### Extensions don't load

```bash
# Check for syntax errors
pi --list-extensions

# Check pi-coding-agent version
pi --version
```

### Skill not found

```bash
ls .pi/skills/<name>/SKILL.md  # verify file exists
# Restart pi
```

### Workflow fails to parse

Check that phases follow the format:
- `### Phase <num>: <name>`
- `- **Agent:** <type>`
- `- **Concurrency:** <N>|Dynamic (rule)`
- `- **Depends on:** Phase <num>` (optional)
- `- **Tool:** \`subagent\` (single|parallel mode)` (optional)
- `**Prompt:**` followed by code block

---

## License

MIT. See parent project for license terms.
