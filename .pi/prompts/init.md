---
description: Initialize project setup — AGENTS.md, planning context, user profile, and tech stack
argument-hint: "[--deep] [--context|--user|--all]"
---

Initialize project setup. Run once per project.

> **Next step for fresh projects:** `/plan` to create first implementation plan.
> **Next step for existing codebases:** `/research` for deep codebase analysis, or just start describing what you want to build.

## Idempotency Rules

| File | Rule |
|------|------|
| `AGENTS.md` | Improve in-place — never overwrite blindly |
| `.pi/tech-stack.md` | Overwrite with detected values (auto-regenerated) |
| `.pi/roadmap.md` / `.pi/state.md` | Skip if exists, ask before overwrite |
| `.pi/user.md` | Skip if exists, ask before overwrite |

## Load Skills

Before initializing, load these skills from `.pi/skills/`:

| Skill | Why |
|-------|-----|
| `context-engineering` | AGENTS.md structure, context hierarchy, rules file best practices |
| `documentation-and-adrs` | Doc conventions, ADR format when architectural decisions arise |

Load `brainstorming` skill conditionally when ambiguous requirements arise.

## Before You Initialize

- **Be certain**: Only init once per project; re-init improves, never overwrites
- **Don't over-init**: If AGENTS.md is already good, skip to planning
- **Validate commands**: Test each detected command before writing to AGENTS.md
- **Respect existing**: Roadmap, state, user.md — ask before overwriting

## Parse Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--deep` | false | Comprehensive research for AGENTS.md (~100+ tool calls) |
| `--context` | false | Init planning context (roadmap.md, state.md) |
| `--user` | false | Init user profile (user.md) |
| `--all` | false | Full init: AGENTS.md + context + user profile |

**Mode rules:**
- No flags (default): Core project setup — AGENTS.md + tech-stack.md
- `--context`: Planning context (roadmap.md, state.md)
- `--user`: User profile (user.md)
- `--all`: Everything
- `--deep` applies to AGENTS.md generation only

**Brownfield auto-detection:** Existing codebase = any `src/`, `lib/`, or `app/` directory with `.ts`, `.js`, `.tsx`, `.jsx`, `.py`, `.go`, or `.rs` files. Affects Mode 2 discovery scope.

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

Show detected summary and ask for confirmation before writing.

### Phase 3: Create AGENTS.md

Load `verification-before-completion` skill.

Create `./AGENTS.md` — target <60 lines (max 150). Include:
- Tech stack with versions, file structure, validated commands
- Code example from actual codebase
- Testing conventions, boundaries, gotchas

**Principles:** Examples > explanations. Pointers > copies. If AGENTS.md exists, improve it — don't overwrite blindly.

### Phase 4: Create tech-stack.md

Write detected values to `.pi/tech-stack.md`. Then persist to long-term memory:

```typescript
observation({
  type: "decision",
  title: "Project initialized — [tech stack summary]",
  narrative: "Core setup completed: AGENTS.md, tech-stack.md created for [language/framework] project",
  concepts: "project-setup, initialization",
  confidence: "high",
});
```

### Phase 5: Setup Fallow (if available)

Check if fallow is available. If yes and no `.fallowrc.json` exists:

```bash
npx fallow init --quiet 2>/dev/null || true
```

---

## Mode 2: Planning Context (`--context`)

Initialize project planning context with roadmap and state files.

### Phase 1: Discovery (brownfield)

If the project has existing code (brownfield — see auto-detection above), spawn parallel codebase analysis via `subagent({ agent: "explore" })`.

If greenfield (no existing code), skip to requirements gathering.

### Phase 2: Requirements Gathering

Ask questions to define project direction:
- What is the project vision? (1-2 sentences)
- Who are the primary users?
- What defines success?

### Phase 3: Preview

Show the gathered requirements as a structured outline and ask for confirmation before writing files.

### Phase 4: Create Files

Create `.pi/roadmap.md` and `.pi/state.md` from templates.

These files are written for reference. Use `vcc_recall` for on-demand access in current session.

---

## Mode 3: User Profile (`--user`)

Create personalized user profile at `.pi/user.md`.

### Phase 1: Gather Preferences

Ask about identity, communication style, git workflow preferences.

### Phase 2: Preview

Show the captured preferences as a summary and ask for confirmation before writing.

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
5. Recommended next command: `/plan` to start planning, `/research` to explore the codebase.

---

### Skill Selection

If you use a platform-specific technology, the matching skill is already available in `.pi/skills/`. Pi auto-discovers all 59 skills on startup. Simply reference the skill by name in your `/skill:<name>` command when needed:

- `cloudflare` — Cloudflare Workers, Pages, KV, D1, R2, AI
- `react-best-practices` — React/Next.js performance patterns
- `supabase-postgres-best-practices` — Postgres query optimization
- `swiftui-expert-skill` — SwiftUI development
- `swift-concurrency` — Swift async/await patterns
- `core-data-expert` — Core Data on iOS/macOS

See `.pi/skills/INDEX.md` for the complete task → skill routing table. Skills load on-demand via `/skill:<name>` — no installation needed.

## Related Skills

See `.pi/skills/INDEX.md` for the complete task → skill routing table.
