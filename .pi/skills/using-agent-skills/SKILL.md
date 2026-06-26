---
name: using-agent-skills
description: "Meta-skill for discovering and routing to the right skill. Auto-load when editing .pi/skills/ or when user asks 'which skill' / 'what should I use' / 'how do I do X'. Use when starting a session, when task phase changes, or when intent is ambiguous. Provides routing tree, multi-skill composition (pipeline/parallel/compose), disambiguation protocol, and fallback behavior."
---

# Using Agent Skills

## Overview

Agent Skills is a collection of 67 engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for your current task.

## When to Use

- Starting a session and unsure which skill applies
- Task phase changes (Define → Plan → Build → Verify → Ship)
- Intent is ambiguous across multiple candidate skills
- You are editing `.pi/skills/*/SKILL.md` (auto-load trigger)
- User asks "which skill", "what should I use", "how do I do X"

## When NOT to Use

- A single skill clearly matches the task — load it directly instead of routing
- The task is too small to warrant any skill (trivial one-liner)
- You need the deep content of a specific skill — jump straight to it; this skill only routes

---

## Skill Discovery (Routing Tree)

When a task arrives, identify the development phase and apply the corresponding skill:

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ brainstorming
    ├── Have a rough concept, need structure? → spec-driven-development
    ├── New project/feature/change? ─────────→ spec-driven-development
    ├── Have a spec, need tasks? ────────────→ planning-and-task-breakdown
    ├── Implementing code? ──────────────────→ incremental-implementation
    │   ├── UI work? ────────────────────────→ frontend-design
    │   │   ├── Need aesthetic baseline? ────→ design-taste-frontend
    │   │   ├── Premium/luxury look? ────────→ high-end-visual-design
    │   │   ├── Minimalist? ────────────────→ minimalist-ui
    │   │   └── Brutalist/industrial? ──────→ industrial-brutalist-ui
    │   ├── API work? ───────────────────────→ api-and-interface-design
    │   ├── React/Next.js specific? ─────────→ react-best-practices
    │   ├── Module design/structure? ────────→ deep-module-design
    │   ├── Need better context? ────────────→ context-engineering
    │   ├── Need doc-verified code? ─────────→ source-driven-development
    │   └── Stakes high / unfamiliar code? ──→ doubt-driven-development
    ├── Writing/running tests? ──────────────→ test-driven-development
    │   ├── Avoiding test anti-patterns? ────→ testing-anti-patterns
    │   └── Browser-based testing? ──────────→ browser-testing-with-devtools | playwright
    ├── Something broke? ────────────────────→ debugging-and-error-recovery
    │   └── Need to trace root cause? ───────→ root-cause-tracing
    ├── Reviewing code? ─────────────────────→ code-review-and-quality
    │   ├── Too complex? ────────────────────→ code-simplification | code-cleanup
    │   ├── Security concerns? ─────────────→ security-and-hardening
    │   └── Performance concerns? ───────────→ performance-optimization
    ├── Committing/branching? ───────────────→ git-workflow-and-versioning
    │   └── Need isolated workspace? ────────→ using-git-worktrees
    ├── CI/CD pipeline work? ────────────────→ ci-cd-and-automation
    ├── Deprecating/migrating? ──────────────→ deprecation-and-migration
    ├── Writing docs/ADRs? ──────────────────→ documentation-and-adrs
    ├── Adding logs/metrics/alerts? ─────────→ observability-and-instrumentation
    ├── Deploying/launching? ────────────────→ shipping-and-launch
    │   ├── To Cloudflare? ──────────────────→ cloudflare
    │   └── To Vercel? ──────────────────────→ vercel-deploy-claimable
    ├── Working with Supabase? ─────────────→ supabase | supabase-postgres-best-practices
    ├── Sending emails? ────────────────────→ resend
    ├── Handling payments? ──────────────────→ polar
    ├── Figma/mockup to code? ───────────────→ figma → mockup-to-code → frontend-design
    ├── Accessibility audit? ────────────────→ accessibility-audit
    ├── Creating/editing skills? ────────────→ writing-skills
    ├── Codebase health check? ──────────────→ fallow
    └── Large codebase analysis? ────────────→ gemini-large-context
