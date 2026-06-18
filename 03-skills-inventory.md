# 03 - Skills Inventory (59 skills, 2 tiers)

## Tổng quan

`.opencode/skill/` chứa **59 skills** được tổ chức theo 2-tier system:
- **Tier 1 (4 skills, Essential):** Always considered first, loaded automatically
- **Tier 2 (55 skills, On-Demand):** Loaded via `skill()` when relevant

`.pi` **hiện tại không có** skills system. Phần này inventory đầy đủ 59 skills + schema + quyết định port.

---

## A. Manifest Schema

Đọc từ `/tmp/opencodekit-template/.opencode/skill/manifest.json`:

```json
{
  "version": 1,
  "description": "OpenCodeKit skill tier classification. Tiers determine visibility and loading strategy.",
  "tiers": {
    "1": {
      "label": "Essential",
      "description": "Always available — referenced in AGENTS.md, agents should consider these first for every task. Small, general-purpose skills that shape execution discipline.",
      "skills": [
        "behavioral-kernel",
        "defense-in-depth",
        "incremental-implementation",
        "verification-before-completion"
      ]
    },
    "2": {
      "label": "On-Demand",
      "description": "Shipped with the template, loaded via `skill()` when relevant. Covers most domains — UI, testing, debugging, design, workflow, platform integration.",
      "skills": [ /* 55 entries */ ]
    }
  }
}
```

**Schema observations:**
- Chỉ có 2 top-level keys: `version`, `description`, `tiers`
- Mỗi tier có: `label`, `description`, `skills` (array of strings — chỉ directory names)
- **KHÔNG** có per-skill metadata trong manifest (name, tags, version đều nằm trong SKILL.md frontmatter)
- Tier classification = **loading strategy** (always vs on-demand), không phải priority

**SKILL.md frontmatter schema (mỗi skill):**
```yaml
---
name: <kebab-case-name>             # letters, numbers, hyphens only
description: <1024 char max>         # "Use when..." + triggers + what it does
version: 1.0.0                      # optional
tags: [workflow, behavior, ...]      # optional, informal taxonomy
dependencies: [other-skill, ...]    # optional
agent_types: [planner, worker, ...]  # optional
tools: []                            # optional (default empty)
---
```

---

## B. Tier 1 Skills (4 files, ~300 lines) — ESSENTIAL

> **Status: 🟡 Easy port — inline vào AGENTS.md (Phase 1)**

### 1. `behavioral-kernel` (80 lines, đã đọc full)

**Frontmatter:**
- name: behavioral-kernel
- description: "Use when work starts drifting into silent assumptions, overengineering, drive-by refactors, or vague completion claims. Re-centers the agent on a compact Pi-native execution kernel with concrete anti-pattern examples."
- version: 1.0.0
- tags: [workflow, behavior, anti-slop]
- agent_types: [planner, worker, reviewer]
- dependencies: []

**Core (4 nguyên tắc):**
1. **Clarify before committing** — surface assumptions or ask instead of silently choosing
2. **Choose the smallest working change** — solve today's problem directly before inventing flexibility
3. **Keep diffs surgical** — change only what the request requires; log unrelated issues
4. **Define proof before acting** — say how success will be verified BEFORE implementation

**Drift signals:** adding abstraction for single use case, changing adjacent code "while you're here", postponing verification, claiming completion without proof path, silently picking interpretation

**Recovery move:** re-state request → smallest change → proof path → delete anything outside boundary

**Pi porting:** Inline vào `/Users/minhduydev/.pi/agent/AGENTS.md` (Section: "Behavioral Kernel")

---

### 2. `defense-in-depth` (200 lines, đã đọc full)

**Frontmatter:**
- name: defense-in-depth
- description: "Use when invalid data causes failures deep in execution, requiring validation at multiple system layers..."
- tags: [code-quality, debugging]
- dependencies: []

**Core (4 layers validation):**
- **Layer 1: Entry Point** — reject invalid input at API boundary
- **Layer 2: Business Logic** — ensure data makes sense for operation
- **Layer 3: Environment Guards** — prevent dangerous ops in specific contexts
- **Layer 4: Debug Instrumentation** — capture context for forensics

