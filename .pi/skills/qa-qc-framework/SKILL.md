---
name: qa-qc-framework
description: "Use when orienting QA/QC work or deciding which quality skill applies — defines the QA (process/prevention) vs QC (product/detection) vs Testing (verification) distinction and maps every kit quality skill to the model. The router/index skill for the QA sub-kit. Load first when a quality question is ambiguous."
---

# QA/QC Framework

## When to Use

- The quality question is ambiguous and you need to decide which skill applies
- Orienting a new contributor to how the kit organizes quality activities
- Planning quality coverage and checking for gaps (e.g., "do we have prevention AND detection?")
- Before loading any other QA skill, when the user asks about quality in general terms

## When NOT to Use

- You already know which specific quality skill applies (load that skill directly)
- You need a review, test fix, or specific action — load the relevant skill, not the index
- Planning release mechanics or deployment — use `shipping-and-launch`
- Debugging a specific failure — use `debugging-and-error-recovery` or `root-cause-tracing`

## Overview

**Core principle:** QA, QC, and Testing are three distinct activities with different goals. Conflating them hides gaps.

Quality work in this kit follows a three-part model. Every quality skill belongs to exactly one of these concepts, and knowing which tells you what goal it serves and what failure mode to watch for.

### The Three Concepts

| Concept | Goal | Focus | Failure Mode | Kit Skills |
| --- | --- | --- | --- | --- |
| **QA** (Quality Assurance) | **Prevent** defects | Processes, standards, strategy, training, measurement | Prevention is invisible when it works → starved of investment | `test-strategy`, `test-case-design`, `coverage-strategy`, `defect-management` (prevention loop), `qa-metrics`, process RCA |
| **QC** (Quality Control) | **Detect** defects | Inspection, review, testing *as detection*, audits | Detection creates false confidence if detection rate is unknown | `code-review-and-quality`, `nfr-testing`, `security-testing`, `a11y-testing`, `load-testing`, `release-readiness`, `flaky-test-management` |
| **Testing** (Verification) | **Verify** behavior matches spec | Executing tests, red-green cycles, coverage measurement | Tests pass but assert nothing meaningful | `test-driven-development`, `test-execution`, `regression-strategy`, `agent-output-qa` |

### Why the Distinction Matters

Each activity has a different goal and a different failure mode. Blending them causes systematic gaps:

| What People Say | What They Actually Mean | The Gap |
| --- | --- | --- |
| "We do code review, that's our QA" | Code review is QC (detection) | No prevention layer: test strategy, coverage planning, defect prevention process |
| "TDD is our QA" | TDD is Testing (verification) | No QC detection: reviews, NFR testing, security audit |
| "We run tests, that's quality" | Tests are Testing (verification) | No prevention OR detection: strategy, review, NFR |
| "Release readiness is just testing" | Release-readiness is QC (aggregated detection) | Requires ALL three: QA strategy planned during design, Testing executed during build, QC applied during review |

The practical consequence: if you only have Testing, defects escape because you never inspect. If you only have QC, you detect defects late because you never prevented them. If you only have QA, you have great plans that ship buggy code. You need all three.

## The Router Table

When the user's intent is ambiguous, use this table to route to the correct skill:

| User Says | Intent | Load This Skill |
| --- | --- | --- |
| "What should we test?" / "Plan the tests" | QA — test strategy | `test-strategy`, `test-case-design` |
| "Is this ready to release?" | QC — release gate | `release-readiness` |
| "Is this accessible?" / "A11y audit" | QC — accessibility detection | `a11y-testing` |
| "A bug was reported" / "Defect" | QA+Testing — lifecycle + prevention | `defect-management` |
| "Tests are flaky" / "Flaky test" | QC — detection reliability | `flaky-test-management` |
| "How good is our quality?" / "Metrics" | QA — measurement | `qa-metrics` |
| "Is this AI-generated code trustworthy?" | Testing+QC — agent-specific verification | `agent-output-qa`, `agent-code-quality-gate` |
| "Ship this" / "Deploy" | Release engineering | `shipping-and-launch` |

