---
name: code-cleanup
description: Use after behavior is working but the diff is noisy, repetitive, over-complicated, or obviously AI-shaped - lock behavior first, then simplify the changed code and re-verify without expanding scope
---

# Code Cleanup

## When to Use

- Tests/build/typecheck already pass, but the changed code is clumsy
- A feature works, but the diff contains duplication, over-nesting, dead code, or awkward naming
- You want a final simplification pass before review or merge
- You encountered a "broken window" (messy code, bad pattern, dead comment) that needs boarding up

## When NOT to Use

- Behavior is still broken or unverified
- You are tempted to redesign architecture under the cover of "cleanup"
- The cleanup would spread into unrelated files
- You have not yet established how to prove nothing broke

## Core Principle

**Lock behavior first. Then simplify. Then re-verify.**

No cleanup claim counts unless the same verification still passes after the cleanup edits.

## Why Cleanup Matters: Software Entropy

Left unrepaired, every messy piece of code gives permission for the next one. This is the "broken windows" theory from *The Pragmatic Programmer*: a bad design, wrong decision, or poor code left in place signals that quality doesn't matter — and more broken windows follow.

AI agents accelerate this. A messy module invites the next AI to add more mess. A clean module with clear patterns invites the next AI to follow those patterns. Cleanup is not cosmetic — it's **entropy containment**. It's the difference between a codebase that decays with each AI pass and one that stabilizes.

**When full cleanup is impossible, board it up.** Add a comment marking the issue, stub out the dead path, isolate the bad code behind a clear boundary. The goal is to contain the damage so it doesn't spread, even if you can't fix it right now.

## Five Principles of Simplification

1. **Preserve Behavior** — The code must do exactly the same thing after cleanup. No semantic drift, no "while I'm here" fixes, no opportunistic refactors.
2. **Follow Conventions** — Match the existing style, naming, file organization, and patterns of the codebase. Consistency reduces cognitive load.
3. **Clarity Over Cleverness** — Prefer the readable, obvious solution. Remove one-liners that require a注释 to understand.
4. **Maintain Balance** — Do not chase purity into abstraction hell. Simpler is better, but over-abstracting is just a different kind of mess.
5. **Scope to What Changed** — Cleanup only the files and behavior directly touched by the current work. Adjacent code that happens to smell is someone else's change.

## Chesterton's Fence

Before removing or changing code, understand why it is there. A fence was put up for a reason; you may tear it down only when you know that reason. Search git history, ask in comments, read tests, or inspect callers. If the reason is unknowable, leave it alone or board it up with a clear marker — do not silently delete it.

## Cleanup Targets

Prefer cleanup that removes friction without changing behavior:

- delete dead branches, unused variables, stale comments
- collapse repeated logic when the abstraction is already obvious
- simplify conditionals and nesting
- improve names where the blast radius is small and verified
- remove AI-ish filler comments, duplicated guards, or ceremony
- **fix broken windows**: inconsistent patterns, dead TODOs, misnamed functions, formatting rot

Avoid:

- cross-system rewrites
- new abstractions with speculative value
- changing public APIs unless explicitly requested
- moving many files just because structure feels imperfect

## The Simplification Process

### 1. Understand Before Touching

Read the code until you can explain what it does and why. Identify inputs, outputs, side effects, tests, and callers. If the purpose is unclear, stop — cleanup is unsafe.

### 2. Identify Opportunities

Compare the code against the cleanup targets and simplification patterns below. Make a short, explicit list. Estimate the risk and blast radius of each change.

### 3. Apply Incrementally

Change one thing at a time. Run the smallest relevant verification after each change. If verification fails, revert immediately and reassess.

### 4. Verify

Re-run the exact verification suite that locked behavior. Cleanup is only complete when that suite passes unchanged.

## Process

### Phase 1: Lock Behavior

1. Identify the verification commands that prove the current behavior
2. Run them and save the baseline result
3. List the exact files that are eligible for cleanup

### Phase 2: Create a Cleanup Plan

Use a small table before editing:

| File | Smell | Planned simplification | Risk |
| ---- | ----- | ---------------------- | ---- |
| ...  | ...   | ...                    | ...  |

Rules:

- Prefer deletion over abstraction
- Prefer local simplification over shared utilities
- If risk is medium or higher, make smaller passes

### Phase 3: Simplify

Apply cleanup in small, reviewable edits:

1. Make one simplification
2. Re-run the relevant verification
3. Continue only if behavior remains locked

### Phase 4: Re-verify

Re-run the same commands used to lock behavior.

Minimum acceptable output:

- what was simplified
- what was deleted
- what verification was rerun
- any remaining ugly areas intentionally left alone

## Simplification Patterns