**Anti-patterns:** single-layer validation, duplicating identical validation, catching/swallowing errors silently, mixing validation with business logic

**Rationalization rebuttals:** "one validation is enough", "this adds boilerplate", "the caller validates", "tests will catch it", "internal function input is trusted"

**Worked example:** Empty `projectDir` caused `git init` in source code. All 4 layers added. 1847 tests passed.

**Pi porting:** Inline vào AGENTS.md (Section: "Defense-in-Depth Validation")

---

### 3. `incremental-implementation` (170 lines, đã đọc full)

**Frontmatter:**
- name: incremental-implementation
- description: "Use when implementing features or fixes to enforce thin vertical slices with verify-after-each..."
- tags: [workflow, implementation, code-quality]
- dependencies: [test-driven-development, verification-before-completion]

**Core (The Cycle):**
```
FOR each slice:
  1. IMPLEMENT (1-3 files max)
  2. VERIFY (typecheck + lint + relevant tests)
  3. COMMIT (checkpoint)
  4. NEXT

IF verify fails:
  Fix within current slice
  Do NOT proceed with broken code
```

**Slicing strategies:**
- Vertical slice (preferred): one thin path through full stack
- Contract-first: define interfaces, then implement behind them
- Risk-first: hardest part first

**Slice size guide:**
- 1-30 lines: Ideal
- 30-100 lines: Acceptable
- 100-200 lines: Too large
- 200+ lines: STOP (big-bang)

**Red flags:** >100 lines without verification, "I'll test after next part", 3+ files uncommitted, complex abstraction before simple version works

**Pi porting:** Inline vào AGENTS.md (Section: "Incremental Implementation")

---

### 4. `verification-before-completion` (250+ lines, đã đọc full)

**Frontmatter:**
- name: verification-before-completion
- description: "Use when about to claim work is complete, fixed, or passing, before committing or creating PRs..."
- tags: [workflow, code-quality]
- dependencies: []

**Iron Law:** `NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE`

**Gate function (5 steps):**
1. IDENTIFY command that proves claim
2. RUN full command (fresh, complete)
3. READ full output, check exit code, count failures
4. VERIFY output confirms claim
5. ONLY THEN make claim

**Diagnostic failure phrases (auto re-verify triggers):**
- "should work", "should resolve", "should be gone", "this will work"
- "fairly certain", "based on my understanding", "logic is sound"
- "just a minor change", "nothing else should be affected"
- "the error was probably just X", "that failure was likely a fluke"
- "all done", "done", "complete"

**Phantom completion detection:**
- Stub patterns: `return null`, `return undefined`, `return {}`, `return []`, `onClick={() => {}}`, `TODO`, `FIXME`, `placeholder`, `stub`, `not implemented`, `throw new Error("Not implemented")`
- Hardcoded fake responses: `Response.json({ok: true})`
- Debug-only: `console.log` as only function body

**3-level artifact verification:**
1. Exists: file present
2. Substantive: not stub/placeholder
3. Wired: connected, used by other files

**Phantom Score:** CLEAN (0 HIGH stubs) / SUSPECT (1-2 MEDIUM) / PHANTOM (any HIGH or >2 substantive failures)

**Enforcement gates:**
- Gate 1: Completion claims require `verify.log` PASS stamp
- Gate 2: Agent delegation requires post-verification (Worker Distrust Protocol)

**Pi porting:** Inline vào AGENTS.md (Section: "Verification Before Completion")

---

## C. Tier 2 Skills (55 files, ~50K lines) — ON-DEMAND

> **Status: 🟠 Long-tail content — chỉ port khi cần**

### Đầy đủ inventory (55 skills)

Tổng hợp từ `manifest.json` + inventory explore agent:

