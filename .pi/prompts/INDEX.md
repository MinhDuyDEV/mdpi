---
purpose: Index of slash commands with purpose, when-to-use, and lifecycle position
---

# Prompts Index

17 slash commands. Lifecycle is canonical; utilities attach at any phase.

## Canonical Lifecycle

```
   ┌──── /init ────┐
   │               ▼
/init → /create → /plan? → /ship ⇄ /verify
   │                  │           │
   │                  ▼           │
   │            (tasks.json)      │
   │                              │
   └──── /close ←─────────────────┘
   
Utilities (any phase):  /research  /audit  /fix  /gc  /test  /defect  /flake  /qa-report  /api-test
Status:                 /status
```

**Artifact chain:** `/init` → templates · `/create` → `spec.md` · `/plan` → `plan.md` + `tasks.json` · `/ship` → implementation + `progress.md` · `/verify` → `verify.log` · `/close` → clears `.active`.

## Commands

| Command | Purpose | When to use | Arg-hint | Lifecycle |
|---------|---------|-------------|----------|-----------|
| `/init` | Bootstrap project: AGENTS.md + planning context + user profile | Once per project (or after stack change) | `[--deep] [--context\|--user\|--all] [--dry-run]` | Setup |
| `/create` | Create spec (PRD) + workspace + task outline | Starting a feature/fix with a description | `<desc> [--lite] [--dry-run]` | Define |
| `/plan` | Detailed implementation plan + tasks.json (optional, between create and ship) | Complex tasks needing TDD-step guidance | `[--level 0-3] [--dry-run]` | Plan |
| `/ship` | Execute tasks, verify, review, close | Ready to implement the spec | `[--skip-review] [--dry-run]` | Build/Ship |
| `/verify` | Check completeness/correctness/coherence against PRD | Before shipping, or anytime mid-implementation | `[path\|all] [--quick] [--full] [--fix] [--no-cache]` | Verify |
| `/fix` | Debug + fix a bug or failing test | Bug reported, test failing | `<desc> [--attach <file>] [--dry-run]` | Verify (utility) |
| `/research` | Gather info before implementation (direct or deep-research workflow) | Need external/codebase understanding | `<topic> [--quick\|--thorough] [--dry-run]` | Define (utility) |
| `/audit` | Find all occurrences of a pattern, review, remediate | Cross-cutting concern (auth, error handling) | `<pattern> [--scope <dir>] [--dry-run]` | Review (utility) |
| `/gc` | Fallow analysis + quality grades + optional cleanup PRs | Maintenance cadence; not during active feature work | `[--dry-run] [--apply] [--scope <dir>]` | Maintenance |
| `/status` | Show active feature, progress tail, blockers | Orient at session start or when unsure | `[--full]` | Any (read-only) |
| `/close` | Finalize active feature, clear `.active` | Feature done/blocked/abandoned, or recover dangling `.active` | `[--done\|--blocked\|--abandoned] [--note <text>]` | Ship/Recovery |
| `/test` | Design + execute black-box tests from specs/contracts/mockups (no source code) | QA needs test cases from docs + running app | `<spec path or desc> [--app-url <url>] [--dry-run]` | Plan/Build |
| `/release-gate` | Aggregate quality signals into a go/no-go release decision | Pre-release QA sign-off (high-risk/public releases) | `[--slug <slug>] [--dod <path>] [--dry-run]` | Ship |
| `/defect` | Triage + process RCA + regression loop for a reported defect | A defect needs structured triage + RCA + closure (not a quick fix) | `<defect> [--severity <hint>] [--attach <file>] [--dry-run]` | Verify (utility) |
| `/flake` | Detect + quarantine flaky tests, decide retry vs fix | CI shows intermittent failures; suite health | `[--suite <pattern>] [--runs <N>] [--quarantine] [--dry-run]` | Maintenance |
| `/qa-report` | Generate a QA metrics report (defect density, escape, DORA, flake) | Release retrospective; quality decisions | `[--period <range>] [--scope <dir>]` | Maintenance |
| `/api-test` | Test an API black-box by sending requests + validating against contract | Black-box API testing (no source needed) | `<api-url or openapi-path> [--scope <op>] [--auth <token>] [--dry-run]` | Verify |

## When to use what

| Situation | Command |
|-----------|---------|
| Fresh repo, first session | `/init --all` |
| Existing repo, want codebase map | `/init --deep` then `/research` |
| "Build X" with a clear description | `/create "X"` → `/ship` |
| "Build X" but complex/multi-step | `/create "X"` → `/plan` → `/ship` |
| "Fix this bug / failing test" | `/fix "..."` |
| "How does X work / best practice for X" | `/research "X"` |
| "Find all console.log / auth checks" | `/audit "console.log"` |
| "Where am I / what's the state" | `/status` |
| Feature done but `/ship` left `.active` dangling | `/close --done` |
| Maintenance / dead code sweep | `/gc --dry-run` |
| "Design + run tests from spec/contract" (black-box) | `/test "<spec>" --app-url <url>` |
| "Is this ready to release?" (QA sign-off) | `/release-gate` |
| "A bug was reported" (needs triage + RCA) | `/defect "..."` |
| "Tests are flaky" | `/flake --runs 5` |
| "How good is our quality?" (metrics) | `/qa-report` |
| "Test this API" (black-box, no code) | `/api-test "<url or openapi>"` |

## Conventions (shared across commands)

- **Parse Arguments** — every command accepts `--help` and `--dry-run`.
- **Guard Phase** — preconditions checked before work begins (existing artifacts, uncommitted changes, missing deps).
- **Load Skills** — each command names the skills it needs; full routing in `skills/INDEX.md`.
- **Failure Handling** — 2-failure rule: if verification fails twice on the same approach, stop and escalate.
- **Stop Conditions** — explicit list per command; never silently continue past a blocker.
- **Workflow invocation** — commands that need multi-agent parallelism call `run_workflow({ name, args })`, not manual workflow-file reading.
- **`.active` convention** — `.pi/artifacts/.active` holds the current feature slug; `/close` clears it.

## Related

- `skills/INDEX.md` — task → skill routing (97 skills)
- `workflows/INDEX.md` — 10 DAG workflows invoked by commands
- `templates/` — 12 template files (PRD, plan body, state, roadmap, etc.)