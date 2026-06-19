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
├── settings.json                   # 4 extensions + 67 skills + 11 prompts
│
├── agents/                         # 7 subagent personas
│   ├── INDEX.md                    # Agent index + routing table
│   ├── build.md                    # Primary orchestrator
│   ├── explore.md                  # Read-only codebase search
│   ├── general.md                  # Surgical implementation (1-3 files)
│   ├── plan.md                     # Architecture & decomposition
│   ├── review.md                   # Code review & debugging
│   ├── scout.md                    # External research
│   └── vision.md                   # UI/UX & accessibility
│
├── extensions/                     # 2 custom TypeScript extensions (memory via external npm:pi-hermes-memory)
│   ├── workflows-runner.ts         # DAG workflow executor
│   └── templates-injector.ts       # Auto-inject project templates
│
├── prompts/                        # 11 slash commands (pi-native)
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
├── context/                        # 2 reference docs
│   ├── architecture.md             # Pi 5-layer architecture
│   └── fallow.md                   # Fallow CLI reference
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

11 pi-native slash commands (full detail + lifecycle in [`prompts/INDEX.md`](./prompts/INDEX.md)):

| Command | Purpose |
|---------|---------|
| `/init` | Bootstrap project context (AGENTS.md + templates + user profile) |
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
| Orchestrate | `build` | full tool set + subagent |

---

## Extensions

This kit ships **2 custom TypeScript extensions** and uses **2 external npm packages** for specialized functionality. Long-term memory is provided by `npm:pi-hermes-memory` (declared in `settings.json:packages`) — see [## Memory](#memory) for architecture and tradeoffs.

### Custom (2)

| Extension | Purpose | Status |
|-----------|---------|--------|
| `workflows-runner` | Parses DAG workflows from `.pi/workflows/*.md`, returns execution plan with `subagent()` calls | Production |
| `templates-injector` | Auto-injects `project.md`, `tech-stack.md`, `state.md` into system prompt | Production |

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
| `pi-hermes-memory` | core | Long-term memory (`memory`/`memory_search`/`session_search`/`skill_manage`) | Mature, 368 tests, FTS5 + two-tier |
| `@davecodes/pi-dcp` | optional | Dynamic context pruning (dedup, error purge, compress tool) | Superset of the kit's former dcp-strategies extension |
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

The kit's memory layer is [`pi-hermes-memory`](https://github.com/chandra447/pi-hermes-memory) (`npm:pi-hermes-memory`, wired in `settings.json:packages`) — a mature external package (368 tests, 140★, MIT) ported from the Hermes agent. It replaces the kit's former in-house `pi-memory` + `pi-session-summary` extensions.

The kit still follows Addy Osmani's 4 memory-type model (*Lesson 5: memory and context*):

| Type | Duration | Kit component |
|------|----------|---------------|
| Short-term | one session | context window + pi-vcc compaction |
| Episodic | across sessions (searchable) | `pi-hermes-memory` session indexing → SQLite FTS5; `session_search` tool |
| Long-term | across sessions (retrieved on demand) | `pi-hermes-memory` markdown (`MEMORY.md`/`USER.md`) + SQLite FTS5; `memory` / `memory_search` tools |
| Procedural | permanent | Agent Skills `.pi/skills/*` (67 curated, shipped) + `pi-hermes-memory` `skill_manage` (runtime-saved, `~/.pi/agent/pi-hermes-memory/skills/`) |
| Declarative | varies (RAG) | `templates/` + `context/` + `semantic_*` / `websearch` / `context7` |

**`pi-hermes-memory` provides:**

1. **Capture** — `memory` tool (add/replace/remove; targets `memory`/`user`/`project` for uncategorized facts, `failure` + `category` for categorized memories) + **background learning loop** (LLM review every 10 turns / 15 tool-calls) + **correction detection** (saves when the user corrects the agent).
2. **Retrieval** — `memory_search` (SQLite FTS5 BM25, filter by `category`: failure/correction/insight/preference/convention/tool-quirk) + `session_search` (across all past sessions).
3. **Injection** — **policy-only by default** (a `<memory-policy>` block tells the agent *when* to call `memory_search`); `memoryMode:"legacy-inject"` restores full-content injection.
4. **Security** — **secret scanning** (blocks API keys/tokens/SSH keys) + XML fencing ("NOT new user input") against prompt injection.
5. **Consolidation** — auto-merges when memory hits the 5000-char cap (LLM subprocess); never loses data.
6. **Two-tier** — global (`~/.pi/agent/pi-hermes-memory/`) + per-project (`~/.pi/agent/projects-memory/<project>/`).

**Memory vs RAG** — don't conflate:

- **Memory** (`memory` / `memory_search` / `session_search`): personal — this project, this agent, written during sessions.
- **RAG** (`semantic_*` / `websearch` / `codesearch` / `context7`): general knowledge, looked up on demand.

**Honest tradeoffs (decision B, 2026-06-18):**

- **Native dep** — `better-sqlite3` (compiled); needs a build toolchain on unusual platforms (prebuilds cover common ones). The kit already accepts external binary deps (`pi-srcwalk`).
- **LLM-subprocess cost** — every background review / correction / consolidation spawns `pi.exec("pi",["-p","--no-session",…])` → real token cost + latency + non-determinism per session.
- **Vendor dependency** — core memory component is maintained by `chandra447` (9 contributors, active). The kit no longer owns its memory layer.
- **Policy-only injection** — memory only surfaces if the agent chooses to call `memory_search`; can miss relevant memory if the agent "forgets" to search.
- **Lost (vs former in-house extensions)** — the former `decision`, `intent`, `summary` commands + the always-injected "Session Summary (anchored)" block. Gained: `session_search`, learning loop, secret scan, consolidation, two-tier, 368 tests.
- **Retrieval is lexical** — FTS5 BM25 + literal-phrase match, case-insensitive. No embeddings/synonymy ("deploy" ≈ "ship" still needs embeddings — same gap as before, just indexed).

### Integration notes (verified against installed v0.7.17 source)

- **`memory` tool `target: "failure"` holds ALL categorized memories** — the 6 categories (failure/correction/insight/preference/convention/tool-quirk) all live under `target: "failure"` (the name is historical; not limited to failures). `target: "memory"`/`"user"`/`"project"` are uncategorized facts — passing `category` with those targets is silently ignored. To save a categorized decision/learning, use `target: "failure"` + `category`.
- **`skill_manage` "project" scope writes to user home, not the repo** — `scope: "project"` saves to `~/.pi/agent/projects-memory/<project>/skills/<name>/SKILL.md` (per-project, in the user's home, NOT committed with the repo). The kit's 67 curated skills live in `.pi/skills/` (repo, portable, shared across kit users). So hermes-saved project skills are user-local and won't ship with the kit — by design (runtime-saved vs curated-shipped).
- **Config is global-only** — `pi-hermes-memory` reads only `~/.pi/agent/hermes-memory-config.json` (global `AGENT_ROOT`), not a project-local config. Defaults are sane (policy-only injection, background review every 10 turns / 15 tool-calls, auto-consolidation). For cost-conscious use, document a recommended global config: raise `nudgeInterval` / `nudgeToolCalls` (fewer LLM-subprocess reviews) or set `memoryPolicyStyle: "compact"` (leaner policy block). The kit cannot ship a kit-local config — only document recommended global settings.

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