| # | Skill | Tier | Description (truncated) | Domain |
|---|-------|------|-------------------------|--------|
| 1 | accessibility-audit | 2 | WCAG compliance, keyboard nav, contrast | A11y |
| 2 | agent-code-quality-gate | 2 | Pre-completion quality gate for subagent work | Process |
| 3 | api-and-interface-design | 2 | REST/GraphQL/SDK contract, versioning | API |
| 4 | brainstorming | 2 | Refine ideas into designs before coding | Process |
| 5 | browser-testing-with-devtools | 2 | Live runtime browser verification (DOM, network) | Testing |
| 6 | chrome-devtools | 2 | DevTools Protocol UI inspection/screenshot | Tool |
| 7 | ci-cd-and-automation | 2 | CI/CD pipelines, GitHub Actions | DevOps |
| 8 | cloudflare | 2 | Cloudflare Workers/Pages/KV/D1/R2 (references/) | Platform |
| 9 | code-cleanup | 2 | Simplify noisy diffs after behavior locked | Process |
| 10 | code-review-and-quality | 2 | Reviews for correctness/security/maintainability | Process |
| 11 | core-data-expert | 2 | iOS/macOS Core Data (references/) | Platform |
| 12 | debugging-and-error-recovery | 2 | Root-cause debugging and safe recovery | Debug |
| 13 | deep-module-design | 2 | Ousterhout deep modules, small interfaces | Design |
| 14 | deprecation-and-migration | 2 | Deprecate APIs, plan breaking changes | Process |
| 15 | design-system-audit | 2 | Audit existing design systems | Design |
| 16 | design-taste-frontend | 2 | Base aesthetic layer to override LLM biases | Design |
| 17 | development-lifecycle | 2 | Brainstorm→design→spec→plan→implement→verify | Process |
| 18 | documentation-and-adrs | 2 | Technical docs, ADRs, READMEs | Docs |
| 19 | fallow | 2 | JS/TS codebase intelligence (references/) | Tool |
| 20 | figma | 2 | Figma → code via Framelink MCP | Tool |
| 21 | frontend-design | 2 | React + Tailwind v4 + shadcn/ui (references/) | Frontend |
| 22 | gemini-large-context | 2 | Gemini CLI 1M token window for large codebases | Tool |
| 23 | git-workflow-and-versioning | 2 | Atomic commits, branching, versioning | Git |
| 24 | grill-me | 2 | Adversarial interrogation of ideas pre-implementation | Process |
| 25 | high-end-visual-design | 2 | Premium/agency-quality visual design | Design |
| 26 | industrial-brutalist-ui | 2 | Brutalist/military-terminal aesthetics | Design |
| 27 | jira | 2 | Atlassian Jira/Confluence integration (mcp.json) | Tool |
| 28 | minimalist-ui | 2 | Clean/editorial/minimalist UI | Design |
| 29 | mockup-to-code | 2 | Mockups/screenshots/Figma → production code | Frontend |
| 30 | opensrc | 2 | Inspect library source beyond types/docs (references/) | Tool |
| 31 | pdf-extract | 2 | PDF text/image/table/metadata extraction | Tool |
| 32 | performance-optimization | 2 | Profiling, budgets, Core Web Vitals | Perf |
| 33 | planning-and-task-breakdown | 2 | Decompose spec into verifiable tasks | Process |
| 34 | playwright | 2 | Automated browser testing (references/, mcp.json) | Testing |
| 35 | polar | 2 | Polar payments/subscriptions/license keys | Platform |
| 36 | react-best-practices | 2 | Vercel React/Next.js performance patterns (rules/) | Frontend |
| 37 | redesign-existing-projects | 2 | Upgrade existing app visual design to premium | Design |
| 38 | resend | 2 | Transactional email + React Email templates (references/) | Platform |
| 39 | root-cause-tracing | 2 | Trace bugs backward through call stack | Debug |
| 40 | security-and-hardening | 2 | OWASP Top 10, auth, secrets, hardening | Security |
| 41 | shipping-and-launch | 2 | Final readiness, rollback planning, release handoff | Process |
| 42 | source-driven-development | 2 | Ground decisions in official docs/source | Process |
| 43 | spec-driven-development | 2 | Vague request → concrete spec before implementation | Process |
| 44 | srcwalk | 2 | Navigate code with srcwalk (maps, symbols, callers) | Tool |
| 45 | subagent-driven-development | 2 | Dispatch fresh subagent per task with review gates | Process |
| 46 | supabase | 2 | Supabase DB/auth/storage/edge functions (mcp.json) | Platform |
| 47 | supabase-postgres-best-practices | 2 | Supabase Postgres queries, schema, RLS, indexes (rules/) | Platform |
| 48 | swift-concurrency | 2 | Swift async/await, actors, Swift 6 migration (references/) | Platform |
| 49 | swiftui-expert-skill | 2 | SwiftUI state, performance, iOS 26 Liquid Glass (references/) | Platform |
| 50 | test-driven-development | 2 | RED-GREEN-REFACTOR for any feature/bugfix | Testing |
| 51 | testing-anti-patterns | 2 | Prevent mock-only tests, test pollution | Testing |
| 52 | using-git-worktrees | 2 | Isolated git worktrees for plan execution | Git |
| 53 | vercel-deploy-claimable | 2 | Vercel deployment with claimable preview URL (scripts/) | Platform |
| 54 | webclaw | 2 | Web scraping for 403/bot-protected sites | Tool |
| 55 | writing-skills | 2 | TDD for process documentation (skill authoring, references/) | Meta |

