---
name: skill-index
description: "Task-to-skill routing table with File Match + Keyword triggers, Phase/Risk gating, and multi-skill composition patterns. Maps common tasks to their matching skills. Serves as a discovery index for the agent to find the right skill to load."
---

# Skills Index — Task → Skill Mapping

This file helps the agent (and humans) discover which skill to load for a given task. Skills are auto-loaded into the system prompt at startup (Tier 1), triggered by File/Keyword Match rules, or loaded on-demand via `/skill:<name>` (Tier 2). All skills are available directly in `.pi/skills/`.

**How routing works:** File Match → Keyword Match → Quick Routing Table → Decision Tree (if ambiguous).

---

## File Match Triggers (Auto-Load)

When the agent edits files matching these patterns, the listed skills auto-load. The agent should `read` the full SKILL.md when the trigger fires.

| File pattern | Auto-load skill(s) | Why |
|-------------|-------------------|-----|
| `*.ts,*.tsx,*.jsx` | `react-best-practices`, `deep-module-design`, `react-compiler` | TypeScript/React best practices + structural quality |
| `**/actions.ts`, `**/actions/**` | `react-server-actions` | Server Actions + useActionState patterns |
| `**/app/**/page.tsx`, `**/app/**/layout.tsx` | `nextjs-app-router`, `nextjs-cache` | App Router conventions + caching |
| `**/stores/**`, `**/store.ts` | `zustand` | Zustand state management patterns |
| `**/hooks/use-query*.ts`, `**/queries/**` | `tanstack-query` | TanStack Query hooks and patterns |
| `**/forms/**` with `useForm`, `zodResolver` | `react-hook-form` | React Hook Form + Zod patterns |
| `*.swift,*.swiftui` | `swift-concurrency`, `swiftui-expert-skill` | Swift patterns + concurrency safety |
| `*.test.*,*.spec.*,__tests__/**` | `test-driven-development`, `testing-anti-patterns` | Test-first discipline + mock hygiene |
| `*.sql,migrations/**` | `supabase-postgres-best-practices` | Query performance + RLS |
| `.github/workflows/**,Dockerfile,docker-compose*.yml` | `ci-cd-and-automation` | Pipeline design + caching |
| `.pi/skills/*/SKILL.md` | `writing-skills` | Skill authoring best practices |

