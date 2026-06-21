---
name: test-case-design
description: "Use when designing concrete test cases for a behavior — covers ISTQB techniques (equivalence partitioning, boundary value analysis, decision tables, state transition, pairwise), BDD/ATDD Gherkin scenarios, and IEEE-829 test case format. Feeds test-driven-development RED with well-designed cases instead of ad-hoc ones. Load for /test or when writing tests for non-trivial logic."
---

# Test Case Design

> **Replaces** "I'll just test the happy path" with systematic case derivation grounded in decades of testing research.

## When to Use

- Deriving test cases from a spec or behavior description
- Writing tests for non-trivial logic: validation, state machines, decision-heavy code
- Before the TDD RED phase — feed it designed cases, not ad-hoc guesses
- Reviewing test coverage and finding gaps systematically
- Writing acceptance criteria that stakeholders need to read

## When NOT to Use

- Deciding which test layer (use test-strategy instead)
- Learning test-first order (use test-driven-development instead)
- Trivial getters, setters, or configuration boilerplate
- Debugging mock quality (use testing-anti-patterns instead)
- Verifying that tests catch bugs (use coverage-strategy instead)

## Overview

Test case design is a systematic discipline, not ad-hoc guessing. These techniques let you derive the minimum set of test cases that prove behavior — without relying on intuition.

**Core principle:** Derive cases from the specification, not the implementation. If two testers independently derive the same set of cases, your design is systematic. If they get different ad-hoc sets, it's guesswork.

## Techniques

### Equivalence Partitioning

Divide input space into classes where any value in a class produces the same behavior. Test one representative per class.

**Worked example — Email validation:**

| Partition | Example | Expected |
|-----------|---------|----------|
| Valid | user@example.com | Accepted |
| Missing @ | userexample.com | Rejected |
| Empty | (empty) | Rejected |
| Too long | >254 chars | Rejected |
| Missing domain | user@ | Rejected |

**When to use:** Any validated input. Start here for every field.

### Boundary Value Analysis

Test at the edges of partitions. Off-by-one is the most common bug class in production.

**Worked example — Array processor with max length N=10:**

| Input | Why | Expected |
|-------|-----|----------|
| 0 | Empty/min | Handles gracefully |
| 1 | Min non-empty | Works |
| 9 | N-1 | Works |
| 10 | N boundary | Works |
| 11 | N+1 | Rejects |

**Checklist:** min, min+1, max-1, max, max+1 (where applicable).

**When to use:** Any input with min/max limits — numbers, collection sizes, string lengths.

### Decision Tables

Cover all condition combinations and their resulting actions.

**Worked example — 3 conditions → 8 rules:**

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|----|----|----|----|----|----|----|----|
| Member? | T | T | T | T | F | F | F | F |
| Coupon? | T | T | F | F | T | T | F | F |
| Total>$100? | T | F | T | F | T | F | T | F |
| Discount | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| Free ship | ✓ | — | — | — | ✓ | — | — | — |

**When to use:** Pricing, permissions, eligibility, feature flags — any multi-condition business logic.

### State Transition

Model the system as states and legal/illegal transitions. Test both.

**Worked example — Order lifecycle:**

```
States: [Pending] [Paid] [Shipped] [Delivered] [Cancelled]
Legal: Pending→Paid, Pending→Cancelled, Paid→Shipped, Shipped→Delivered
Illegal: Pending→Shipped, Paid→Delivered, Delivered→Cancelled
```

- Every legal transition.
- Every state via a legal path.
- At least one illegal transition.
- Looping/retry paths (e.g., payment retry).

**When to use:** Orders, workflows, user sessions, connection lifecycles.

### Pairwise (All-Pairs Testing)

When the cartesian product is too large, test every pair of values. Pairs reveal interaction bugs with minimal test count.

**Worked example — 3 flags × 2 values (8 full → 4 pairwise):**

