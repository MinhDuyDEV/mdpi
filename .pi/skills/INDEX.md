---
name: skill-index
description: "Task-to-skill routing table with File Match + Keyword triggers, Phase/Risk gating, and multi-skill composition patterns. Maps common tasks to their matching skills. Serves as a discovery index for the agent to find the right skill to load."
---

# Skills Index — Task → Skill Mapping

This file helps the agent (and humans) discover which skill to load for a given task. Skills are auto-loaded into the system prompt at startup (Tier 1), triggered by File/Keyword Match rules, or loaded on-demand via `/skill:<name>` (Tier 2). All 70 skills are available directly in `.pi/skills/`.

**How routing works:** File Match → Keyword Match → Quick Routing Table → Decision Tree (if ambiguous).

---

## File Match Triggers (Auto-Load)

When the agent edits files matching these patterns, the listed skills auto-load. The agent should `read` the full SKILL.md when the trigger fires.

| File pattern | Auto-load skill(s) | Why |
|-------------|-------------------|-----|
| `*.ts,*.tsx,*.jsx` | `react-best-practices`, `deep-module-design` | TypeScript/React best practices + structural quality |
| `*.swift,*.swiftui` | `swift-concurrency`, `swiftui-expert-skill` | Swift patterns + concurrency safety |
| `*.test.*,*.spec.*,__tests__/**` | `test-driven-development`, `testing-anti-patterns` | Test-first discipline + mock hygiene |
| `*.sql,migrations/**` | `supabase-postgres-best-practices` | Query performance + RLS |
| `.github/workflows/**,Dockerfile,docker-compose*.yml` | `ci-cd-and-automation` | Pipeline design + caching |
| `.pi/skills/*/SKILL.md` | `writing-skills` | Skill authoring best practices |
| `.pi/loops/**`,`loop-orchestrator.*`,`loop-guard.ts` | `loop-engineering`, `loop-audit` | Loop design/qualification + readiness scoring |
| `*.css,*.scss,*.less` | `frontend-design`, `design-taste-frontend` | Design system consistency |
| `*.tsx,*.jsx` | `frontend-ui-engineering` | Production-quality UI standards |
| `*.md,docs/**,ADR*.md` | `documentation-and-adrs` | Doc structure + ADR format |

---

## Keyword Match Triggers

When the user's prompt contains these keywords (case-insensitive), the listed skills are candidates. The agent should check the Quick Routing Table to refine.

| Keywords | Candidate skill(s) |
|----------|-------------------|
| deploy, ship, release, launch, production | `shipping-and-launch`, `vercel-deploy-claimable`, `cloudflare` |
| security, auth, token, secret, credential, vulnerability, OWASP | `security-and-hardening` |
| performance, slow, latency, optimize, profile, bundle size | `performance-optimization` |
| bug, fix, error, crash, broken, debug, trace | `debugging-and-error-recovery`, `root-cause-tracing` |
| refactor, cleanup, simplify, clean code, complex | `code-cleanup`, `code-simplification`, `deep-module-design` |
| test, spec, verify, assert, coverage, TDD | `test-driven-development`, `testing-anti-patterns` |
| review, audit, quality, check, PR | `code-review-and-quality`, `agent-code-quality-gate` |
| design, UI, component, style, layout, CSS, tailwind | `frontend-design`, `design-taste-frontend` |
| database, query, SQL, postgres, supabase, RLS, migration | `supabase`, `supabase-postgres-best-practices` |
| docs, documentation, README, ADR, changelog | `documentation-and-adrs` |
| commit, branch, merge, rebase, git, worktree | `git-workflow-and-versioning`, `using-git-worktrees` |
| context, memory, token, agent quality, degraded | `context-engineering` |
| memory_system, memory-search, memory_search, pi-hermes, /memory-insights, save memory, remember this, past failure, previous attempt | `memory-system` |
| compress, dcp, context prune, cleanup context, context filling up | `context-engineering`, `dcp-hygiene` |
| brainstorm, idea, design, concept, explore, ideate, refine | `brainstorming`, `idea-refine`, `spec-driven-development` |
| interview, grill, are we sure, what do you want | `interview-me` |
| plan, break down, decompose, tasks, roadmap | `planning-and-task-breakdown` |
| logs, metrics, traces, alerts, monitoring, observability | `observability-and-instrumentation` |
| email, send, transactional, template, Resend | `resend` |
| payment, subscription, license, billing, checkout | `polar` |
| Figma, design token, mockup, screenshot to code | `figma`, `mockup-to-code` |
| Jira, Confluence, Atlassian, issue, ticket | `jira` |
| browser, e2e, screenshot, playwright, chrome | `playwright`, `chrome-devtools`, `browser-testing-with-devtools` |
| dependency, package, library, npm, PyPI, source | `opensrc` |
| scrape, crawl, webclaw, bot protection, 403, webfetch fail, extract web content, web scraping | `webclaw` |
| loop, unattended loop, nightly triage, loop-readiness, loop-cost, loop-check, loop-review | `loop-engineering`, `loop-audit`, `loop-cost` |
| Swift, iOS, macOS, actor, async/await, Sendable | `swift-concurrency`, `swiftui-expert-skill`, `core-data-expert` |

