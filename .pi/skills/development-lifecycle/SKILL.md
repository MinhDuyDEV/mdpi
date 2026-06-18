---
name: development-lifecycle
description: Single-agent guide through the full feature development lifecycle (brainstorm → design → specify → plan → implement → verify). For parallel multi-agent execution, use the development-lifecycle-workflow instead.
---

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
│  IDEATION   │───>│   DESIGN    │───>│ SPECIFICATION│───>│   PLANNING  │───>│IMPLEMENTATION│
│ brainstorming│   │  design.md  │    │   prd.md    │    │  tasks.md   │    │executing-plans│
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

**Note:** Research (`/research <plan-id>`) can happen at any phase when you need external information or deeper codebase understanding. It's not a sequential step but a parallel activity.

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

## Phase 2: Specification (prd)

### Phase 2 Checklist

- [ ] Confirm or create plan context
- [ ] Ask clarifying questions
- [ ] Write `.pi/artifacts/<slug>/spec.md`

**When:** Design is validated, need formal requirements and task breakdown.

**Entry criteria:** Design document exists and is validated.

**Process:**

1. Confirm or create plan context
2. Ask clarifying questions (5-7 max)
3. Explore codebase patterns and constraints
4. Write PRD with machine-convertible Tasks section

**Exit criteria:**

- PRD with all sections completed
- Output: `.pi/artifacts/<slug>/spec.md`

**Template:** `.pi/templates/prd.md`

---

## Phase 3: Task Conversion (prd-task)

### Phase 3 Checklist

- [ ] Read PRD from `.pi/artifacts/<slug>/spec.md`
- [ ] Generate `.pi/artifacts/tasks.json`
- [ ] Ensure `.pi/artifacts/progress.txt` exists

**When:** PRD is complete, need executable task list.

**Entry criteria:** PRD exists at `.pi/artifacts/<slug>/spec.md`.

**Process:**

1. Read PRD and extract ## Tasks section
2. Convert to JSON format with dependencies
3. Create `.pi/artifacts/progress.txt` for cross-iteration memory

**Exit criteria:**

- JSON task file created
- Progress file initialized
- Output: `.pi/artifacts/tasks.json`, `.pi/artifacts/progress.txt`

---

## Phase 4: Planning (writing-plans)

### Phase 4 Checklist

- [ ] Create bite-sized tasks with exact file paths
- [ ] Include TDD steps and verification commands
- [ ] Write `.pi/artifacts/<slug>/plan.md`

**When:** Tasks defined, need detailed implementation instructions.

**Entry criteria:** Task list exists (tasks.json or tasks.md).

**Process:**

1. Create bite-sized steps (2-5 min each)
2. Include exact file paths, complete code
3. TDD: write failing test → verify fail → implement → verify pass → commit
4. Add verification commands for each step

**Exit criteria:**

- Detailed plan ready for execution
- Output: `.pi/artifacts/<slug>/plan.md`

**Template:** `.pi/templates/tasks.md` (for task structure reference)

---

## Phase 5: Implementation (executing-plans)

### Phase 5 Checklist

- [ ] Load and review plan
- [ ] Execute in batches with verification
- [ ] Report for feedback between batches

**When:** Plan is ready, time to build.

**Entry criteria:** Plan exists at `.pi/artifacts/<slug>/plan.md`.

**Process:**

1. Load and review plan critically
2. Execute in 3-task batches
3. Report for feedback between batches
4. Stop on blockers, don't guess

**Exit criteria:**

- All tasks completed
- All verifications pass
- Ready for final verification

---

## Phase 6: Verification (verification-before-completion)

### Phase 6 Checklist

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

- **Bug fix:** Skip to Phase 5 (implement directly with verification)
- **Clear requirements:** Skip Phase 1, start at Phase 2
- **Simple refactor:** Skip to Phase 4 (plan) or Phase 5 (execute)

---

## Templates Reference

| Phase         | Template                 | Purpose                       |
| ------------- | ------------------------ | ----------------------------- |
| Design        | `templates/design.md`   | Architecture decisions        |
| Specification | `templates/prd.md`      | Requirements + task breakdown |
| Planning      | `templates/tasks.md`    | Detailed task structure       |
| Quick Ideas   | `templates/proposal.md` | Lightweight change proposals  |

---

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
   → skill({ name: "prd" })
   → Full PRD with requirements
   → Tasks section for conversion
   → Output: .pi/artifacts/<slug>/spec.md

3. TASK CONVERSION
   → skill({ name: "prd-task" })
   → JSON task list with dependencies
   → Output: .pi/artifacts/tasks.json

4. PLANNING
   → skill({ name: "writing-plans" })
   → Bite-sized implementation steps
   → Output: .pi/artifacts/<slug>/plan.md

5. IMPLEMENTATION
   → skill({ name: "executing-plans" })
   → Execute in batches with feedback
   → All code written and committed

6. VERIFICATION
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
4. **Plans track progress:** Every feature gets a plan
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
