---
name: development-lifecycle
description: Single-agent guide through the full feature development lifecycle (brainstorm → design → specify → plan → implement → verify). For parallel multi-agent execution, use the development-lifecycle-workflow instead.
---

# Development Lifecycle Guide (Single-Agent)

## When to Use

- Starting a new feature, migration, or refactor and need phase-by-phase guidance
- Working alone or with a single agent through the full lifecycle
- You want to load appropriate sub-skills at each stage

## When NOT to Use

- You need parallel multi-agent execution (use `development-lifecycle-workflow` instead)
- You are already mid-phase and only need a specific sub-skill
- The change is trivial and can skip the full lifecycle

## Overview

This skill guides a single agent through the complete feature development workflow, loading the appropriate sub-skills at each phase.

**Note:** For parallel multi-agent execution with specialized agents (scouts, reviewers, planners), use the `development-lifecycle-workflow` in `.pi/workflows/`.

**Use when:** Starting any new feature, migration, refactor, or significant change with a single agent.

**Announce at start:** "I'm using development-lifecycle to guide this work through all phases."

## The Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  IDEATION   │───>│   DESIGN    │───>│SPECIFICATION│───>│  PLANNING   │───>│IMPLEMENTATION│
│ brainstorming│   │  design.md  │    │   prd.md    │    │ plan.md +   │    │incremental- │
│             │   │             │    │  → spec.md  │    │ tasks.json  │    │implementation│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │                  │
                          └──────────────────┴──────────────────┴──────────────────┤
                                              │                                     ▼
                                    ┌─────────────────┐                   ┌─────────────┐
                                    │    RESEARCH     │                   │VERIFICATION │
                                    │   (optional)    │                   │verification-│
                                    │ /research cmd   │                   │before-      │
                                    └─────────────────┘                   │completion   │
                                                                          └─────────────┘
```

**Artifact chain (authoritative):** `spec.md` (PRD, high-level task outline) → `plan.md` (authoritative decomposition) → `tasks.json` (runtime mirror, derived from plan.md) → `progress.md` (append-only log).

**Note:** Research (`/research <topic>`) can happen at any phase when you need external information or deeper codebase understanding. It's not a sequential step but a parallel activity.

## Phase 1: Ideation (brainstorming)

### Phase 1 Checklist

- [ ] Load `brainstorming`
- [ ] Validate design with user
- [ ] Write `.pi/artifacts/<slug>/design.md`

**When:** You have a rough idea but need to explore and refine it.

**Entry criteria:** User has an idea or problem to solve.

**Process:**

1. Understand current project context
2. Ask questions one at a time (prefer multiple choice)
3. Explore 2-3 approaches with trade-offs
4. Present design in 200-300 word sections

**Exit criteria:**

- Design validated by user
- Output: `.pi/artifacts/<slug>/design.md`

**Template:** `.pi/templates/design.md`

---

## Phase 2: Specification (spec-driven-development)

### Phase 2 Checklist

- [ ] Confirm or create plan context
- [ ] Ask clarifying questions
- [ ] Write `.pi/artifacts/<slug>/spec.md`

**When:** Design is validated, need formal requirements and a high-level task outline.

**Entry criteria:** Design document exists and is validated.

**Process:**

1. Confirm or create plan context
2. Ask clarifying questions (5-7 max)
3. Explore codebase patterns and constraints
4. Write PRD with a high-level Tasks outline (do NOT generate tasks.json here — that is Phase 3's job)

**Exit criteria:**

- PRD with all sections completed
- Output: `.pi/artifacts/<slug>/spec.md`

**Template:** `.pi/templates/prd.md`

---

## Phase 3: Planning (planning-and-task-breakdown)

### Phase 3 Checklist

- [ ] Load `planning-and-task-breakdown`
- [ ] Read spec from `.pi/artifacts/<slug>/spec.md`
- [ ] Decompose into bite-sized tasks with exact file paths + TDD steps
- [ ] Write `.pi/artifacts/<slug>/plan.md` (authoritative)
- [ ] Derive `.pi/artifacts/<slug>/tasks.json` (runtime mirror)
- [ ] Ensure `.pi/artifacts/<slug>/progress.md` exists (append-only log)

**When:** Spec is complete, need detailed executable task decomposition.

**Entry criteria:** `spec.md` exists at `.pi/artifacts/<slug>/spec.md`.

**Process:**

1. Read the PRD and extract the high-level Tasks outline
2. Decompose each outline item into bite-sized steps (2-5 min each) with exact file paths, complete code, TDD order, and verification commands
3. Write `plan.md` (authoritative decomposition)
4. Derive `tasks.json` from `plan.md` (runtime format consumed by execution)
5. Initialize `progress.md` for cross-iteration memory

**Exit criteria:**

- `plan.md` and `tasks.json` created and in sync
- `progress.md` initialized
- Output: `.pi/artifacts/<slug>/plan.md`, `.pi/artifacts/<slug>/tasks.json`, `.pi/artifacts/<slug>/progress.md`

**Template:** `.pi/templates/tasks.md` (task body structure), `.pi/templates/progress.md` (progress format)

---

## Phase 4: Implementation (incremental-implementation)

### Phase 4 Checklist

- [ ] Load `incremental-implementation` (+ `test-driven-development` for TDD tasks)
- [ ] Load and review `plan.md`
- [ ] Execute in thin vertical slices with verify-after-each
- [ ] Report for feedback between batches

**When:** Plan is ready, time to build.

**Entry criteria:** `plan.md` exists at `.pi/artifacts/<slug>/plan.md`.

**Process:**

1. Load and review plan critically
2. Execute in 3-task batches (thin vertical slices)
3. For TDD tasks: write failing test → verify fail → implement → verify pass → commit
4. Run each task's verification commands before proceeding
5. Append progress to `progress.md` after each task
6. Stop on blockers, don't guess

**Exit criteria:**

- All tasks completed
- All per-task verifications pass
- Ready for final verification

---

## Phase 5: Verification (verification-before-completion)

### Phase 5 Checklist

- [ ] Load `verification-before-completion`
- [ ] Identify verification commands
- [ ] Run full verification suite
- [ ] Only then claim completion

**When:** Implementation complete, before claiming done.

**Entry criteria:** All implementation tasks marked complete.

**Process:**

1. IDENTIFY: What commands prove completion?
2. RUN: Execute full verification suite fresh
3. READ: Check output, count failures
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Claim completion

**Exit criteria:**

- All verification commands pass with evidence
- All tasks verified complete

---

## Phase Transitions

### Skipping Phases

For small changes, you can skip early phases:

- **Bug fix:** Skip to Phase 4 (implement directly with verification), or use `/fix`
- **Clear requirements:** Skip Phase 1, start at Phase 2
- **Simple refactor:** Skip to Phase 3 (plan) or Phase 4 (execute)

---

## Templates Reference

| Phase         | Template                 | Purpose                                  |
| ------------- | ------------------------ | ---------------------------------------- |
| Design        | `templates/design.md`    | Architecture decisions                   |
| Specification | `templates/prd.md`       | Requirements + high-level task outline    |
| Planning      | `templates/tasks.md`     | Detailed task body structure (for plan.md)|
| Progress      | `templates/progress.md`  | Append-only execution log                |
| Quick Ideas   | `templates/proposal.md`  | Lightweight change proposals             |

---

## Example Full Workflow

```
User: "I want to add a dark mode toggle"

