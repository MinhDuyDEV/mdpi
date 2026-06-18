---
description: Initialize project setup — AGENTS.md, planning context, user profile, and tech stack
argument-hint: "[--deep] [--context|--user|--all] [--dry-run] [--help]"
---

# Init

Initialize project setup. Run once per project.

> **Next step for fresh projects:** `/create` to start first feature.
> **Next step for existing codebases:** `/research` for deep codebase analysis, or just describe what you want to build.

## Idempotency Rules

| File | Rule |
|------|------|
| `AGENTS.md` | Improve in-place — never overwrite blindly |
| `.pi/tech-stack.md` | Overwrite with detected values (auto-regenerated) |
| `.pi/roadmap.md` / `.pi/state.md` | Skip if exists, ask before overwrite |
| `.pi/user.md` | Skip if exists, ask before overwrite |

## Parse Arguments

| Argument   | Default | Description |
|------------|---------|-------------|
| `--deep`   | false   | Comprehensive research for AGENTS.md (~100+ tool calls). **Context-heavy** — prefer a dedicated session, or split across phases (history → structure → patterns) |
| `--context`| false   | Init planning context (roadmap.md, state.md) |
| `--user`   | false   | Init user profile (user.md) |
| `--all`    | false   | Full init: AGENTS.md + context + user profile |
| `--dry-run`| false   | Preview detection results without writing files |
| `--help`   | false   | Show this usage |

**Mode rules:**
- No flags (default): Core project setup — AGENTS.md + tech-stack.md
- `--context`: Planning context (roadmap.md, state.md)
- `--user`: User profile (user.md)
- `--all`: Everything
- `--deep` applies to AGENTS.md generation only

**Brownfield auto-detection:** Existing codebase = any `src/`, `lib/`, or `app/` directory with `.ts`, `.js`, `.tsx`, `.jsx`, `.py`, `.go`, or `.rs` files.

## Guard Phase

Before initializing:
- Check if `AGENTS.md` already exists — if yes, improve in-place, never overwrite blindly
- Check if `.pi/tech-stack.md`, `.pi/roadmap.md`, `.pi/state.md`, `.pi/user.md` exist — ask before overwriting
- Validate the project's build, test, lint commands before documenting them

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `context-engineering` | Always (Mode 1) | AGENTS.md structure, context hierarchy, rules file best practices |
| `documentation-and-adrs` | Always (Mode 1) | Doc conventions, ADR format when architectural decisions arise |
| `verification-before-completion` | Before writing AGENTS.md | Validate commands before documenting them |
| `brainstorming` | Conditionally: when ambiguous requirements arise | Refine project vision before initializing |

---

## Mode 1: Core Setup (Default)

### Phase 1: Detect Project

Detect and validate:
- Package manager and dependencies (with versions)
- Build, test, lint, dev commands — **validate each actually works**
- CI/CD configuration
- Existing AI rules (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`)
- Top-level directory structure

With `--deep`:
- Analyze git history (last 50 commits for patterns)
- Map source directory structure and subsystem candidates
- Identify common patterns (error handling, logging, data flow)
- Detect testing patterns and coverage gaps

### Phase 2: Preview Detection

Show detected summary and ask for confirmation before writing. If `--dry-run`, stop here.

### Phase 3: Create AGENTS.md

Load `verification-before-completion` skill — validate all commands before documenting them.

Create `./AGENTS.md` — target <60 lines (max 150). Include:
- Tech stack with versions, file structure, validated commands
- Code example from actual codebase
- Testing conventions, boundaries, gotchas

**Principles:** Examples > explanations. Pointers > copies. If AGENTS.md exists, improve it — don't overwrite blindly.

**Architectural decisions:** If `--deep` surfaces a non-obvious architectural choice (framework selection, state strategy, data layer), load `documentation-and-adrs` and propose an ADR using `.pi/templates/adr.md`. Don't force it — only when a real decision worth recording exists.

### Phase 4: Create tech-stack.md

Write detected values to `.pi/tech-stack.md`. Then persist to long-term memory via the `memory` tool (pi-hermes-memory, action: `add`, target: `failure`, category: `convention`):

- content: "Project initialized — [tech stack summary]"
- (target `failure` holds ALL categorized memories; `convention` = project-specific setup norms)

### Phase 5: Setup Fallow (if available)

Check if fallow is available. If yes and no `.fallowrc.json` exists:

```bash
npx fallow init --quiet 2>/dev/null || echo "Fallow not available — skipped"
```

Report explicitly if skipped.

---

## Mode 2: Planning Context (`--context`)

### Phase 1: Discovery (brownfield)

If the project has existing code (see auto-detection above), spawn parallel codebase analysis via `subagent({ agent: "explore" })`.

If greenfield (no existing code), skip to requirements gathering.

### Phase 2: Requirements Gathering

Ask questions:
- What is the project vision? (1-2 sentences)
- Who are the primary users?
- What defines success?

### Phase 3: Preview

Show structured outline and ask for confirmation before writing.

### Phase 4: Create Files

Create `.pi/roadmap.md` and `.pi/state.md` from templates in `.pi/templates/`.

---

## Mode 3: User Profile (`--user`)

### Phase 1: Gather Preferences

Ask about identity, communication style, git workflow preferences.

### Phase 2: Preview

Show captured preferences summary and ask for confirmation.

### Phase 3: Create user.md

Write to `.pi/user.md` with the captured preferences.

---

## Failure Handling

| Scenario | Action |
|----------|--------|
| Command validation fails | Report which command failed with actual error |
| AGENTS.md already exists | Improve in-place, don't overwrite blindly |
| Fallow not available | Skip fallow setup, note in output |
| Tech stack detection ambiguous | Ask user to confirm, don't guess |

## Stop Conditions

- User says no to AGENTS.md confirmation → stop, report detection only
- Roadmap/state/user.md exists and user says no to overwrite → skip, report
- AGENTS.md exceeds 150 lines → trim before writing
- Command validation fails → stop, report which command failed

## Output

Report what was created:
1. AGENTS.md (if core setup ran)
2. tech-stack.md (if core setup ran)
3. roadmap.md + state.md (if `--context`)
4. user.md (if `--user`)
5. Recommended next command: `/create` to start first feature, or `/research` to explore.

---

### Platform-Specific Skills

If you use a platform-specific technology, the matching skill is auto-discovered in `.pi/skills/`. Load via `/skill:<name>` when needed:

- `cloudflare` — Cloudflare Workers, Pages, KV, D1, R2, AI
- `react-best-practices` — React/Next.js performance patterns
- `supabase-postgres-best-practices` — Postgres query optimization
- `swiftui-expert-skill` — SwiftUI development
- `swift-concurrency` — Swift async/await patterns
- `core-data-expert` — Core Data on iOS/macOS

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Create first spec | `/create`     |
| Research codebase | `/research`   |
| Plan feature      | `/plan`       |

## Related Skills

- `context-engineering` — AGENTS.md structure and context hierarchy design
- `documentation-and-adrs` — doc conventions and ADR format
- `verification-before-completion` — command validation discipline