### Structural Complexity

| Smell | Safer simplification |
| ----- | -------------------- |
| Deep nesting | Early returns, guard clauses, or extraction |
| Long function doing many things | Extract well-named helpers, but only inside the changed file |
| Switch/if-ladder | Lookup table or polymorphism when existing patterns support it |
| Magic numbers/strings | Named constants that already exist in the file/module |
| Excessive defensive checks | Remove checks that are already guaranteed by callers or types |

### Naming

| Smell | Safer simplification |
| ----- | -------------------- |
| Single-letter variables outside loops | Descriptive names |
| `data`, `info`, `utils` | Names that reveal intent |
| Functions named after how they do it | Names that state what they return/do |
| Inconsistent terminology | Match the dominant vocabulary of the file |

### Redundancy

| Smell | Safer simplification |
| ----- | -------------------- |
| Copy-pasted blocks | Extract only if the abstraction is obvious and local |
| Duplicated guards | Centralize at the boundary or remove unreachable ones |
| Comments restating the code | Delete; keep comments that explain *why* |
| Dead imports, variables, branches | Delete after confirming with the compiler/linter |
| AI-ish filler (`// do something`, `// end of function`) | Delete |

## Rule of 500

A function, method, or component that exceeds roughly 500 logical characters (or 40–50 lines) deserves scrutiny. It is not an automatic crime, but it is a signal: the unit may be doing too much. Before splitting, prove you understand the behavior and that the split improves clarity without creating indirection.

## Language-Specific Guidance

### TypeScript

- Prefer `const` and literal union types over strings where appropriate.
- Remove redundant type annotations that the compiler already infers.
- Delete unused generic parameters and empty interfaces.
- Simplify `Promise.resolve` chains and `async` wrappers that add no value.
- Avoid `any` leaks; narrow types instead of broadening them during cleanup.

### Python

- Replace manual loops with comprehensions only when readability improves.
- Use dataclasses or named tuples for simple data carriers.
- Remove redundant `if x == True` and explicit `return None` at the end of functions.
- Prefer built-ins (`enumerate`, `zip`, `contextlib`) over custom machinery.

### React

- Split oversized components only when the split maps to a real UI boundary.
- Remove `useEffect`, `useMemo`, or `useCallback` that have no dependency-driven reason to exist.
- Inline trivial single-use helpers unless reuse is already present.
- Keep JSX flat; avoid nested ternary monsters — prefer early returns or helper components.

## Common Rationalizations

| Rationalization | Why it is wrong |
| --------------- | --------------- |
| "I'll just clean this up quickly while I'm here" | Expands scope and couples unrelated changes to the feature under test. |
| "It's only a rename" | Renames change call sites, imports, tests, and sometimes public APIs. Verify first. |
| "The tests don't cover this" | Then you cannot prove behavior was preserved. Add coverage or leave it. |
| "It's obviously dead code" | Prove it with compiler, linter, and runtime callers. Chesterton's Fence applies. |
| "This makes it more elegant" | Elegance is subjective. Clarity and passing tests are objective. |
| "I'll revert if it breaks" | Cleanup mixed with feature work is hard to revert cleanly. Do cleanup after the feature is locked. |

## Red Flags

Stop and escalate if any of these appear during cleanup:

- The change requires updating tests because the tests were testing the old shape rather than behavior
- You find yourself rewriting public types, contracts, or APIs
- Cleanup is touching more than twice as many files as the original change
- You cannot name the exact verification command that proves nothing broke
- You are adding new dependencies, configuration, or build steps
- The code you are cleaning has no tests and no obvious callers

## Verification Checklist

Before claiming cleanup is complete, confirm:

- [ ] Baseline verification captured before cleanup
- [ ] Same verification rerun after every meaningful simplification
- [ ] All changed behavior is preserved; no functional changes introduced
- [ ] No new warnings, lint errors, or type errors introduced
- [ ] Public APIs and external contracts unchanged
- [ ] Diff is smaller or at least no larger in complexity
- [ ] Any untouched ugly areas are explicitly noted with a reason

## Output Checklist

- [ ] Baseline verification captured before cleanup
- [ ] Only changed files or directly adjacent support files touched
- [ ] Same verification rerun after cleanup
- [ ] Simplifications reported concretely
- [ ] No hidden architecture drift

## Consolidated Simplification Workflow

This is the canonical active simplification skill. It absorbs code-simplification. Only simplify after behavior is protected by tests or explicit verification. Avoid broad refactors bundled with feature work.

## Agent-Skills Compatibility

This skill is Pi's canonical equivalent of `code-simplification`: simplify working code while preserving exact behavior, respecting Chesterton's Fence, and re-verifying after cleanup.
