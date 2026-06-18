# Skills Index — Task → Skill Mapping

This file helps the agent (and humans) discover which skill to load for a given task. Skills are auto-loaded into the system prompt at startup (Tier 1) or loaded on-demand via `/skill:<name>` (Tier 2). All 62 skills are available directly in `.pi/skills/`.

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
| `agent-code-quality-gate` | Before claiming implementation work is complete — scope, duplication, verification gate |
| `development-lifecycle` | Full feature development lifecycle (brainstorm → design → specify → plan → implement → verify) |
| `deprecation-and-migration` | Deprecating APIs, migrating library versions, removing legacy code |
| `grill-me` | Adversarial interrogation of ideas before implementation |
| `source-driven-development` | Grounding decisions in official docs, source code, and cited references |
| `writing-skills` | Creating new skills, editing existing skills, verifying skills before deployment |
| `code-cleanup` | After behavior is working but diff is noisy, repetitive, or over-complicated |
| `context-engineering` | Optimizing agent context setup — rules files, selective loading, confusion management |
| `doubt-driven-development` | In-flight adversarial review of non-trivial decisions before they stand |

### Implementation

| Skill | Use when |
|-------|----------|
| `test-driven-development` | Implementing any logic, fixing bugs, changing behavior (RED-GREEN-REFACTOR) |
| `testing-anti-patterns` | Preventing mock-only tests, test pollution |
| `deep-module-design` | Applying Ousterhout's deep module principles — small interfaces, information hiding |
| `api-and-interface-design` | Designing REST/GraphQL APIs, SDK interfaces, or public module boundaries |

### Debugging

| Skill | Use when |
|-------|----------|
| `debugging-and-error-recovery` | Systematic root-cause debugging and safe recovery |
| `root-cause-tracing` | Tracing bugs backward through call stack |

### Git / Versioning

| Skill | Use when |
|-------|----------|
| `git-workflow-and-versioning` | Atomic commits, branching, versioning |
| `using-git-worktrees` | Starting feature work that needs isolation from current workspace |

### Frontend / UI

| Skill | Use when |
|-------|----------|
| `frontend-design` | Building any web UI with React-based frameworks |
| `design-taste-frontend` | BASE aesthetic layer to override default LLM design biases |
| `high-end-visual-design` | Premium, agency-quality, or luxury visual design |
| `minimalist-ui` | Clean, editorial, or minimalist aesthetics |
| `industrial-brutalist-ui` | Brutalist, military-terminal, or raw mechanical aesthetics |
| `react-best-practices` | Writing, reviewing, or refactoring React/Next.js code for performance |
| `redesign-existing-projects` | Upgrading an existing website or app's visual design |
| `mockup-to-code` | Converting UI mockups, screenshots, Figma/Sketch designs into code |
| `accessibility-audit` | Auditing UI components or pages for accessibility compliance |
| `design-system-audit` | Auditing an existing design system for consistency |

### Platform / Infrastructure

| Skill | Use when |
|-------|----------|
| `cloudflare` | Deploying to or configuring ANY Cloudflare service |
| `vercel-deploy-claimable` | Deploying applications and websites to Vercel |
| `supabase` | Working with any Supabase service |
| `supabase-postgres-best-practices` | Writing, reviewing, or optimizing Postgres queries in Supabase |
| `ci-cd-and-automation` | Setting up CI/CD pipelines, GitHub Actions workflows |
| `shipping-and-launch` | Final readiness checks, rollback planning, release handoff |
| `performance-optimization` | Profiling, optimizing, or adding performance budgets |
| `security-and-hardening` | Auditing for security vulnerabilities, implementing auth/authz |
| `observability-and-instrumentation` | Adding logging, metrics, tracing, or alerting to production features |

### Mobile / Platform-Specific

| Skill | Use when |
|-------|----------|
| `swift-concurrency` | Swift Concurrency, async/await, actors, or task patterns |
| `swiftui-expert-skill` | Writing, reviewing, or improving SwiftUI code |
| `core-data-expert` | Writing, debugging, or optimizing Core Data code on iOS/macOS |

### Tools / Integrations

| Skill | Use when |
|-------|----------|
| `figma` | Implementing UI from Figma designs, extracting design tokens |
| `jira` | Interacting with Jira issues or Confluence docs |
| `polar` | Implementing payment flows, subscriptions, license keys with Polar |
| `resend` | Sending transactional emails, creating React Email templates |
| `playwright` | Running automated browser tests, taking screenshots |
| `chrome-devtools` | Inspecting, screenshotting, verifying UI with Chrome DevTools |
| `browser-testing-with-devtools` | Verifying or debugging browser behavior with live runtime evidence |
| `srcwalk` | Navigating code with srcwalk — repo maps, symbol search, callers/callees |
| `opensrc` | Understanding how a library works internally, debugging dependency issues |
| `pdf-extract` | Extracting text, images, tables, or metadata from PDF files |
| `webclaw` | When webfetch returns 403 or bot protection errors |
| `gemini-large-context` | Analyzing large codebases, comparing multiple files exceeding typical context limits |
| `fallow` | Codebase intelligence — quality, dead code, duplication, complexity hotspots |

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
| "ship this" | `verification-before-completion` + `incremental-implementation` + `shipping-and-launch` |
| "write docs" | `documentation-and-adrs` |
| "commit this" | `git-workflow-and-versioning` |
| "refactor X" | `deep-module-design` + `defense-in-depth` + `incremental-implementation` + `code-review-and-quality` |
| "plan this" | `planning-and-task-breakdown` + `spec-driven-development` |
| "I'm stuck" | `behavioral-kernel` |
| "create UI" | `frontend-design` + `design-taste-frontend` |
| "deploy to Cloudflare" | `cloudflare` |
| "deploy to Vercel" | `vercel-deploy-claimable` |
| "set up database" | `supabase` + `supabase-postgres-best-practices` |
| "add logging/metrics" | `observability-and-instrumentation` |
| "optimize context" / "agent quality degraded" | `context-engineering` |
| "verify this approach" / "review this decision" | `doubt-driven-development` |

## How Skills Load

1. **Tier 1**: Names + descriptions injected into system prompt at startup. Agent can `read` full SKILL.md on-demand.
2. **Tier 2 (all others)**: Loaded on-demand when intent matches. Agent should `read` the SKILL.md when a task calls for domain-specific expertise.
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