---

## Tier 1 — Essential (always loaded)

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `behavioral-kernel` | Work is drifting into silent assumptions, overengineering, drive-by refactors, or vague completion claims | All | Low |
| `defense-in-depth` | A bug is caused by invalid data; need to validate at multiple system layers | Build | Low |
| `incremental-implementation` | Implementing features or fixes; enforce thin vertical slices with verify-after-each | Build | Low |
| `verification-before-completion` | About to claim work is complete, fixed, or passing — before committing or creating PRs | Verify | Low |

---

## Tier 2 — On-Demand (load when relevant)

### Process / Workflow

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `using-agent-skills` | Discovering which skill applies to the current task — meta-skill for skill routing | Define | Low |
| `interview-me` | One-question-at-a-time interview extracting what the user actually wants (not what they think they want) until ~95% confidence | Define | Low |
| `idea-refine` | Structured divergent/convergent thinking — turn vague ideas into concrete one-pagers with "Not Doing" list | Define | Low |
| `brainstorming` | Refining ideas into designs before coding | Define | Low |
| `spec-driven-development` | Vague request → concrete spec before implementation | Define | Low |
| `grill-me` | Adversarial interrogation of ideas before implementation | Define | Low |
| `planning-and-task-breakdown` | Decomposing spec into verifiable tasks | Plan | Low |
| `source-driven-development` | Grounding decisions in official docs, source code, and cited references | Plan | Low |
| `subagent-driven-development` | Dispatching fresh subagent per task with review gates | Build | Medium |
| `development-lifecycle` | Full feature development lifecycle (brainstorm → design → specify → plan → implement → verify) | All | Low |
| `documentation-and-adrs` | Writing technical docs, ADRs, READMEs | Ship | Low |
| `code-review-and-quality` | Reviewing for correctness, security, maintainability | Review | Medium |
| `agent-code-quality-gate` | Before claiming implementation work is complete — scope, duplication, verification gate | Review | Medium |
| `code-cleanup` | After behavior is working but diff is noisy, repetitive, or over-complicated | Review | Low |
| `code-simplification` | Refactoring code for clarity without changing behavior — Chesterton's Fence, preserve behavior | Review | Low |
| `deprecation-and-migration` | Deprecating APIs, migrating library versions, removing legacy code | Ship | High |
| `writing-skills` | Creating new skills, editing existing skills, verifying skills before deployment | Build | Low |
| `context-engineering` | Optimizing agent context setup — rules files, selective loading, confusion management | All | Low |
| `dcp-hygiene` | At command/phase closure — compress closed exploratory work-streams via pi-dcp when `compress` is available; no-ops if DCP absent | All | Low |
| `memory-system` | Understanding/leveraging pi-hermes-memory — auto-flywheel, tools, commands, when to use memory_search vs vcc_recall | All | Low |
| `doubt-driven-development` | In-flight adversarial review of non-trivial decisions before they stand | Build | Medium |
| `loop-engineering` | Designing/qualifying/running unattended coding loops; 2-condition test + VISION/state + confidence-gated action | All | Medium |
| `loop-audit` | Scoring a project's loop-readiness 0-100 + L0/L1/L2/L3; L3 gated on proven run | Review | Low |
| `loop-cost` | Estimating tokens/day + daily cap + early-exit flag before approving a loop budget | Plan | Low |