## Composition with Canonical Skills

The QA/QC sub-kit adds new capabilities. It does NOT redefine existing canonical skills:

| Canonical Skill | Owns | QA/QC Kit Does NOT Duplicate |
| --- | --- | --- |
| `/verify` | Automation gate | Release-readiness checks signal *freshness*; not re-running verification |
| `/audit` | Automated audit | QC skills define what to audit; /audit runs it |
| `/gc` | Garbage collection | qa-metrics *consumes* gc output for quality trend |
| `/fix` | Automated fix | Defect-management orchestrates fix lifecycle; /fix executes the code change |
| `/ship` | Ship mechanics | Release-readiness runs *before* shipping-and-launch; it is the QA sign-off |

## Lifecycle Map

```
Define ─→ Plan ─→ Build ─→ Test ──→ Ship ─→ Maintenance
 │          │        │        │        │          │
 │          │        │        │        │          │
QA/QC      Test     Test    Flaky   /release-  /gc + /flake
Framework  Strategy  Case    Test    gate +    + /qa-report
+ Test     + Test   Design           Release-  + /defect
Strategy   Case                      Readiness
+ Coverage                           → Shipping
Strategy                             & Launch
```

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "QA, QC, testing — same thing" | Different goals: prevent vs detect vs verify. Conflating them hides gaps. |
| "We do code review, that's our QA" | Review is QC detection. QA prevention is strategy, process, and defect prevention. |
| "TDD is our quality practice" | TDD is Testing (verification). You still need QC detection and QA prevention. |
| "Release readiness is just more testing" | Release readiness aggregates ALL quality dimensions — functional, NFR, regression, smoke — against a written Definition of Done. |
| "If tests pass, quality is handled" | Tests only verify known scenarios. They don't detect unknown unknowns. QC catches what tests miss. |
| "Process RCA is overkill, just fix the bug" | Without process RCA, the same defect class recurs. The fix addresses one symptom; prevention stops the class. |
| "We don't need QA if we test everything" | Testing proves correctness against spec. QA ensures you're testing the right things at the right level. |

## Red Flags

- Conflating QA, QC, and Testing in conversation or planning
- Calling a detection activity "QA" (e.g., "code review is our QA")
- No prevention layer: test strategy, coverage planning, defect prevention are absent
- No detection layer: only unit tests exist, no reviews or NFR
- Only prevention and no detection: great plans but no inspection discipline
- Using one skill as a substitute for all three (e.g., "TDD covers quality")
- A new quality question triggers a guess rather than the router table

## Verification

- [ ] For an ambiguous quality question, the router table was consulted before loading a specific skill
- [ ] The three concepts (QA/QC/Testing) can be named with their goal, focus, and failure mode
- [ ] A given activity can be classified into the correct concept, and the reason is understood
- [ ] The distinction between this framework and canonical skills (e.g., defect-management, release-readiness) is clear
- [ ] The lifecycle map can place any skill at the correct phase

## Skill Result Contract

```xml
<skill_result>
  <skill>qa-qc-framework</skill>
  <status>success|partial|blocked</status>
  <evidence>Router table consulted, concepts distinguished, skill mapped to lifecycle phase</evidence>
  <artifacts>None (routing decision)</artifacts>
  <risks>Ambiguous intent not fully resolved; user may need multiple skills</risks>
</skill_result>
```

## See Also

- `agent-code-quality-gate` — per-change quality gate for agent output
- `agent-output-qa` — persistent agent-specific verification beyond the per-change gate
- `defect-management` — defect lifecycle + process RCA
- `release-readiness` — QA sign-off gate aggregating all signals
- `shipping-and-launch` — release engineering (run after release-readiness passes)