---

### Phân nhóm theo domain

**Process / Workflow (15 skills):**
- agent-code-quality-gate, brainstorming, code-cleanup, code-review-and-quality
- debugging-and-error-recovery, deprecation-and-migration, development-lifecycle
- grill-me, planning-and-task-breakdown, root-cause-tracing
- shipping-and-launch, source-driven-development, spec-driven-development
- subagent-driven-development, writing-skills

**Design / Frontend (10 skills):**
- accessibility-audit, deep-module-design, design-system-audit
- design-taste-frontend, frontend-design, high-end-visual-design
- industrial-brutalist-ui, minimalist-ui, mockup-to-code
- react-best-practices, redesign-existing-projects

**Testing (4 skills):**
- browser-testing-with-devtools, playwright, test-driven-development, testing-anti-patterns

**Tool Integration (9 skills):**
- chrome-devtools, figma, gemini-large-context, jira, opensrc, pdf-extract
- srcwalk, webclaw, fallow

**Platform-specific (10 skills):**
- cloudflare, core-data-expert, polar, resend, supabase
- supabase-postgres-best-practices, swift-concurrency, swiftui-expert-skill
- vercel-deploy-claimable, ci-cd-and-automation

**Performance / Security (3 skills):**
- performance-optimization, security-and-hardening, api-and-interface-design

**Git / Docs (4 skills):**
- documentation-and-adrs, git-workflow-and-versioning, using-git-worktrees, code-cleanup

---

### Đề xuất port theo ưu tiên

**Tier 2A — High value, generic (port ngay nếu cần):**
1. **test-driven-development** — RED-GREEN-REFACTOR, áp dụng mọi nơi
2. **root-cause-tracing** — Trace bugs backward, hữu ích cho `/fix`
3. **git-workflow-and-versioning** — Atomic commits, branching
4. **documentation-and-adrs** — Technical docs, ADRs (template từ opencodekit)
5. **code-review-and-quality** — Review checklist bổ sung cho `review` agent
6. **subagent-driven-development** — Pattern dispatch + review gates
7. **spec-driven-development** — Vague request → concrete spec
8. **brainstorming** — Refine ideas before coding

**Tier 2B — Domain-specific (port khi cần):**
- Frontend: frontend-design, react-best-practices, accessibility-audit
- Backend: supabase, supabase-postgres-best-practices, security-and-hardening
- API: api-and-interface-design
- Performance: performance-optimization

**Tier 2C — Niche / low ROI (skip trừ khi cần):**
- Platform-specific: cloudflare, polar, resend, vercel-deploy, core-data-expert, swift-concurrency, swiftui-expert-skill
- Design variants: industrial-brutalist-ui, minimalist-ui, high-end-visual-design
- Tools: figma, jira, gemini-large-context, webclaw, pdf-extract, opensrc
- Design processes: design-system-audit, design-taste-frontend, redesign-existing-projects

---

## D. Cấu trúc file của mỗi Skill

### Standard skill (single file)

```
skill/<name>/
└── SKILL.md         ← YAML frontmatter + markdown body
```

