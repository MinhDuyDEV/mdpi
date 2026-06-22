---
purpose: Index of slash commands with purpose, when-to-use, and lifecycle position
---

# Prompts Index

12 slash commands. Lifecycle is canonical; utilities attach at any phase.

## Canonical Lifecycle

```
   ┌──── /init ──────────────────────┐
   │                                 ▼
/init → /clarify (vague) ┐   /plan? → /ship ⇄ /verify
       \                 │      │           │
        → /create (clear) ┘      ▼           │
                           (tasks.json)      │
   ┌──── /close ←────────────────────────────┘
   │
Utilities (any phase):  /research  /audit  /fix  /gc
Status:                 /status
```

**Two Define-phase entries:** `/clarify` (vague/complex ask — discussion pipeline: interview → brainstorm/refine → grill → doubt → spec) · `/create` (clear ask — fast path to spec + workspace + branch).

**Artifact chain:** `/init` → templates · `/clarify`|`/create` → `spec.md` · `/plan` → `plan.md` + `tasks.json` · `/ship` → implementation + `progress.md` · `/verify` → `verify.log` · `/close` → clears `.active`.

## Commands

| Command | Purpose | When to use | Arg-hint | Lifecycle |
|---------|---------|-------------|----------|-----------|
| `/init` | Bootstrap project: AGENTS.md + planning context + user profile | Once per project (or after stack change) | `[--deep] [--context\|--user\|--all] [--dry-run]` | Setup |
| `/clarify` | Discuss + clarify + stress-test a vague idea into a hardened spec | Vague/underspecified/high-stakes ask needing structured discussion | `[<topic>] [--grill] [--spec <path>] [--dry-run]` | Define (deep) |
| `/create` | Create spec (PRD) + workspace + task outline | Starting a feature/fix with a clear description | `<desc> [--lite] [--dry-run]` | Define (fast) |
| `/plan` | Detailed implementation plan + tasks.json (optional, between create and ship) | Complex tasks needing TDD-step guidance | `[--level 0-3] [--dry-run]` | Plan |
| `/ship` | Execute tasks, verify, review, close | Ready to implement the spec | `[--skip-review] [--dry-run]` | Build/Ship |
| `/verify` | Check completeness/correctness/coherence against PRD | Before shipping, or anytime mid-implementation | `[path\|all] [--quick] [--full] [--fix] [--no-cache]` | Verify |
| `/fix` | Debug + fix a bug or failing test | Bug reported, test failing | `<desc> [--attach <file>] [--dry-run]` | Verify (utility) |
| `/research` | Gather info before implementation (direct or deep-research workflow) | Need external/codebase understanding | `<topic> [--quick\|--thorough] [--dry-run]` | Define (utility) |
| `/audit` | Find all occurrences of a pattern, review, remediate | Cross-cutting concern (auth, error handling) | `<pattern> [--scope <dir>] [--dry-run]` | Review (utility) |
| `/gc` | Fallow analysis + quality grades + optional cleanup PRs | Maintenance cadence; not during active feature work | `[--dry-run] [--apply] [--scope <dir>]` | Maintenance |
| `/status` | Show active feature, progress tail, blockers | Orient at session start or when unsure | `[--full]` | Any (read-only) |
| `/close` | Finalize active feature, clear `.active` | Feature done/blocked/abandoned, or recover dangling `.active` | `[--done\|--blocked\|--abandoned] [--note <text>]` | Ship/Recovery |

## When to use what

| Situation | Command |
|-----------|---------|
| Fresh repo, first session | `/init --all` |
| Existing repo, want codebase map | `/init --deep` then `/research` |
| "Build X" but I'm not sure what X really is | `/clarify "X"` → `/plan` |
| Vague idea needs discussion before spec | `/clarify` (interactive) |
| Stress-test an existing idea/ADR/PRD | `/clarify --grill` or `/clarify --spec path/to/adr.md` |
| "Build X" with a clear description | `/create "X"` → `/ship` |
| "Build X" but complex/multi-step | `/create "X"` → `/plan` → `/ship` |
| "Fix this bug / failing test" | `/fix "..."` |
| "How does X work / best practice for X" | `/research "X"` |
| "Find all console.log / auth checks" | `/audit "console.log"` |
| "Where am I / what's the state" | `/status` |
| Feature done but `/ship` left `.active` dangling | `/close --done` |
| Maintenance / dead code sweep | `/gc --dry-run` |

## Conventions (shared across commands)

- **Parse Arguments** — every command accepts `--help` and `--dry-run`.
- **Guard Phase** — preconditions checked before work begins (existing artifacts, uncommitted changes, missing deps).
- **Load Skills** — each command names the skills it needs; full routing in `skills/INDEX.md`.
- **Failure Handling** — 2-failure rule: if verification fails twice on the same approach, stop and escalate.
- **Stop Conditions** — explicit list per command; never silently continue past a blocker.
- **Workflow invocation** — commands that need multi-agent parallelism call `run_workflow({ name, args })`, not manual workflow-file reading.
- **`.active` convention** — `.pi/artifacts/.active` holds the current feature slug; `/close` clears it.

## Related

- `skills/INDEX.md` — task → skill routing (67 skills)
- `workflows/INDEX.md` — 6 DAG workflows invoked by commands
- `templates/` — 12 template files (PRD, plan body, state, roadmap, etc.)