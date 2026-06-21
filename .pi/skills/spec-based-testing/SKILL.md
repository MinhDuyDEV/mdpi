---
name: spec-based-testing
description: "Use when deriving and tracing tests from requirements/specs/acceptance-criteria WITHOUT reading code — covers Requirement Traceability Matrix (RTM), acceptance-criteria → scenario mapping, IEEE-829 test documentation from docs, and behavior-oracle testing. Distinct from test-case-design (techniques) and test-driven-development (code-first); this is REQUIREMENT-DRIVEN black-box testing. Load for /test --black-box or when testing against a PRD."
---

# Spec-Based Testing (Black-Box)

> **The spec is the oracle.** Not the implementation, not what the developer says, not what "feels right" — the agreed, written specification. If the behavior doesn't match the spec, it's a defect. If the spec is untestable, testing cannot start.

## When to Use

- Testing against a PRD, functional specification, or requirements document
- Formal/regulated projects requiring auditable traceability
- Acceptance testing — does the running system satisfy the acceptance criteria?
- Before any code-accessible testing — establish spec coverage first
- Reviewing a spec for testability before implementation begins
- Any project where a Requirements Traceability Matrix (RTM) is required

## When NOT to Use

- Deriving test case techniques (use test-case-design for EP/BVA/decision tables)
- Code-first TDD (use test-driven-development)
- Testing exploratory unknowns (use exploratory-testing to find what the spec didn't anticipate)
- Testing API conformance to a schema (use contract-testing)
- Writing test automation scripts (use playwright, api-testing, etc.)

## Overview

Spec-based testing is the discipline of ensuring that **every written requirement has at least one passing test**, and that **every test traces back to a written requirement**. The spec is the authority. If behavior and spec disagree, the behavior is wrong. If the spec is ambiguous, that is a spec defect — report it, do not guess.

**Core principle:** No requirement is considered tested until it has a passing test case that explicitly traces to it. No test case is valid unless its expected result comes directly from the spec, not from observing the code.

## Requirement Traceability Matrix (RTM)

An RTM maps each requirement to its test cases and status. Forward traceability shows coverage; backward traceability shows that every test serves a requirement.

| Req ID | Requirement | Acceptance Criterion | Test Case ID | Status |
|--------|-------------|---------------------|--------------|--------|
| REQ-01 | User can register with email+password | AC-01: Valid email + password = account created | TC-AUTH-001 | PASS |
| | | AC-02: Duplicate email = rejected with message | TC-AUTH-002 | PASS |
| | | AC-03: Password < 8 chars = rejected | TC-AUTH-003 | FAIL |
| REQ-02 | User can reset password | AC-04: Reset email sent for valid account | TC-AUTH-004 | PASS |
| | | AC-05: Unknown email gets no confirmation | TC-AUTH-005 | NOT RUN |

**Rules:**
- Every requirement MUST have ≥1 test case. If you can't write one, the requirement isn't testable.
- Every test case MUST trace to ≥1 requirement. Orphan tests are waste.
- Every requirement shall have passing status or a documented exception.

## Acceptance-Criteria → Scenario Mapping

Each numbered acceptance criterion maps to a test scenario. If a criterion has no scenario, it is untested.

```gherkin
# Spec: REQ-01 — User Registration

AC-01: Valid email + password creates account
Scenario: Register with valid credentials
  Given the registration form is displayed
  When the user enters "new@example.com" and "SecureP@ss1"
  And submits the form
  Then an account is created
  And a confirmation message is shown

AC-02: Duplicate email rejected
Scenario: Register with existing email
  Given an account exists for "existing@example.com"
  When the user enters "existing@example.com" and "SecureP@ss1"
  And submits the form
  Then the system rejects with "Email already registered"
  And no new account is created

AC-03: Password too short
Scenario: Register with short password
  Given the registration form is displayed
  When the user enters "new@example.com" and "Ab1"
  And submits the form
  Then the system rejects with message "Password must be at least 8 characters"
```

**Check:** Every AC in the spec has ≥1 scenario. Every scenario references ≥1 AC.

### Mapping Table

| Acceptance Criterion | Scenario | Precondition | Expected Result from Spec |
|---------------------|----------|-------------|--------------------------|
| AC-01 | TC-AUTH-001 | Form displayed | Account created, confirmation shown |
| AC-02 | TC-AUTH-002 | Existing account | Error "Email already registered" |
| AC-03 | TC-AUTH-003 | Form displayed | Error "Password must be at least 8 characters" |

## IEEE-829 Test Documentation (from Docs, Not Code)

A non-coder QA engineer owns these documents. All expected results come from the spec, never from observing the code.

| Document | Purpose | Audience | Contents from Spec |
|----------|---------|----------|-------------------|
| **Test Plan** | Scope, approach, resources, schedule, entry/exit criteria | Project stakeholders | Features to test (from PRD), risks, pass/fail criteria |
| **Test Design Spec** | What to test and which techniques to use | QA team | Requirements → test conditions, technique selection per feature |
| **Test Case Spec** | Concrete test cases with expected results | QA team + automation | ID, summary, preconditions, steps, **expected result from spec** |
| **Test Procedure** | How to execute test cases — manual steps | Test executors | Step-by-step instructions, data setup, environment config |
| **Test Log** | What happened during execution | QA lead | Case ID, pass/fail, actual vs expected, timestamps, evidence links |
| **Test Summary Report** | Overall results against exit criteria | Stakeholders | Pass/fail counts, requirement coverage %, outstanding defects, release recommendation |

### Test Case Spec Template (Expected Result from Spec — Never from Code)

```
ID:           TC-AUTH-001
Summary:      Register with valid email and password
Req Traces:   REQ-01, AC-01
Precond:      Registration form displayed, no account exists for new@example.com
Steps:        1. Enter "new@example.com" in email field
              2. Enter "SecureP@ss1" in password field
              3. Click "Register"
Expected:     [FROM SPEC] Account created. Confirmation message displayed.
Actual:       (filled at execution time)
Status:       Pass / Fail / Blocked / Not Run
```

**Critical:** Expected result comes from the spec, not from running the code and observing what happens. If you run the code first to learn what to expect, you validated the code, not the spec.

## Behavior-Oracle Testing

The oracle is the mechanism for judging pass/fail. In spec-based testing, the oracle is **the spec's described behavior**.

| Oracle Source | How It's Used | Trap to Avoid |
|--------------|---------------|---------------|
| Written acceptance criteria | Compare actual behavior to each criterion | Criteria that say "should work" — define "works" |
| Use-case descriptions | End-to-end flows must match described user journey | Vague steps that don't specify outcomes |
| Business rules table | Output for given inputs must match rule | Missing rule for a valid input combination |
| Mockups / Figma screens | UI must match design at specified viewport | Design not updated for edge cases (error states) |
| Error code table | Error conditions must produce specified error | Undocumented error codes in responses |

**If the spec is ambiguous, report it as a spec defect — do not guess.** Testing against a guessed interpretation produces false passes.

## Spec Quality Gates

Before testing begins, gate the spec itself. An untestable spec is a blocker.

| Spec Smell | Testing Consequence | Action |
|------------|--------------------|--------|
| "The system should handle it appropriately" | No oracle — anything passes | Flag as untestable; demand specific behavior |
| "Fast response time" | No threshold — any speed passes | Demand a numeric SLA |
| Error conditions not documented | Undocumented errors = unexpected behavior | Flag gap; demand error table |
| "As a user, I want it to work" | Not a testable statement | Decompose into concrete criteria |
| Assumes specific UX without mockups | Inconsistent interpretation across testers | Demand mockups or acceptance criteria for UI behavior |
| No edge cases defined for validation | Boundary bugs ship | Demand input validation rules (min/max/format) |
| No negative test scenarios | Only happy path tested | Demand explicit "what should NOT happen" criteria |
| Requirements as "to be decided" (TBD) | Coverage gap | Block testing on that requirement until resolved |

## Coverage from the Spec

### Requirement Coverage (Not Line Coverage)

```
Requirement Coverage = (Requirements with ≥1 passing test) / (Total requirements) × 100%
```

- A requirement is **covered** when it has ≥1 test case with status PASS.
- A requirement with FAIL tests is **covered but failing** — investigate and fix.
- A requirement with no test case is **untested** — a gap.
- A test case with no requirement trace is an **orphan** — waste.

### What to Report

| Metric | Target | Meaning |
|--------|--------|---------|
| Requirement coverage | 100% | Every req has ≥1 test case |
| Test case pass rate | ≥90% | System under test is stable |
| Passed requirements | 100% for critical path | Release gate |
| Untested requirements | 0 | No blind spots |
| Orphan test cases | 0 | No wasted tests |
| Spec defects found | Reported | Spec ambiguities discovered during testing |

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "The spec is vague, I'll test what I think it means" | Vague spec = spec defect. Report it, don't guess. Testing against your guess gives false confidence. |
| "We don't need traceability" | Without RTM you can't prove coverage or find untested requirements. Regulated projects require it; all projects benefit. |
| "Acceptance criteria are obvious" | If they aren't written, they aren't agreed. Unwritten criteria lead to disputes at acceptance time. |
| "I'll write expected results after I see what the app does" | Then you're testing the code, not the spec. Run once to confirm the spec is testable, then derive expected results from the spec alone. |
| "Traceability is overhead, we trust the team" | Trust is not a coverage metric. An RTM is insurance against assumptions. |
| "100% requirement coverage is impossible" | 100% coverage is the target. If a requirement is untestable, flag it as a spec defect — don't silently exclude it. |
| "The devs already tested this, I'm just confirming" | Verifying the spec ≠ re-running dev tests. You test a different oracle (the spec, not the code). |
| "This bug isn't in the spec so it's not a bug" | Spec gaps are real bugs. Document them as spec defects or enhancement requests. |

## Red Flags

- Requirements with no test case assigned — coverage gap
- Test cases with no requirement trace (orphans) — wasted effort
- Expected results written after observing the code — validates code, not spec
- Spec ambiguity resolved by the tester guessing — false passes and misses
- No RTM for a regulated or formal project
- Test cases that pass but trace to a spec that says the opposite
- Acceptance tests written by the same person who implemented the feature
- Acceptance criteria that say "should work", "appropriate", "fast" without thresholds

## Verification

- [ ] Every numbered requirement has ≥1 test case with explicit expected result from the spec
- [ ] Every test case traces to at least one requirement (no orphans)
- [ ] Acceptance criteria are mapped to Gherkin scenarios or equivalent — no AC without a scenario
- [ ] Expected results derived from the spec before execution, not from observing the running app
- [ ] Spec quality gate applied: all ambiguous or untestable requirements flagged before testing starts
- [ ] Requirement coverage metric calculated: ≥1 passing test per requirement
- [ ] Spec defects (ambiguities, gaps, TBDs) documented and reported separately
- [ ] IEEE-829 test documents exist for scope, cases, procedure, and summary (tailored to project)
- [ ] A change in the spec triggers a review and update of affected test cases

## Skill Result Contract

```xml
<skill_result>
  <skill>spec-based-testing</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Requirements Traceability Matrix (RTM) with coverage metrics, test case specs with spec-derived expected results</evidence>
  <artifacts>RTM table, test case specs in IEEE-829 format, spec defect log, acceptance-criteria coverage report</artifacts>
  <risks>Spec may have undiscovered ambiguities; coverage measures quantity, not quality; spec defects may delay testing</risks>
</skill_result>
```

## See Also

- **test-case-design** — Techniques (EP, BVA, decision tables) that populate the test cases traced by the RTM
- **contract-testing** — API-level spec conformance; feeds contract tests into the RTM
- **exploratory-testing** — Fills gaps that spec-based testing misses (behavior not anticipated by requirements)
- **test-strategy** — Decides which test layers to use for spec-based vs exploratory approaches
- **spec-driven-development** — Building the spec before code; feeds testable specs into this skill