### Heavy skill (with references, rules, scripts)

```
skill/<name>/
├── SKILL.md
├── references/      ← detailed docs loaded on-demand
│   ├── example1.md
│   ├── example2.md
│   └── ...
├── rules/           ← (rare) auto-loadable rule files
│   └── ...
├── scripts/         ← (rare) executable scripts
│   └── ...
└── mcp.json         ← (rare) MCP server config
```

**Inventory của supporting folders:**

| Skill | references/ | rules/ | scripts/ | mcp.json |
|---|---|---|---|---|
| cloudflare | ✓ | | | |
| core-data-expert | ✓ | | | |
| fallow | ✓ | | | |
| frontend-design | ✓ | | | |
| opensrc | ✓ | | | |
| playwright | ✓ | | ✓ | ✓ |
| react-best-practices | | ✓ | | |
| resend | ✓ | | | |
| supabase-postgres-best-practices | | ✓ | | |
| swift-concurrency | ✓ | | | |
| swiftui-expert-skill | ✓ | | | |
| vercel-deploy-claimable | | | ✓ | |
| verification-before-completion | ✓ | | | |
| writing-skills | ✓ | | | |
| jira | | | ✓ | ✓ |
| supabase | | | ✓ | ✓ |
| chrome-devtools | | | ✓ | |

**Cấu trúc SKILL.md (writing-skills convention):**

```markdown
---
name: <name>
description: <"Use when...">
...

# <Name>

> <One-line summary / Replaces X>

## When to Use
- <trigger 1>
- <trigger 2>

## When NOT to Use
- <anti-trigger>

## Common Rationalizations
| Rationalization | Rebuttal |
|---|---|
| "..." | ... |

## Overview
<Core concept>

## Core Pattern
<The main technique>

## Implementation
<Step-by-step>

## Common Mistakes
<Anti-patterns>

## Real-World Impact (optional)
<Case study>
```

**TDD for skills (writing-skills philosophy):**
- "Writing skills IS Test-Driven Development applied to process documentation"
- Iron Law: `NO SKILL WITHOUT A FAILING TEST FIRST`
- Test case = pressure scenario with subagent
- Production code = SKILL.md
- RED = baseline violation, GREEN = agent complies, REFACTOR = close loopholes

---

## E. Mapping Skills → Pi

### Hiện trạng

`.pi/agent/agents/*.md` đã chứa một số skill content inline:
- `explore.md` có "Read-only is a hard constraint" (từ verification-before-completion)
- `general.md` có "Make the smallest complete change" (từ behavioral-kernel)
- `plan.md` có goal-backward methodology (liên quan incremental-implementation)

Nhưng **không có systematic skill loading**. Khi task liên quan đến a11y audit, agent không tự động load `accessibility-audit` skill.

### Option 1: Inline Tất Cả Skills Vào AGENTS.md (Đơn giản, không scale)

Pros: 0 infrastructure
Cons: AGENTS.md sẽ thành 50K+ lines, không manageable

### Option 2: Tạo `pi-skills` Extension (Recommended, scale được)

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-skills/`
**Implementation:** ~200 lines TS

**Core logic:**
```typescript
// Pseudo-code
function loadSkill(name: string, ctx: ToolContext) {
  const skillPath = path.join(skillsDir, name, 'SKILL.md');
  const { frontmatter, body } = parseMarkdown(skillPath);
  
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    content: body,
    references: loadReferences(name, ctx.args.references ?? false)
  };
}

// Tool: load_skill
tool({
  name: 'load_skill',
  description: 'Load a skill by name',
  args: {
    name: z.string(),
    with_references: z.boolean().default(false)
  },
  handler: (args) => loadSkill(args.name, { with_references: args.with_references })
})

