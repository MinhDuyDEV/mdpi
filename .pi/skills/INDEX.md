# Skills Index — Task → Skill Mapping

This file helps the agent (and humans) discover which skill to load for a given task. Skills are auto-loaded into the system prompt at startup (Tier 1) or loaded on-demand via `/skill:<name>` (Tier 2).

## Tier 1 — Essential (always loaded)

| Skill | Use when |
|-------|----------|
| `behavioral-kernel` | Work is drifting into silent assumptions, overengineering, drive-by refactors, or vague completion claims |
| `defense-in-depth` | A bug is caused by invalid data; need to validate at multiple system layers |
| `incremental-implementation` | Implementing features or fixes; enforce thin vertical slices with verify-after-each |
| `verification-before-completion` | About to claim work is complete, fixed, or passing — before committing or creating PRs |

## Tier 2 — On-Demand (load when relevant)

### Process / Workflow

| Skill | Use when |
|-------|----------|
| `brainstorming` | Refining ideas into designs before coding |
| `spec-driven-development` | Vague request → concrete spec before implementation |
| `planning-and-task-breakdown` | Decomposing spec into verifiable tasks |
| `subagent-driven-development` | Dispatching fresh subagent per task with review gates |
| `documentation-and-adrs` | Writing technical docs, ADRs, READMEs |
| `code-review-and-quality` | Reviewing for correctness, security, maintainability |

### Implementation

| Skill | Use when |
|-------|----------|
| `test-driven-development` | Implementing any logic, fixing bugs, changing behavior (RED-GREEN-REFACTOR) |
| `testing-anti-patterns` | Preventing mock-only tests, test pollution |
| `incremental-implementation` | (Tier 1) — listed here for visibility |
| `verification-before-completion` | (Tier 1) — listed here for visibility |
| `defense-in-depth` | (Tier 1) — listed here for visibility |

### Debugging

| Skill | Use when |
|-------|----------|
| `debugging-and-error-recovery` | Systematic root-cause debugging and safe recovery |
| `root-cause-tracing` | Tracing bugs backward through call stack |
| `code-review-and-quality` | Reviewing for correctness after a fix |

### Git / Versioning

| Skill | Use when |
|-------|----------|
| `git-workflow-and-versioning` | Atomic commits, branching, versioning |

## Quick Routing Table

| User intent | Skill(s) to load |
|-------------|------------------|
| "build X" / "implement X" (small) | `incremental-implementation` + `test-driven-development` |
| "build X" (large, unclear) | `brainstorming` → `spec-driven-development` → `planning-and-task-breakdown` |
| "fix this bug" | `root-cause-tracing` + `debugging-and-error-recovery` + `verification-before-completion` |
| "review this code" | `code-review-and-quality` + `verification-before-completion` |
| "research X" | (Use `scout` subagent, no skill needed) |
| "design X" | `brainstorming` |
| "test X" | `test-driven-development` + `testing-anti-patterns` |
| "ship this" | `verification-before-completion` + `incremental-implementation` |
| "write docs" | `documentation-and-adrs` |
| "commit this" | `git-workflow-and-versioning` |
| "refactor X" | `defense-in-depth` + `incremental-implementation` + `code-review-and-quality` |
| "plan this" | `planning-and-task-breakdown` + `spec-driven-development` |
| "I'm stuck" | `behavioral-kernel` |

## Tier 3 — Archived (not shipped)

42 skills moved to `_tier-3-archive/` for niche platforms and tools:
- **Frontend/UI**: accessibility-audit, design-system-audit, design-taste-frontend, frontend-design, high-end-visual-design, industrial-brutalist-ui, minimalist-ui, mockup-to-code, react-best-practices, redesign-existing-projects
- **Platform**: cloudflare, core-data-expert, polar, resend, supabase, supabase-postgres-best-practices, swift-concurrency, swiftui-expert-skill, vercel-deploy-claimable, ci-cd-and-automation
- **Tools**: figma, jira, gemini-large-context, webclaw, pdf-extract, opensrc, srcwalk, fallow
- **Process**: agent-code-quality-gate, code-cleanup, deprecation-and-migration, development-lifecycle, grill-me, security-and-hardening, shipping-and-launch, source-driven-development, performance-optimization, using-git-worktrees, api-and-interface-design, writing-skills, browser-testing-with-devtools, playwright, chrome-devtools

To add a Tier-3 skill: `cp -r _tier-3-archive/<skill> ./` and restart `pi`.

## How Skills Load

1. **Tier 1**: Names + descriptions injected into system prompt at startup. Agent can `read` full SKILL.md on-demand.
2. **Tier 2**: Same as Tier 1, but agent should only load when intent matches.
3. **Force load**: Use `/skill:<name>` command to inject full skill into current session.

## How to Add New Skills

```bash
mkdir -p .pi/skills/<name>
cat > .pi/skills/<name>/SKILL.md << 'EOF'
---
name: <name>
description: <Use when...>
---

# <Skill Name>

<Body>
EOF
```

Then `/reload` in pi session.