### Implementation

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `test-driven-development` | Implementing any logic, fixing bugs, changing behavior (RED-GREEN-REFACTOR) | Build | Medium |
| `testing-anti-patterns` | Preventing mock-only tests, test pollution | Build | Low |
| `deep-module-design` | Applying Ousterhout's deep module principles — small interfaces, information hiding | Build | Low |
| `api-and-interface-design` | Designing REST/GraphQL APIs, SDK interfaces, or public module boundaries | Build | Medium |

### Debugging

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `debugging-and-error-recovery` | Systematic root-cause debugging and safe recovery | Verify | Medium |
| `root-cause-tracing` | Tracing bugs backward through call stack | Verify | Medium |

### Git / Versioning

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `git-workflow-and-versioning` | Atomic commits, branching, versioning | Ship | Medium |
| `using-git-worktrees` | Starting feature work that needs isolation from current workspace | Build | Low |

### Frontend / UI

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `frontend-ui-engineering` | Production-quality UIs — component architecture, design systems, WCAG 2.1 AA, avoid AI aesthetic | Build | Medium |
| `frontend-design` | Building any web UI with React-based frameworks | Build | Medium |
| `design-taste-frontend` | BASE aesthetic layer to override default LLM design biases | Build | Low |
| `high-end-visual-design` | Premium, agency-quality, or luxury visual design | Build | Low |
| `minimalist-ui` | Clean, editorial, or minimalist aesthetics | Build | Low |
| `industrial-brutalist-ui` | Brutalist, military-terminal, or raw mechanical aesthetics | Build | Low |
| `react-best-practices` | Writing, reviewing, or refactoring React/Next.js code for performance | Build | Medium |
| `redesign-existing-projects` | Upgrading an existing website or app's visual design | Build | High |
| `mockup-to-code` | Converting UI mockups, screenshots, Figma/Sketch designs into code | Build | Medium |
| `accessibility-audit` | Auditing UI components or pages for accessibility compliance | Review | Medium |
| `design-system-audit` | Auditing an existing design system for consistency | Review | Medium |

### Platform / Infrastructure

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `cloudflare` | Deploying to or configuring ANY Cloudflare service | Ship | High |
| `vercel-deploy-claimable` | Deploying applications and websites to Vercel | Ship | High |
| `supabase` | Working with any Supabase service | Build | High |
| `supabase-postgres-best-practices` | Writing, reviewing, or optimizing Postgres queries in Supabase | Build | High |
| `ci-cd-and-automation` | Setting up CI/CD pipelines, GitHub Actions workflows | Ship | High |
| `shipping-and-launch` | Final readiness checks, rollback planning, release handoff | Ship | High |
| `performance-optimization` | Profiling, optimizing, or adding performance budgets | Review | Medium |
| `security-and-hardening` | Auditing for security vulnerabilities, implementing auth/authz | Review | High |
| `observability-and-instrumentation` | Adding logging, metrics, tracing, or alerting to production features | Ship | Medium |

### Mobile / Platform-Specific

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `swift-concurrency` | Swift Concurrency, async/await, actors, or task patterns | Build | Medium |
| `swiftui-expert-skill` | Writing, reviewing, or improving SwiftUI code | Build | Medium |
| `core-data-expert` | Writing, debugging, or optimizing Core Data code on iOS/macOS | Build | Medium |

### Tools / Integrations

| Skill | Use when | Phase | Risk |
|-------|----------|-------|------|
| `figma` | Implementing UI from Figma designs, extracting design tokens | Build | Low |
| `jira` | Interacting with Jira issues or Confluence docs | Plan | Low |
| `polar` | Implementing payment flows, subscriptions, license keys with Polar | Build | High |
| `resend` | Sending transactional emails, creating React Email templates | Build | Medium |
| `playwright` | Running automated browser tests, taking screenshots | Verify | Medium |
| `chrome-devtools` | Inspecting, screenshotting, verifying UI with Chrome DevTools | Verify | Low |
| `browser-testing-with-devtools` | Verifying or debugging browser behavior with live runtime evidence | Verify | Medium |
| `srcwalk` | Navigating code with srcwalk — repo maps, symbol search, callers/callees | All | Low |
| `opensrc` | Understanding how a library works internally, debugging dependency issues | Build | Low |
| `pdf-extract` | Extracting text, images, tables, or metadata from PDF files | Build | Low |
| `webclaw` | When webfetch returns 403 or bot protection errors | Build | Low |
| `gemini-large-context` | Analyzing large codebases, comparing multiple files exceeding typical context limits | Plan | Low |
| `fallow` | Codebase intelligence — quality, dead code, duplication, complexity hotspots | Review | Low |

