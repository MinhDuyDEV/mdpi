---
name: planning-and-task-breakdown
description: Decomposes a spec into small verifiable tasks with dependencies and acceptance checks. Use when a feature/change has a spec or clear goal and needs an executable implementation plan.
---

# Planning & Task Breakdown

## Overview

A good plan creates leverage for builders. It says what must become true, where to work, what not to touch, and how to prove success.

Core principle: plan backward from observable truths into artifacts, wiring, tasks, dependencies, and verification.

Decompose work into small, verifiable tasks with explicit acceptance criteria. Good task breakdown is the difference between an agent that completes work reliably and one that produces a tangled mess. This skill is the canonical active planning skill. It absorbs PRD-to-plan and writing-plans responsibilities.

## When to Use

- A spec or clear goal exists and implementation is non-trivial.
- Work spans multiple files, phases, or agents.
- Tasks need dependency ordering or parallelization decisions.
- You need a handoff artifact for worker agents.
- Multiple acceptance criteria or subsystems are involved.
- The work may span sessions and needs a durable record.

## When NOT to Use

- Single-file fixes that can be implemented directly.
- Requirements are still unclear; use `spec-driven-development` first.
- You are debugging an active failure; use `debugging-and-error-recovery`.
- The user only asked for a quick estimate or feasibility check.

## The Planning Process

### Step 1: Enter Plan Mode — Read-only

Read the spec, inspect the codebase, identify existing patterns, and map dependencies. Do NOT write implementation code. Read before you plan. Capture assumptions, unknowns, and constraints that could change the shape of the work.

### Step 2: Identify the Dependency Graph

Map what depends on what. Build foundations before features that rest on them. Mark risky unknowns and integration seams. Order matters. A dependency graph prevents you from discovering a blocker halfway through implementation.

### Step 3: Slice Vertically

Instead of building all DB, then all API, then all UI, build one complete feature path at a time. A vertical slice delivers a thin, working thread through the system — for example, creating one record end-to-end from UI through service to storage. Vertical slices produce end-to-end behavior and surface broken wiring early. Horizontal slices delay integration and hide problems until the end.

### Step 4: Write Tasks

Each task must include:

- **Description:** one-sentence goal.
- **Acceptance Criteria:** what must be true when done.
- **Verification:** command, test, or check that proves it.
- **Dependencies:** tasks that must finish first.
- **Files Likely Touched:** paths or search targets when known.
- **Estimated Scope:** XS / S / M / L / XL.

Be specific. "Update backend" is not a task; "Add `createUser` mutation resolver with input validation" is.

### Step 5: Order and Checkpoint

Arrange tasks so dependencies are satisfied. Every checkpoint should leave a working state. Insert checkpoints every 2-3 tasks or at phase boundaries. A checkpoint means the code passes tests and can be reviewed as a coherent unit.

## Workflow

1. Restate the goal and constraints.
2. Convert observable truths into required artifacts.
3. Identify required wiring between artifacts.
4. Mark key links most likely to break.
5. Decompose into vertical slices, not horizontal layers.
6. Limit each task to a small scope with exact files when known.
7. Add acceptance checks and verification commands to every task.
8. Build a dependency graph and execution order.
9. Create tracked tasks or write a plan artifact.

## Task Sizing Guidelines

| Size | Files | Example |
|------|-------|---------|
| XS | 1 | Add a validation rule |
| S | 1-2 | Add a new API endpoint |
| M | 3-5 | One feature slice |
| L | 5-8 | Multi-component feature |
| XL | 8+ | Too large — break it down |

Break down a task when any of the following is true:

- It will take more than one session.
- It has more than three acceptance criteria.
- It touches two or more independent subsystems.
- It likely touches more than five files.
- It mixes refactoring with behavior changes.

When in doubt, err toward smaller tasks. Small tasks are easier to verify, review, and recover from if they fail.

## Plan Document Template

A complete plan document should contain:

1. **Overview** — what the plan achieves and why.
2. **Architecture Decisions** — key choices and their rationale.
3. **Task List** — ordered tasks grouped into phases with checkpoints.
4. **Risks and Mitigations** — what could go wrong and how to handle it.
5. **Open Questions** — anything that must be resolved before implementation.

Keep the document focused. It is a contract for execution, not a design diary. Each phase should have a clear entry condition and exit criteria.

## Task Packet Template

```markdown
## Task N: [Name]

Goal: [one sentence]
Files in scope:
- [path]
Acceptance checks:
- [behavior] -> verify with [command/check]
Non-goals:
- [explicit exclusion]
Dependencies:
- [task id/name or none]
Review depth: targeted|standard|full
```

Use the packet template when handing work to a worker agent or when tracking tasks in a plan document.

## Slicing Rules

- Prefer vertical slices that produce end-to-end behavior.
- Put risky unknowns first.
- Do not mix refactors with feature behavior unless the refactor is required.
- If one task touches more than five files, split it.
- If a task needs architectural judgment, route to `planner`, not `worker`.
- Keep each task scoped to one coherent change.

## Parallelization Opportunities

| Type | Guidance |
|------|----------|
| Safe | Independent feature slices, tests, docs |
| Must be sequential | Migrations, shared state, dependency chains |
| Needs coordination | Shared API contracts (define the contract first) |

When parallelizing, document file ownership and integration points. Multiple agents assigned to overlapping files without sequencing is a red flag. Parallel work still needs a single source of truth for ordering.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go" | 10 minutes of planning saves hours of rework. |
| "The tasks are obvious" | Write them down anyway. Explicit tasks surface hidden dependencies. |
| "Planning is overhead" | Planning is the task. Implementation without a plan is just typing. |
| "I can hold it all in my head" | Context windows are finite. Written plans survive session boundaries. |
| "I'll make tasks as I go" | Hidden dependencies appear too late. Plan the graph first. |
| "Layer-by-layer is cleaner" | Horizontal layers delay integration and hide broken wiring. |
| "Acceptance criteria are obvious" | Workers need objective checks, not intent. |
| "One big task is simpler" | Big tasks are hard to review, rollback, and verify. |

## Red Flags

- Starting implementation without a written task list.
- Tasks named after vague activities like "update backend".
- Tasks that say "implement the feature" without acceptance criteria.
- No verification command or check per task.
- UI, API, and data work split so nothing works until the end.
- Multiple agents assigned to overlapping files without sequencing.
- Plan omits non-goals or rollback considerations.
- All tasks are XL-sized.
- The first task requires further planning to begin.

## Verification Checklist

- [ ] Every task has acceptance criteria.
- [ ] Every task has a verification step.
- [ ] Task dependencies are identified and ordered correctly.
- [ ] No task touches more than ~5 files.
- [ ] Checkpoints exist between major phases.
- [ ] The first task can be implemented without further planning.
- [ ] Key links are identified for reviewer verification.
- [ ] The human has reviewed and approved the plan.

## Skill Result Contract

```xml
<skill_result>
  <skill>planning-and-task-breakdown</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Plan/task packets include scope, dependencies, and verification</evidence>
  <artifacts>Task ids or plan file path</artifacts>
  <risks>Large tasks, unresolved dependencies, or none</risks>
</skill_result>
```

## Consolidated Planning Workflow

This is the canonical active planning skill. It absorbs PRD-to-plan and writing-plans responsibilities. Use `spec-driven-development` first when requirements are still unclear.

Plans should include:

- scope and non-goals;
- ordered tasks with dependencies;
- exact files or search targets when known;
- acceptance checks per task;
- review and verification gates;
- handoff details for subagents with zero assumed context.