1. IDEATION
   → skill({ name: "brainstorming" })
   → Questions about scope, triggers, persistence
   → Design decisions documented
   → Output: .pi/artifacts/<slug>/design.md

2. SPECIFICATION
   → skill({ name: "spec-driven-development" })
   → Full PRD with requirements + high-level task outline
   → Output: .pi/artifacts/<slug>/spec.md

3. PLANNING
   → skill({ name: "planning-and-task-breakdown" })
   → Bite-sized implementation steps (plan.md, authoritative)
   → Derive runtime tasks.json from plan.md
   → Initialize progress.md
   → Output: .pi/artifacts/<slug>/plan.md, tasks.json, progress.md

4. IMPLEMENTATION
   → skill({ name: "incremental-implementation" }) + test-driven-development (TDD tasks)
   → Execute in thin vertical slices with verify-after-each
   → All code written and committed

5. VERIFICATION
   → skill({ name: "verification-before-completion" })
   → Tests pass: [x]
   → Lint clean: [x]
   → Build succeeds: [x]
   → All gates pass: [x]
```

---

## Key Principles

1. **Phase-appropriate skills:** Load the right skill for each phase
2. **Evidence at every gate:** No phase transition without verification
3. **Templates guide structure:** Use templates for consistent output
4. **Plans track progress:** Every feature gets a plan + progress log
5. **Skip only when appropriate:** Small changes can skip early phases

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can skip the brainstorm phase for simple features" | "Simple" features often hide complexity. The brainstorm surfaces it. |
| "Testing can happen at the end" | End-to-end testing after 500 lines makes failures impossible to isolate. |
| "I'll document after shipping" | Documentation written after shipping is documentation never written. |
| "One pass through the lifecycle is enough" | Iteration is the lifecycle. Each round reveals new information. |

## Red Flags

- Skipping phases in the lifecycle without explicit justification
- Implementation starting before spec is approved
- Testing deferred to a later phase
- No verification checkpoint between phases
- Lifecycle treated as waterfall (single pass) instead of iterative