---

## Quick Routing Table

Maps user intent to skill(s). `→` = sequential pipeline (execute in order). `+` = parallel load. `|` = choose one.

| User says | Skill(s) to load | Phase | Risk |
|-----------|-----------------|-------|------|
| "build X" / "implement X" (small) | `incremental-implementation` + `test-driven-development` | Build | Medium |
| "build X" (large, unclear) | `brainstorming` → `spec-driven-development` → `planning-and-task-breakdown` | Define→Plan | Low→Medium |
| "fix this bug" | `root-cause-tracing` → `debugging-and-error-recovery` + `verification-before-completion` | Verify | Medium |
| "review this code" / "audit this PR" | `code-review-and-quality` + `verification-before-completion` | Review | Medium |
| "research X" / "how does X work" | (Use `scout` subagent, no skill needed) | Define | Low |
| "design X" / "brainstorm X" / "ideate X" | `brainstorming` \| `idea-refine` | Define | Low |
| "interview me" / "grill me" / "what do I want" | `interview-me` | Define | Low |
| "refine this idea" / "stress-test my plan" | `idea-refine` | Define | Low |
| "build UI" / "build component" (production quality) | `frontend-ui-engineering` + `frontend-design` | Build | Medium |
| "write test" / "add coverage" / "TDD" | `test-driven-development` + `testing-anti-patterns` | Build | Medium |
| "ship this" / "deploy" / "release" | `verification-before-completion` → `shipping-and-launch` | Ship | High |
| "write docs" / "document this" / "ADR" | `documentation-and-adrs` | Ship | Low |
| "commit this" / "branch strategy" / "merge" | `git-workflow-and-versioning` | Ship | Medium |
| "refactor X" / "clean up X" | `deep-module-design` + `code-cleanup` + `incremental-implementation` | Review | Low |
| "simplify this code" / "too complex" | `code-simplification` + `code-review-and-quality` | Review | Low |
| "plan this" / "break this down" | `planning-and-task-breakdown` + `spec-driven-development` | Plan | Low |
| "I'm stuck" / "not sure what to do" | `behavioral-kernel` + `using-agent-skills` | All | Low |
| "which skill to use" / "what skill for" | `using-agent-skills` | Define | Low |
| "create UI" / "build component" / "design page" | `frontend-design` + `design-taste-frontend` | Build | Medium |
| "deploy to Cloudflare" | `cloudflare` | Ship | High |
| "deploy to Vercel" | `vercel-deploy-claimable` | Ship | High |
| "set up database" / "Supabase" | `supabase` + `supabase-postgres-best-practices` | Build | High |
| "add logging" / "monitoring" / "observability" | `observability-and-instrumentation` | Ship | Medium |
| "optimize context" / "agent quality degraded" / "too many tokens" | `context-engineering` | All | Low |
| "remember this" / "memory-search" / "past failure" / "previous attempt" / "save to memory" | `memory-system` | All | Low |
| "compress context" / "dcp" / "context filling up" / "cleanup context" | `dcp-hygiene` | All | Low |
| "verify this approach" / "challenge this decision" / "doubt check" | `doubt-driven-development` | Build | Medium |
| "security audit" / "auth setup" / "vulnerability" | `security-and-hardening` | Review | High |
| "profile" / "too slow" / "bundle size" / "lighthouse" | `performance-optimization` | Review | Medium |
| "add email" / "send email" / "transactional" | `resend` | Build | Medium |
| "add payment" / "subscription" / "checkout" | `polar` | Build | High |
| "Figma to code" / "mockup to code" / "design to code" | `figma` → `mockup-to-code` → `frontend-design` | Build | Medium |
| "redisign" / "visual upgrade" / "restyle" | `redesign-existing-projects` | Build | High |
| "accessibility" / "a11y" / "WCAG" | `accessibility-audit` | Review | Medium |
| "dependency issue" / "how does library X work" | `opensrc` | Build | Low |
| "scrape this" / "extract from" / "webclaw" / "crawl site" / "webfetch failed" | `webclaw` | Build | Low |
| "browser test" / "e2e test" / "playwright" | `playwright` \| `browser-testing-with-devtools` | Verify | Medium |
| "migrate" / "deprecate" / "remove old API" | `deprecation-and-migration` | Ship | High |
| "create skill" / "write skill" / "edit skill" | `writing-skills` | Build | Low |
| "codebase health" / "dead code" / "duplication" | `fallow` | Review | Low |
| "large codebase" / "compare repos" / "big picture" | `gemini-large-context` | Plan | Low |