| # | Logged in | Admin | Dark mode |
|---|-----------|-------|-----------|
| 1 | Yes | Yes | Yes |
| 2 | Yes | No | No |
| 3 | No | Yes | No |
| 4 | No | No | Yes |

Every two-column pair appears. 4 tests instead of 8.

**When to use:** Feature toggles, config flags, browser combos, multi-parameter APIs. Tools: PICT, allpairspy, fast-check.

### BDD / ATDD Gherkin

Given/When/Then acceptance criteria. Gherkin is communication — stakeholders read scenarios, automation reads steps.

```gherkin
Scenario: Cancel unpaid order
  Given order is "Pending"
  When the user cancels
  Then status is "Cancelled"

Scenario: Cancel shipped order
  Given order is "Shipped"
  When the user cancels
  Then system rejects with "Cannot cancel shipped order"
```

**Bad:** implementation-heavy Gherkin ("clicks button #42"). Write for stakeholders.

**When to use:** Stakeholder-readable criteria; integration/E2E tests.

### IEEE-829 Test Case Format

For documented test cases needing traceability:

```
ID:        TC-EMAIL-003
Summary:   Reject empty email
Feature:   Registration
Precond:   Form displayed
Steps:     1. Leave email empty 2. Submit
Expected:  Error "Email is required"
Actual:    (execution time)
Status:    Pass / Fail
```

**When to use:** Regulated environments, audit trails, test management.

### Naming Rule

Names must read like specification sentences.

| Good | Bad |
|------|-----|
| `rejects_empty_email` | `test1` |
| `retries_failed_3_times` | `test_retry` |
| `cancels_pending_order` | `cancelOrderTest` |
| `throws_on_negative` | `errorTest` |

**If you can't name it, you don't understand it.** Split until each name reads clearly.

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "I'll just test the happy path" | Happy path proves nothing about edges. Users find every path you didn't test. |
| "Boundary values are obvious" | Off-by-one is the most common bug class. Test every boundary explicitly. |
| "All combinations matter equally" | Pairwise proves all pairs matter. Beyond pairs, diminishing returns. |
| "State machines are simple" | Illegal transitions are where bugs live. Test rejection, not just valid moves. |
| "Gherkin is overhead for automation" | Gherkin is communication, not automation. Write it for stakeholders. |
| "IEEE-829 is outdated" | Traceability matters in regulated contexts. Know the format even if you skip it. |
| "I'll name tests after I write them" | Name first. The name defines the behavior. If you can't name it, you don't know it. |

## Red Flags

- Tests named `test1` / `test2` / `t01`
- Only happy-path cases for any function
- No boundary cases for numeric or string inputs
- No illegal-transition test for stateful logic
- Decision logic tested one condition at a time (misses interaction bugs)
- Gherkin scenarios devs can't read (wrong audience)
- Ad-hoc cases another engineer couldn't reproduce from the spec

## Verification

- [ ] Each spec clause has at least one test case
- [ ] Equivalence partitions identified for every validated input
- [ ] Boundaries tested for numeric / collection / string inputs
- [ ] Illegal states or inputs have explicit rejection tests
- [ ] Decision tables cover all condition combos (or pairwise with documented trade-off)
- [ ] Tests named in behavior terms (reads like a specification sentence)
- [ ] Happy path + at least one error path per behavior

## Skill Result Contract

```xml
<skill_result>
  <skill>test-case-design</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Test cases derived with specific technique, worked examples produced</evidence>
  <artifacts>Test case list with partitions, boundaries, decision table, or state transition diagram</artifacts>
  <risks>Missed partitions if spec is incomplete; over-testing if every technique applied to every function</risks>
</skill_result>
```

## See Also

- **test-strategy** — Layer placement (where designed cases execute)
- **test-driven-development** — Designed cases feed the RED phase
- **testing-anti-patterns** — What NOT to do with test quality
- **coverage-strategy** — Verifying designed cases catch bugs
- **spec-driven-development** — Deriving cases from specifications