// Hook: before_agent_start
'before_agent_start': async (input) => {
  // Tier 1: auto-load always
  const tier1Skills = ['behavioral-kernel', 'defense-in-depth', 'incremental-implementation', 'verification-before-completion'];
  
  // Detect Tier 2 skills from user prompt
  const detected = detectSkills(input.prompt, tier2Keywords);
  
  // Inject into system prompt
  const allSkills = [...tier1Skills, ...detected];
  const skillContent = allSkills.map(s => loadSkill(s)).join('\n\n---\n\n');
  return { system: `${baseSystem}\n\n${skillContent}` };
}
```

**Skill detection:** Use keyword matching (e.g., "accessibility" → load `accessibility-audit`, "test-driven" → load `test-driven-development`)

### Option 3: Manual Skill Loading via slash command

Tạo `/skill <name>` slash command:
```
/skill test-driven-development
→ Loads + injects SKILL.md into current context
```

**Effort:** 1-2 giờ (rất nhỏ)
**Value:** Medium (user phải nhớ tên skill + tự load)

### Recommendation

**Option 3 (manual) + Tier 1 inline AGENTS.md** = best ROI cho Phase 1:
- Tier 1: inline vào AGENTS.md (auto-load) — 4 skills
- Tier 2: `/skill <name>` command — 55 skills available on-demand
- Phase 3 (optional): Build `pi-skills` extension với auto-detection

---

## F. Tier 1 Skills — Nội dung đầy đủ để inline vào AGENTS.md

> Phần này dành cho implementation. Copy nội dung sau vào `/Users/minhduydev/.pi/agent/AGENTS.md` Phase 1.

### Section: Behavioral Kernel

> Source: `.opencode/skill/behavioral-kernel/SKILL.md` (80 lines)

```markdown
## Behavioral Kernel

A short reset section for non-trivial work when the larger prompt is getting noisy.

### Kernel (4 nguyên tắc)

1. **Clarify before committing** — surface assumptions or ask instead of silently choosing
2. **Choose the smallest working change** — solve today's problem directly before inventing flexibility
3. **Keep diffs surgical** — change only what the request requires; log unrelated issues
4. **Define proof before acting** — say how success will be verified BEFORE implementation

### Drift signals — STOP and reload

- adding abstraction for a single use case
- changing adjacent code "while you're here"
- postponing verification until the end
- claiming completion without a named proof path
- silently picking one interpretation from multiple valid readings

### Recovery move

1. Re-state the request in one sentence
2. Re-state the smallest working change
3. Re-state the proof path
4. Delete or avoid anything outside that boundary
```

### Section: Defense-in-Depth Validation

> Source: `.opencode/skill/defense-in-depth/SKILL.md` (200 lines, condensed to essentials)

```markdown
## Defense-in-Depth Validation

When a bug is caused by invalid data, single validation is bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

### 4 Layers

- **Layer 1: Entry Point** — reject invalid input at API boundary
- **Layer 2: Business Logic** — ensure data makes sense for operation
- **Layer 3: Environment Guards** — prevent dangerous ops in specific contexts
- **Layer 4: Debug Instrumentation** — capture context for forensics

### Rationalization rebuttals

| Rationalization | Rebuttal |
|---|---|
| "One validation at the entry point is enough" | Different code paths, refactors, mocks all bypass single gate |
| "This adds too much boilerplate" | Each validation is 2-3 lines. The bug it prevents costs hours |
| "The caller already validates this" | You don't control the caller. New callers won't know your assumptions |
| "Tests will catch it" | Tests run after the fact. Validation prevents the bug from existing |
| "This is internal, input is trusted" | Internal functions get called from new paths during refactors |

### Anti-patterns

- Single-layer validation (trusting downstream) — alternate paths bypass
- Duplicating identical validation at every layer — creates noise
- Catching and swallowing errors silently — hides failures
- Mixing validation with business logic — hard to reason about
```

### Section: Incremental Implementation

> Source: `.opencode/skill/incremental-implementation/SKILL.md` (170 lines, condensed)

```markdown
## Incremental Implementation

**Core principle:** Working code at every step. Never be more than one slice away from a green build.

### The Cycle

```
FOR each slice:
  1. IMPLEMENT (1-3 files max)
  2. VERIFY (typecheck + lint + relevant tests)
  3. COMMIT (checkpoint)
  4. NEXT

IF verify fails:
  Fix within the current slice before moving on
  Do NOT proceed with broken code
```

### Slicing strategies