---

## Skill Composition Patterns

### Sequential Pipeline (`→`)
Execute skills in order — output of one feeds the next.

```
brainstorming → spec-driven-development → planning-and-task-breakdown → incremental-implementation
figma → mockup-to-code → frontend-design
root-cause-tracing → debugging-and-error-recovery → verification-before-completion
```

### Parallel Load (`+`)
Load multiple skills simultaneously for independent concerns.

```
code-review-and-quality + performance-optimization + security-and-hardening
frontend-design + design-taste-frontend + accessibility-audit
test-driven-development + testing-anti-patterns + defense-in-depth
```

### Compose (Pipeline + Parallel combined)
Mix sequential and parallel phases.

```
Phase 1 (Define):  brainstorming + spec-driven-development
Phase 2 (Build):   incremental-implementation + test-driven-development
Phase 3 (Review):  code-review-and-quality + code-simplification
Phase 4 (Ship):    verification-before-completion → shipping-and-launch
```

### Choose One (`|`)
Pick the best single skill when options are context-dependent.

```
cloudflare | vercel-deploy-claimable  (depends on hosting platform)
playwright | chrome-devtools | browser-testing-with-devtools  (depends on tool preference)
high-end-visual-design | minimalist-ui | industrial-brutalist-ui  (depends on aesthetic)
```

---

## Decision Tree for Ambiguous Intent

When user intent matches **multiple skills** and the Quick Routing Table doesn't disambiguate:

```
1. Is there a File Match trigger? → Use that. Done.

2. Do keywords favor one skill? → Count keyword overlap. Highest overlap wins.

3. Are the skills in the same phase?
   ├── Yes → They may compose. Check Composition Patterns above. Load both if complementary.
   └── No → Pick the earlier-phase skill first. Output of earlier phase informs later.

4. Still ambiguous? → Ask ONE clarification question:
   "I see [skill A] and [skill B] could apply. [Skill A] is for [X]. [Skill B] is for [Y]. Which fits better?"
   Do NOT guess. Do NOT load both speculatively.

5. No skill matches at all? → Fallback: `using-agent-skills` or `behavioral-kernel`.
   If still no match, surface to user: "I don't have a skill for [task]. Should I handle this without a skill, or do you want to add one?"
```

---

## How Skills Load

1. **Tier 1**: Names + descriptions injected into system prompt at startup. Agent can `read` full SKILL.md on-demand.
2. **File Match**: Automatically triggered when agent edits files matching the patterns in the table above. Agent should `read` the full SKILL.md.
3. **Keyword Match**: Candidate skills surfaced when user prompt contains trigger keywords. Agent refines via Quick Routing Table + Decision Tree.
4. **Tier 2 (all others)**: Loaded on-demand when intent matches. Agent should `read` the SKILL.md when a task calls for domain-specific expertise.
5. **Force load**: Use `/skill:<name>` command to inject full skill into current session.

---

## How to Add New Skills

```bash
mkdir -p .pi/skills/<name>
cat > .pi/skills/<name>/SKILL.md << 'EOF'
---
name: <name>
description: <Use when...>
---

# <Skill Name>

<body>
EOF
```

Then add to this INDEX.md:
1. Add to the appropriate Tier 2 category table (with Phase + Risk columns)
2. Add File Match trigger if the skill targets specific file types
3. Add Keyword Match entries for phrases users will say
4. Add to Quick Routing Table with common user intents
5. If it composes with existing skills, add a Composition Pattern

Then `/reload` in pi session.
