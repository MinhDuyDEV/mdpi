---
name: spec-driven-development
description: Guides agents from vague request to concrete specification before implementation. Use when starting a new feature, significant change, product idea, or when requirements are ambiguous.
---

# Spec-Driven Development

## Overview

A spec converts intent into testable truth. Code written before the target is clear becomes rework.

Core principle: define observable outcomes, constraints, non-goals, and verification before planning implementation.

**Define the vocabulary first.** Every concept in the spec should have one name — that name must match what the code will call it. This is Evans' "ubiquitous language": a shared vocabulary between developers, domain experts, code, and AI context files. Ambiguous language in the spec causes the "AI does the wrong thing" failure mode: the LLM implements what the words say, not what you meant.

After writing the spec, extract a glossary of terms. Every capitalized concept in the spec should correspond to exactly one code symbol (type, class, module, function, file). If two terms mean the same thing, pick one. If one term means two things, split it.

## When to Use

- User asks for a new feature or significant behavior change.
- Requirements are vague, conflicting, or missing edge cases.
- Multiple files/systems will be affected.
- The work needs acceptance criteria or user-visible behavior.

## When NOT to Use

- Tiny mechanical edits with obvious expected behavior.
- Emergency bug fixes where reproduction is already clear; use `debugging-and-error-recovery`.
- Pure research with no implementation decision; use `source-driven-development`.

## Gated Workflow

Every change passes through four locked gates. Do not open the next gate until the current one is approved.

1. **SPECIFY** — lock intent.
   1. State the goal as an outcome, not a task.
   2. **Establish vocabulary**: define the key terms and map them to code concepts.
   3. Derive 3-7 observable truths from the user's perspective.
   4. Identify constraints: technical, UX, security, performance, compatibility.
   5. Define non-goals to prevent scope creep.
   6. List affected surfaces: files, APIs, commands, UI screens, data models.
   7. **Check vocabulary consistency**: does every spec term map to exactly one code symbol? Are any terms overloaded?
   8. Reframe instructions as success criteria (see pattern below).
   - **Gate**: spec approved or assumptions explicitly accepted.
2. **PLAN** — lock approach. Hand off to `planning-and-task-breakdown`.
   - **Gate**: plan approved.
3. **TASKS** — lock units. Break plan into verifiable beads/tasks with owners.
   - **Gate**: task list approved.
4. **IMPLEMENT** — lock behavior. Code against the spec; update spec when reality diverges.
   - **Gate**: verification checklist passes.

Human gates are binary: approve, change, or cancel. Do not sneak work through an unapproved gate.

## Reframe Instructions as Success Criteria

Turn every "do X" request into a verifiable "X is true when..." statement. If the user says "make it faster", write "Page load time is under 1.0 s on 3G for the dashboard route". If the user says "support CSV import", write "A CSV with 10,000 rows is imported without OOM and produces a row-level error report".

Use this pattern inside the Spec Template under Acceptance Criteria.

## Spec Template

```markdown
# Spec: [Name]

## Goal
[Outcome in one sentence]

## Vocabulary
| Term | Definition | Code symbol |
|------|------------|-------------|
| ...  | ...        | ...         |

Every concept should have one name. If two terms mean the same thing, consolidate. If one term means two things, split it.

## Observable Truths
- [User/system can observe X]

## Constraints
- [Hard constraint]

## Non-Goals
- [Explicitly out of scope]

## Affected Surfaces
- [File/API/UI/data area]

## Acceptance Criteria
- [Criterion] -> verify with [command/check/manual observation]

## Open Questions
- [Question or none]
```

## Six Core Areas

A complete spec covers these six areas. Use them as a final completeness check before the SPECIFY gate closes.

| Area | Question to answer |
| --- | --- |
| **Objective** | What user/system outcome must be true after this change? |
| **Commands** | What CLI/API/user commands are added, changed, or removed? |
| **Project Structure** | What files, modules, or packages move or appear? |
| **Code Style** | What patterns, naming, or formatting rules apply? |
| **Testing Strategy** | How will correctness be proven? Unit, integration, manual? |
| **Boundaries** | What is always in scope, ask-first, and never allowed? |

## Three-Tier Boundary System

Define boundaries before coding. Use the tiers to resolve "should I do this?" questions during implementation.

| Tier | Rule | Examples |
| --- | --- | --- |
| **Always do** | Required by the spec; no extra approval. | Input validation, error handling for listed edge cases, update affected tests. |
| **Ask first** | Changes design, scope, or risk; get user approval. | New dependency, schema change, new public API, removing a feature. |
| **Never do** | Explicitly out of scope. | Rewrite unrelated modules, change secrets, ship without verification. |

## Keeping the Spec Alive

A spec is not a tombstone. Update it when:

- Implementation reveals an edge case not in the original spec.
- The user changes a requirement mid-flight.
- A constraint turns out to be wrong or unnecessary.
- The glossary term-to-symbol mapping changes.

If the spec changes, re-validate the acceptance criteria and re-approve the SPECIFY gate before continuing.

## Common Rationalizations

| Rationalization | Rebuttal |
| --- | --- |
| "The user already explained it" | Explanation is not acceptance criteria. Write the target down. |
| "I'll discover requirements while coding" | Discovery during coding causes churn and hidden scope expansion. |
| "This is obvious" | Obvious to you is not a contract for the next agent or reviewer. |
| "The AI will figure out what I mean" | The AI will implement exactly what the spec says. Ambiguous language = wrong implementation. |
| "Questions slow us down" | One precise question is cheaper than implementing the wrong behavior. |
| "The spec is good enough, I'll add gates later" | Later rarely comes. Unapproved gates let scope and risk leak through. |

## Red Flags

- No explicit non-goals for a broad feature.
- Acceptance criteria are phrased as implementation tasks.
- Edge cases are deferred without user agreement.
- The plan starts before observable truths are defined.
- User-visible behavior has no verification method.
- **No vocabulary section** — missing ubiquitous language means AI will guess term meanings.
- **Same term used for different concepts** — e.g. "Order" means creation flow in one place and fulfillment in another.
- **Different terms for the same concept** — e.g. "User" vs "Account" vs "Profile" used interchangeably.
- Skipping a human gate because "the change is small".
- Boundaries are missing, so the agent must decide scope on the fly.

## Verification Checklist

- [ ] Goal is outcome-shaped, not task-shaped.
- [ ] Vocabulary table exists and every term maps to exactly one code symbol.
- [ ] No overloaded terms or synonyms in the glossary.
- [ ] Observable truths are human-verifiable.
- [ ] Constraints are explicit (technical, UX, security, performance, compatibility).
- [ ] Non-goals are listed and realistic.
- [ ] Affected surfaces are named with file/API/UI/data area paths.
- [ ] Acceptance criteria are reframed as success criteria with verification methods.
- [ ] Three-tier boundaries are defined.
- [ ] Open questions are resolved or recorded as assumptions with risk.
- [ ] At most 1-4 focused questions are pending.
- [ ] Human gate approval is recorded before moving to PLAN.

## Skill Result Contract

```xml
<skill_result>
  <skill>spec-driven-development</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Spec sections completed and questions/assumptions recorded</evidence>
  <artifacts>Spec path or inline spec summary</artifacts>
  <risks>Unresolved assumptions or none</risks>
</skill_result>
```