- **Vertical slice (preferred):** one thin path through full stack
- **Contract-first:** define interfaces, then implement behind them
- **Risk-first:** hardest/most uncertain part first

### Slice size guide

- 1-30 lines: Ideal
- 30-100 lines: Acceptable
- 100-200 lines: Too large
- 200+ lines: STOP (big-bang)

### Red flags

- >100 lines without running verification
- "I'll test this after I finish the next part"
- 3+ files with uncommitted changes
- Complex abstraction before simple version works
- Skipping verification because "this slice is trivial"

### Scope discipline

Each slice does ONE thing. If you notice something else that needs fixing:

```
NOTICED BUT NOT TOUCHING: [description of unrelated improvement]
```

Log it and continue with the current slice.
```

### Section: Verification Before Completion

> Source: `.opencode/skill/verification-before-completion/SKILL.md` (250+ lines, condensed to essentials)

```markdown
## Verification Before Completion

**Iron Law:** `NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE`

If you haven't run the verification command in this message, you cannot claim it passes.

### Gate function (5 steps)

1. **IDENTIFY:** What command proves this claim?
2. **RUN:** Execute the FULL command (fresh, complete)
3. **READ:** Full output, check exit code, count failures
4. **VERIFY:** Does output confirm the claim?
   - NO: State actual status with evidence
   - YES: State claim WITH evidence
5. **ONLY THEN:** Make the claim

Skip any step = lying, not verifying.

### Diagnostic failure phrases (auto re-verify triggers)

**Completion claims without evidence:**
- "should fix it", "should resolve", "should be gone"
- "this will work", "it's fixed", "everything looks good"
- "we're all set"

**Confidence substitution:**
- "fairly certain", "based on my understanding"
- "logic is sound", "follows the pattern"

**Deflection / minimization:**
- "just a minor change", "nothing else should be affected"
- "no side effects expected"

**False completion:**
- "all done", "done", "complete"
- "ready for review" (without verification output)

**Rule:** If any of these phrases appear in your draft response, delete them and replace with actual verification command output.

### Phantom completion detection

Scan modified files for stub patterns:
- `return null` / `return undefined` / `return {}` / `return []`
- `onClick={() => {}}` (no-op handler)
- `TODO` / `FIXME` / `placeholder` / `stub` / `not implemented`
- `throw new Error("Not implemented")`
- Hardcoded fake responses: `Response.json({ok: true})`

### 3-level artifact verification

For each file in PRD `Affected Files`:

| Level | Check | How |
|---|---|---|
| **1: Exists** | File present | `ls path/to/file.ts` |
| **2: Substantive** | Not stub/placeholder | grep for TODO/FIXME/return null/placeholder |
| **3: Wired** | Connected, used | grep for `import.*ExportName` to verify other files import/use it |

### Phantom Score

| Score | Criteria | Action |
|---|---|---|
| **CLEAN** | 0 HIGH stubs, all artifacts Level 3 | Proceed |
| **SUSPECT** | 1-2 MEDIUM stubs OR 1 artifact not Level 3 | Report, ask user |
| **PHANTOM** | Any HIGH stubs OR >2 artifacts not substantive | **BLOCK** — fix before completion |

### Verification checklist (must be fresh in current message)

- [ ] Identified exact command that proves claim
- [ ] Ran full command (fresh)
- [ ] Read full output and exit code
- [ ] Confirmed output matches claim
- [ ] Only then stated completion claim with evidence
```

---

## G. Tổng kết

| Action | Effort | Value | Priority |
|---|---|---|---|
| Inline 4 Tier-1 skills vào AGENTS.md | 2-3 giờ | 🟢 Rất cao | **Phase 1** |
| Tạo `/skill <name>` command | 1-2 giờ | 🟡 Medium (manual loading) | **Phase 2A** |
| Port Tier 2A (8 high-value skills) | 1-2 ngày | 🟡 Medium (chỉ khi cần) | **Phase 3** |
| Build `pi-skills` extension (auto-detect) | 3-5 ngày | 🟠 Lower (complex infra) | **Phase 3** |
| Port Tier 2B/2C (47 niche skills) | Tùy nhu cầu | 🟠 Low | **Skip** |