```

---

## Multi-Skill Composition

Not every task fits one skill. Use these composition patterns to combine skills effectively:

### Sequential Pipeline (`→`)
Execute skills in order — each phase's output feeds the next. Typical for full features.

```
brainstorming → spec-driven-development → planning-and-task-breakdown → incremental-implementation → test-driven-development → code-review-and-quality → shipping-and-launch
```

### Parallel Load (`+`)
Load multiple skills simultaneously when concerns are independent. Reduces context round-trips.

```
# Code review from multiple angles
code-review-and-quality + performance-optimization + security-and-hardening

# UI with accessibility
frontend-design + design-taste-frontend + accessibility-audit

# Database work
supabase + supabase-postgres-best-practices
```

### Compose (Pipeline + Parallel)
Mix sequential phases with parallel execution within each phase.

```
Phase 1 (Define):    brainstorming + spec-driven-development          [parallel]
Phase 2 (Plan):      planning-and-task-breakdown                       [sequential]
Phase 3 (Build):     incremental-implementation + test-driven-development  [parallel]
Phase 4 (Review):    code-review-and-quality + code-simplification     [parallel]
Phase 5 (Ship):      verification-before-completion → shipping-and-launch  [sequential]
```

### Conditional (`|`)
Pick one based on context. The agent evaluates and selects the best fit.

```
# Hosting
cloudflare | vercel-deploy-claimable

# Testing tool
playwright | chrome-devtools | browser-testing-with-devtools

# Visual style
high-end-visual-design | minimalist-ui | industrial-brutalist-ui

# Code quality
code-simplification | code-cleanup
```

---

## Risk Gating

Skills have risk levels that determine invocation behavior:

| Risk | Meaning | Auto-invoke? | Examples |
|------|---------|-------------|----------|
| **Low** | Safe — reads code, provides guidance, no side effects | Yes, automatically | `brainstorming`, `srcwalk`, `documentation-and-adrs`, `code-simplification` |
| **Medium** | Writes code, modifies files — verify before committing | Auto-load but confirm writes | `test-driven-development`, `frontend-design`, `git-workflow-and-versioning` |
| **High** | Infrastructure, deployment, payments, security — requires user approval | Manual invoke only | `shipping-and-launch`, `cloudflare`, `polar`, `security-and-hardening`, `deprecation-and-migration` |

**Rule**: High-risk skills must have `user-invocable: true` (user types `/skill` explicitly). Never auto-invoke a High-risk skill.

---

## Disambiguation Protocol

When intent maps to **multiple candidate skills** and none is clearly the best match:

```
1. Narrow by Phase
   ├── Is the task in Define, Plan, Build, Verify, Review, or Ship phase?
   └── Filter to skills matching that phase.

2. Narrow by Risk
   ├── Prefer lower-risk skills for exploration/analysis tasks.
   └── Only involve High-risk skills when the task explicitly requires infrastructure changes.

3. Check File Context
   ├── What files are currently open or being edited?
   └── Does a File Match trigger point to a specific skill?

4. Count Keyword Overlap
   ├── Which skill's description has the most keyword matches with the user's request?
   └── Highest overlap wins.

5. Check Composition
   ├── Can the skills compose? (See Composition section above)
   └── If complementary, load both in parallel.

6. STILL ambiguous? → Ask ONE question:
   "I see [Skill A] and [Skill B] could apply here.
    [Skill A] handles [X concern]. [Skill B] handles [Y concern].
    Which fits better for this task?"

   Do NOT guess. Do NOT load all candidates speculatively.
```

---

## Fallback Behavior

When no skill matches the user's intent:

```
1. Check Quick Routing Table in .pi/skills/INDEX.md
   └── User intent might be phrased differently than expected.

2. Try behavioral-kernel
   └── If the issue is about process, methodology, or "how to approach"

3. Try using-agent-skills (this skill)
   └── Re-run the routing tree with fresh interpretation of user intent.

4. Surface to user:
   "I don't have a specific skill for [task]. I can:
    a) Handle this without a skill (general approach)
    b) Help you create a new skill for this pattern (→ writing-skills)
    c) Point you to relevant documentation
    Which would you prefer?"

5. Skill gap detected?
   └── Flag for future skill creation. Common repeated gaps should become new skills.