| `*.css,*.scss,*.less` | `baseline-ui`, `frontend-design`, `design-taste-frontend` | Deslop pass + design system consistency |
| `*.tsx,*.jsx` | `baseline-ui`, `frontend-ui-engineering` | Deslop pass + production-quality UI standards |
| `*.md,docs/**,ADR*.md` | `documentation-and-adrs` | Doc structure + ADR format |
| `.pi/**/DESIGN.md` | `frontend-design`, `design-taste-frontend` | Project design identity — load aesthetic skills when DESIGN.md is edited. NOTE: DESIGN.md is no longer auto-injected; load it into context on demand via `/inject-template DESIGN.md` when starting UI work. |

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
| dead code, duplication, circular dependency, unused exports, unused dependencies, complexity hotspot, codebase health, fallow | `fallow` |
| test, spec, verify, assert, coverage, TDD | `test-driven-development`, `testing-anti-patterns` |
| review, audit, quality, check, PR | `code-review-and-quality`, `agent-code-quality-gate` |
| design, UI, component, style, layout, CSS, tailwind, DESIGN.md, design identity, design token, brand identity | `frontend-design`, `design-taste-frontend` |
| accessibility, a11y, WCAG, ARIA, keyboard, focus, fix a11y | `fixing-accessibility` |
| craft, polish, detail, micro-interaction, concentric, optical, border-radius | `ui-craft-principles` |
| i18n, internationalization, RTL, edge case, error state, empty state, harden, text overflow | `production-hardening` |
| audit, quality score, UI audit, anti-pattern detection, P0 P1 P2 | `ui-quality-audit` |
| OKLCH, color system, color palette, color space, gamut, color conversion | `oklch-color-workflow` |
| deslop, quick fix, baseline, fix AI patterns, auto-fix UI | `baseline-ui` |
| database, query, SQL, postgres, supabase, RLS, migration | `supabase`, `supabase-postgres-best-practices` |
| docs, documentation, README, ADR, changelog | `documentation-and-adrs` |
| commit, branch, merge, rebase, git, worktree | `git-workflow-and-versioning`, `using-git-worktrees` |
| context, memory, token, agent quality, degraded | `context-engineering` |
| memory_system, memory-search, memory_search, pi-hermes, /memory-insights, save memory, remember this, past failure, previous attempt | `memory-system` |
| compress, dcp, vcc, rtk, context prune, cleanup context, context filling up, compaction, context optimization, token usage | `context-engineering`, `dcp-hygiene`, `context-optimization` |
| brainstorm, idea, design, concept, explore, ideate, refine | `brainstorming`, `idea-refine`, `spec-driven-development` |
| interview, grill, are we sure, what do you want | `interview-me` |
| plan, break down, decompose, tasks, roadmap | `planning-and-task-breakdown` |
| logs, metrics, traces, alerts, monitoring, observability | `observability-and-instrumentation` |
| email, send, transactional, template, Resend | `resend` |
| payment, subscription, license, billing, checkout | `polar` |
| Figma, design token, mockup, screenshot to code | `figma`, `mockup-to-code` |
| Jira, Confluence, Atlassian, issue, ticket | `jira` |
| v0, v0.sh, v0.dev, AI UI generator, Vercel v0, v0 component, v0 generate | `v0` |
| shadcn, shadcn/ui, shadcn-ui, shadcn ui, shadcn component, shadcn add | `shadcn-ui` |
| Server Actions, useActionState, useOptimistic, useFormStatus, 'use server', form action, progressive enhancement | `react-server-actions` |
| App Router, layout.tsx, page.tsx, parallel routes, intercepting routes, route groups, async params, template.tsx, loading.tsx | `nextjs-app-router` |
| use cache, cacheLife, cacheTag, revalidateTag, revalidatePath, Next.js cache, connection() | `nextjs-cache` |
| React Compiler, auto-memoize, babel-plugin-react-compiler, useMemo, useCallback, memoization | `react-compiler` |
| TanStack Query, React Query, useQuery, useMutation, optimistic update, infinite query, prefetch | `tanstack-query` |
| Zustand, state management, global state, create store, useShallow, immer, persist, devtools | `zustand` |
| React Hook Form, useForm, zodResolver, Controller, useFieldArray, form validation, conditional fields | `react-hook-form` |
| browser, e2e, screenshot, playwright, chrome | `playwright`, `chrome-devtools`, `browser-testing-with-devtools` |
| dependency, package, library, npm, PyPI, source | `opensrc` |
| scrape, crawl, webclaw, bot protection, 403, webfetch fail, extract web content, web scraping | `webclaw` |
| monorepo, workspace, nested package, which service, service boundary, scoped context, tech-stack, nearest AGENTS.md | `service-scoping` |

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
| `context-optimization` | Auto-activating 3-layer stack (rtk inflow / dcp in-flight / vcc compaction) — context kept lean in long sessions; vcc_recall before re-explore, compress at closures, /pi-vcc for manual compaction | All | Low |
| `memory-system` | Understanding/leveraging the in-house markdown memory layer — tools (memory/memory_search/session_search/skill_manage), auto-inject brief, deterministic correction detection, commands; when to use memory_search vs vcc_recall | All | Low |
| `doubt-driven-development` | In-flight adversarial review of non-trivial decisions before they stand | Build | Medium |
| `service-scoping` | Before editing a file in a monorepo/nested subtree — walk up to nearest AGENTS.md + service manifest + .pi/tech-stack.md, bounded by worktree root | Build | Low |


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
| `accessibility-audit` | ⚠️ DEPRECATED — use `fixing-accessibility` instead | Review | Medium |
| `baseline-ui` | Quick deslop pass — fixes common AI-generated UI anti-patterns automatically | Build | Low |
| `design-system-audit` | Auditing an existing design system for consistency | Review | Medium |
| `design-taste-frontend` | BASE aesthetic layer to override default LLM design biases | Build | Low |
| `fixing-accessibility` | Actionable WCAG 2.1 AA accessibility fixes — before/after code examples | Build + Review | Medium |
| `frontend-design` | Building any web UI with React-based frameworks | Build | Medium |
| `frontend-ui-engineering` | Production-quality UIs — component architecture, design systems, WCAG 2.1 AA, avoid AI aesthetic | Build | Medium |
| `high-end-visual-design` | Premium, agency-quality, or luxury visual design | Build | Low |
| `industrial-brutalist-ui` | Brutalist, military-terminal, or raw mechanical aesthetics | Build | Low |
| `minimalist-ui` | Clean, editorial, or minimalist aesthetics | Build | Low |
| `mockup-to-code` | Converting UI mockups, screenshots, Figma/Sketch designs into code | Build | Medium |
| `oklch-color-workflow` | Complete OKLCH color system — syntax, palette generation, contrast, Tailwind v4 | Build | Low |
| `production-hardening` | Production hardening — i18n, error states, edge cases, cross-browser | Ship | High |
| `react-best-practices` | Writing, reviewing, or refactoring React 19 / Next.js 16 code for performance | Build | Medium |
| `react-server-actions` | Building forms, mutations, data writes with React 19 Server Actions | Build | Medium |
| `nextjs-app-router` | Building Next.js App Router pages — layouts, routes, RSC boundaries | Build | Medium |
| `nextjs-cache` | Next.js 16 caching — `use cache`, cacheLife, cacheTag, revalidation | Build | Medium |
| `react-compiler` | Enabling, debugging, optimizing with the React Compiler | Build | Low |
| `tanstack-query` | Data fetching, caching, mutations with TanStack Query v5 | Build | Medium |
| `zustand` | Global/shared state management with Zustand v5 | Build | Medium |
| `react-hook-form` | Building forms with React Hook Form v7 + Zod v3 | Build | Medium |
| `redesign-existing-projects` | Upgrading an existing website or app's visual design | Build | High |
| `ui-craft-principles` | 16 craft principles — concentric radius, optical alignment, interruptible animations | Build | Low |
| `ui-quality-audit` | 5-dimension UI quality scoring (0-4) with P0-P3 severity tags | Review | Medium |

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
| `v0` | Using v0 (v0.app by Vercel) for AI-powered UI generation, prompt engineering, CLI/SDK integration | Build | Medium |
| `shadcn-ui` | Setting up, configuring, or adding shadcn/ui components — CLI v4, presets, skills, registries | Build | Medium |
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
| "generate with v0" / "v0 component" / "v0 prompt" / "AI generate UI" | `v0` + `frontend-design` | Build | Medium |
| "add shadcn components" / "shadcn init" / "setup shadcn" / "shadcn/ui setup" | `shadcn-ui` + `frontend-design` | Build | Medium |
| "Server Action" / "useActionState" / "useOptimistic" / "'use server'" | `react-server-actions` + `nextjs-app-router` | Build | Medium |
| "App Router" / "layout.tsx" / "parallel route" / "intercepting route" | `nextjs-app-router` + `react-best-practices` | Build | Medium |
| "use cache" / "revalidateTag" / "cacheLife" / "Next.js cache" | `nextjs-cache` + `nextjs-app-router` | Build | Medium |
| "React Compiler" / "auto-memoize" / "useMemo unnecessary" | `react-compiler` + `react-best-practices` | Build | Low |
| "useQuery" / "useMutation" / "TanStack Query" / "optimistic update" | `tanstack-query` + `zustand` | Build | Medium |
| "Zustand" / "create store" / "useShallow" / "global state" | `zustand` + `tanstack-query` | Build | Medium |
| "React Hook Form" / "useForm" / "zodResolver" / "useFieldArray" | `react-hook-form` + `react-server-actions` | Build | Medium |
| "deploy to Cloudflare" | `cloudflare` | Ship | High |
| "deploy to Vercel" | `vercel-deploy-claimable` | Ship | High |
| "animate" / "animation" / "motion" / "framer" / "transition" | `frontend-design` (references/animation/) | Build | Low |
| "set up database" / "Supabase" | `supabase` + `supabase-postgres-best-practices` | Build | High |
| "add logging" / "monitoring" / "observability" | `observability-and-instrumentation` | Ship | Medium |
| "optimize context" / "agent quality degraded" / "too many tokens" | `context-engineering` | All | Low |
| "remember this" / "memory-search" / "past failure" / "previous attempt" / "save to memory" | `memory-system` | All | Low |
| "compress context" / "dcp" / "context filling up" / "cleanup context" | `dcp-hygiene` | All | Low |
| "context optimization" / "vcc" / "rtk" / "compaction" / "tune context stack" | `context-optimization` | All | Low |
| "verify this approach" / "challenge this decision" / "doubt check" | `doubt-driven-development` | Build | Medium |
| "security audit" / "auth setup" / "vulnerability" | `security-and-hardening` | Review | High |
| "profile" / "too slow" / "bundle size" / "lighthouse" | `performance-optimization` | Review | Medium |
| "add email" / "send email" / "transactional" | `resend` | Build | Medium |
| "add payment" / "subscription" / "checkout" | `polar` | Build | High |
| "Figma to code" / "mockup to code" / "design to code" | `figma` → `mockup-to-code` → `frontend-design` | Build | Medium |
| "redisign" / "visual upgrade" / "restyle" | `redesign-existing-projects` | Build | High |
| "color system" / "OKLCH" / "color palette" | `oklch-color-workflow` | Build | Low |
| "fix accessibility" / "a11y fix" / "WCAG fix" | `fixing-accessibility` | Build | Medium |
| "make it feel better" / "craft details" / "UI polish" | `ui-craft-principles` | Build | Low |
| "production ready" / "harden UI" / "edge cases" | `production-hardening` | Ship | High |
| "quick polish" / "deslop" / "baseline fix" | `baseline-ui` | Build | Low |
| "UI audit" / "quality score" / "score my UI" | `ui-quality-audit` | Review | Medium |
| "accessibility" / "a11y" / "WCAG" | `fixing-accessibility` | Review | Medium |
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
baseline-ui → frontend-design → ui-craft-principles → production-hardening → ui-quality-audit
```

### Parallel Load (`+`)
Load multiple skills simultaneously for independent concerns.

```
code-review-and-quality + performance-optimization + security-and-hardening
frontend-design + design-taste-frontend + fixing-accessibility
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

```
Phase 1 (Deslop):   baseline-ui
Phase 2 (Design):   design-taste-frontend → frontend-design  
Phase 3 (Craft):    ui-craft-principles + oklch-color-workflow
Phase 4 (Build):    frontend-ui-engineering + incremental-implementation
Phase 5 (Harden):   production-hardening + fixing-accessibility
Phase 6 (Audit):    ui-quality-audit
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