```

---

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

---

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

---

## Skill Rules

1. **Check INDEX.md first.** The Quick Routing Table in `.pi/skills/INDEX.md` provides intent → skill mappings. Use it before running the routing tree.

2. **File Match > Keyword Match > Intent Match.** The strongest routing signal is the file being edited. Second is the user's explicit keywords. Third is inferred intent.

3. **Skills are workflows, not suggestions.** Follow the steps in order. Don't skip verification steps.

4. **Multiple skills can apply.** Use composition patterns (Pipeline, Parallel, Compose, Conditional) — don't force one-skill-per-task.

5. **When in doubt, start with a spec.** If the task is non-trivial and there's no spec, begin with `spec-driven-development`.

6. **High-risk = manual invoke only.** Shipping, deployment, security, and payment skills require explicit user invocation. Never auto-load them.

---

## Lifecycle Sequence

For a complete feature, the typical skill sequence is:

```
1.  brainstorming               → Extract and refine what the user actually wants
2.  spec-driven-development      → Define what we're building
3.  planning-and-task-breakdown  → Break into verifiable chunks
4.  context-engineering          → Load the right context
5.  source-driven-development    → Verify against official docs
6.  incremental-implementation   → Build slice by slice
7.  observability-and-instrumentation → Instrument as you build (runs parallel with 6-8)
8.  doubt-driven-development     → Cross-examine non-trivial decisions in-flight
9.  test-driven-development      → Prove each slice works
10. code-review-and-quality      → Review before merge
11. code-simplification          → Reduce complexity while preserving behavior
12. git-workflow-and-versioning  → Clean commit history
13. documentation-and-adrs       → Document decisions
14. deprecation-and-migration    → Retire old systems safely when needed
15. shipping-and-launch          → Deploy safely
```

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

---

## Quick Reference

| Phase | Skill | Risk | One-Line Summary |
|-------|-------|------|-----------------|
| Define | brainstorming | Low | Surface what the user actually wants before any plan, spec, or code exists |
| Define | spec-driven-development | Low | Requirements and acceptance criteria before code |
| Define | grill-me | Low | Adversarial interrogation of ideas before implementation |
| Plan | planning-and-task-breakdown | Low | Decompose into small, verifiable tasks |
| Plan | source-driven-development | Low | Verify against official docs before implementing |
| Build | incremental-implementation | Low | Thin vertical slices, test each before expanding |
| Build | doubt-driven-development | Medium | Adversarial fresh-context review of every non-trivial decision |
| Build | context-engineering | Low | Right context at the right time |
| Build | frontend-design | Medium | Production-quality UI with accessibility |
| Build | api-and-interface-design | Medium | Stable interfaces with clear contracts |
| Build | deep-module-design | Low | Deep modules with small interfaces |
| Verify | test-driven-development | Medium | Failing test first, then make it pass |
| Verify | browser-testing-with-devtools | Medium | Chrome DevTools for runtime verification |
| Verify | debugging-and-error-recovery | Medium | Reproduce → localize → fix → guard |
| Verify | root-cause-tracing | Medium | Trace backward through call stack to origin |
| Review | code-review-and-quality | Medium | Multi-axis review with quality gates |
| Review | code-simplification | Low | Preserve behavior while reducing unnecessary complexity |
| Review | security-and-hardening | High | OWASP prevention, input validation, least privilege |
| Review | performance-optimization | Medium | Measure first, optimize only what matters |
| Review | accessibility-audit | Medium | WCAG conformance, keyboard nav, color contrast |
| Ship | git-workflow-and-versioning | Medium | Atomic commits, clean history |
| Ship | ci-cd-and-automation | High | Automated quality gates on every change |
| Ship | deprecation-and-migration | High | Remove old systems and migrate users safely |
| Ship | documentation-and-adrs | Low | Document the why, not just the what |
| Ship | observability-and-instrumentation | Medium | Structured logs, RED metrics, traces, alerts |
| Ship | shipping-and-launch | High | Pre-launch checklist, monitoring, rollback plan |

## Common Rationalizations

These are the excuses agents reach for when skipping skill-discovery, and why this skill's routing logic rebuts each one:

| Rationalization | Reality |
|-----------------|--------|
| "I'll just handle it without a skill" | Skills encode senior-engineer process, not optional fluff. Skipping one means reinventing its steps ad hoc and usually dropping the verification gate. The Routing Tree exists because every phase has a correct skill — `When to Use` triggers when intent is ambiguous, so "no skill" is rarely the right answer. |
| "Loading skills wastes tokens" | A skill load costs hundreds of tokens; a wrong approach costs a full rework cycle. Routing first via the INDEX.md Quick Routing Table is the cheapest path — it is one lookup before any code is written. Skimping on discovery to save tokens is false economy. |
| "I'll guess which skill" | Guessing bypasses the File Match > Keyword Match > Intent Match priority (Skill Rule 2) and the Decision Tree. Guessing is the #1 way to land in the wrong phase — e.g. jumping to `incremental-implementation` when `spec-driven-development` was required because there is no spec yet. |
| "The task is small, no skill needed" | `When NOT to Use` exempts only trivial one-liners. If a skill clearly matches, Skill Rule says load it directly — "small" is not an exemption. A "small" change that touches tests, security, or git hygiene still needs `test-driven-development` / `security-and-hardening` / `git-workflow-and-versioning`. |
| "I know this codebase, I'll pick from memory" | The kit drifts — 67 skills now, more added over time. Routing from memory skips INDEX.md updates and the composition patterns, and silently violates Skill Rule 1 ("Check INDEX.md first"). Always re-check INDEX.md; memory is not a routing source. |
| "Multiple skills match, I'll load all of them" | Speculative multi-load bloats context and dilutes guidance with conflicting steps. The Disambiguation Protocol (step 6) is explicit: narrow by phase → risk → file context → keyword overlap → composition, and if STILL ambiguous ask ONE question. Do NOT load all candidates speculatively. |
| "Intent is obvious, I'll skip the Decision Tree" | "Obvious" is exactly where hidden assumptions live. The Routing Tree forces phase + risk narrowing before skill selection; skipping it is how you load `code-review-and-quality` for a task that actually needed `debugging-and-error-recovery` first. Obvious intent still gets a one-pass routing check. |

## Red Flags

Observable signs that skill-discovery is being violated — any of these means stop and re-run the routing tree:

1. **Handling a task whose keywords match a skill's `description` without ever reading that skill's SKILL.md** — you are operating on the description string alone, not the encoded process.
2. **Loading 3+ skills speculatively "just in case"** instead of running the Disambiguation Protocol — context bloat with no decision made.
3. **Ignoring the Routing Tree / Decision Tree when intent is ambiguous** and jumping straight to a familiar skill by name-recognition.
4. **Auto-invoking a High-risk skill** (`shipping-and-launch`, `cloudflare`, `polar`, `security-and-hardening`, `ci-cd-and-automation`, `deprecation-and-migration`) without an explicit user `/skill` invocation — violates the Risk Gating rule.
5. **Going straight to the Routing Tree without checking INDEX.md** Quick Routing Table first — violates Skill Rule 1 and misses the token-cheap intent → skill map.
6. **Picking a skill by name-recognition** rather than by File Match > Keyword Match > Intent Match priority — e.g. reaching for `code-simplification` when the open file is a test (should be `testing-anti-patterns`).
7. **Forcing one-skill-per-task** when the task clearly needs composition — e.g. UI work without pairing `frontend-design` + an aesthetic overlay + `fixing-accessibility`, or Supabase work without `supabase` + `supabase-postgres-best-practices`.
8. **Guessing when two candidates compete** instead of asking the ONE disambiguation question from step 6 — silence here is a silent assumption, the exact failure mode Core Operating Behavior #1 forbids.

## Verification

Before claiming the right skill was discovered and loaded for the task, confirm:

- [ ] **Named the match** — the single skill (or composed set) matched to the task is stated explicitly before any implementation work began, not retrofitted after the fact.
- [ ] **Checked INDEX.md first** — `.pi/skills/INDEX.md` Quick Routing Table was consulted (Skill Rule 1) before running the Routing Tree; the intent → skill row that matched is identifiable.
- [ ] **Applied routing priority** — File Match > Keyword Match > Intent Match (Skill Rule 2) was applied; the file/keyword/intent signal that decided the match is named, not just the skill name.
- [ ] **Consulted the Decision Tree when ambiguous** — when 2+ candidates competed, the Disambiguation Protocol was run (phase → risk → file context → keyword overlap → composition), not skipped.
- [ ] **Asked ONE question if still ambiguous** — if narrowing did not resolve the choice, exactly one clarifying question was asked (step 6); the agent did not guess and did not load all candidates speculatively.
- [ ] **Confirmed risk gating** — the chosen skill's risk level was checked; any High-risk skill was invoked only via explicit user `/skill`, never auto-loaded.

