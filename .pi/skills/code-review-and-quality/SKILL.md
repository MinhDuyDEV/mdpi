---
name: code-review-and-quality
description: Reviews code for correctness, regressions, security, maintainability, and goal completion. Use before merge, after subagent work, or when asked for a review.
---

# Code Review & Quality

## Overview

Review is a bug-finding activity, not a compliment sandwich. Verify the goal is achieved and no unacceptable risk is introduced.

Core principle: findings first, with `file:line` evidence and impact.

**Complexity is a correctness issue.** Working code that adds structural complexity makes future changes harder, slower, and more error-prone. Reviewers must weigh structural quality alongside behavior.

Use the **three complexity symptoms** (Ousterhout) as review lenses:
- **Change amplification**: a small future change requires touching many places.
- **Cognitive load**: the reviewer must understand too much of the system to assess one change.
- **Unknown unknowns**: hidden dependencies hide what must change for a new requirement.

Approve when the change clearly improves overall code health, even if imperfect. Do not block solely because you would have written it differently.

## When to Use

- User asks for review.
- Before merge/ship or after a worker/subagent reports completion.
- Refactors, security-sensitive changes, API changes, migrations, concurrency, or auth.
- Any change where complexity may have been introduced (always suspect).

## When NOT to Use

- Planning decisions before code exists; use `planning-and-task-breakdown`.
- Implementation; reviewer must stay read-only.
- Style-only commentary unless it hides a real bug.

## The Five-Axis Review

Evaluate every change across:

### 1. Correctness
- Matches the spec or task requirements.
- Edge cases handled (null, empty, boundary values).
- Error paths handled, not only happy path.
- Tests pass and test the right things; no off-by-one or race conditions.

### 2. Readability & Simplicity
- Names are descriptive and consistent (no `temp`, `data`, `result` without context).
- Control flow is straightforward; related code is grouped.
- No "clever" tricks; abstractions earn their complexity.
- Comments clarify non-obvious intent, not obvious code.

### 3. Architecture
- Follows existing patterns or justifies a new one.
- Clean module boundaries; dependencies flow the right way.
- Duplication extracted when appropriate; abstraction level is right.

### 4. Security
Load `security-and-hardening` for detailed guidance. Check input validation at boundaries, secrets out of code/logs, auth/authz, parameterized queries, XSS encoding, trusted dependencies, and untrusted external data.

### 5. Performance
Load `performance-optimization` for detailed guidance. Check N+1 queries, unbounded loops, sync-in-async, unnecessary re-renders, missing pagination, and hot-path allocations.

## Review Process

### Step 1: Understand the Context
- What is this change trying to accomplish?
- What spec or task does it implement?
- What is the expected behavior change?

### Step 2: Review the Tests First
- Do tests exist and test behavior (not implementation details)?
- Are edge cases covered?
- Do tests have descriptive names?
- Would they catch a regression if the code changed?

### Step 3: Review the Implementation
Walk through changed files with the five axes in mind: correctness, readability, architecture, security, performance.

### Step 4: Categorize Findings
Label every comment so the author knows what is required versus optional.

| Prefix | Meaning | Author Action |
| --- | --- | --- |
| *(no prefix)* | Required change | Must address before merge |
| **Critical:** | Blocks merge | Security vulnerability, data loss, broken functionality |
| **Nit:** | Minor, optional | Author may ignore — formatting, style preferences |
| **Optional:** / **Consider:** | Suggestion | Worth considering but not required |
| **FYI** | Informational only | No action needed — context for future reference |

### Step 5: Verify the Verification
- What tests were run?
- Did the build pass?
- Was the change tested manually?
- Are there screenshots for UI changes?
- Is there a before/after comparison?

## Change Sizing

Small, focused changes are easier to review, faster to merge, and safer to deploy.

| Size | Verdict |
| --- | --- |
| ~100 lines changed | Good. Reviewable in one sitting. |
| ~300 lines changed | Acceptable if it is a single logical change. |
| ~1000 lines changed | Too large. Split it. |

**What counts as "one change":** a single self-contained modification that addresses one thing, includes related tests, and keeps the system functional after submission.

**Splitting strategies:**

| Strategy | How | When |
| --- | --- | --- |
| **Stack** | Submit a small change, then start the next one based on it | Sequential dependencies |
| **By file group** | Separate changes for groups needing different reviewers | Cross-cutting concerns |
| **Horizontal** | Create shared code/stubs first, then consumers | Layered architecture |
| **Vertical** | Break into smaller full-stack slices of the feature | Feature work |

**When large changes are acceptable:** complete file deletions and automated refactoring where the reviewer only verifies intent, not every line.

**Separate refactoring from feature work.** A change that refactors existing code and adds new behavior is two changes. Small cleanups can be included at reviewer discretion.

## Severity

Internal priority scale:

| Priority | Meaning |
| --- | --- |
| P0 | Critical: data loss, security break, crash on common path, release blocker. |
| P1 | High: likely user-visible bug or serious regression. |
| P2 | Medium: edge-case bug, maintainability hazard with concrete impact. |
| P3 | Low: minor issue worth fixing but not blocking. |

Map review labels to priorities:
- **Critical:** → P0/P1
- *(no prefix)* → P1/P2
- **Optional:** / **Consider:** → P2/P3
- **Nit:** / **FYI** → P3 or informational

## Finding Template

```text
[P1] Title — path/to/file.ts:42
Impact: What breaks and when.
Evidence: Concrete code behavior.
Confidence: 0.0-1.0
```

## Broken Windows Scan

A change should not normalize decay. Scan changed files for:
- Messy or unused imports, inconsistent formatting.
- Inconsistent naming or patterns within the same file.
- TODO comments without ticket references.
- Dead code, no-op handlers, static placeholder responses.
- Created files that are not imported or invoked anywhere.
- README/AGENTS.md drift caused by the change.

Fix broken windows in changed files; flag adjacent decay without widening scope unnecessarily.

## Dead Code Hygiene

After any refactoring or implementation change, check for orphaned code:
1. Identify code that is now unreachable or unused.
2. List it explicitly.
3. **Ask before deleting:** "Should I remove these now-unused elements: [list]?"

Do not leave dead code lying around, but do not silently delete things you are not sure about.

```text
DEAD CODE IDENTIFIED:
- formatLegacyDate() in src/utils/date.ts — replaced by formatDate()
- OldTaskCard in src/components/ — replaced by TaskCard
- LEGACY_API_URL in src/config.ts — no remaining references
→ Safe to remove these?
```

## Multi-Model Review Pattern

Use different models or agent runs for different review perspectives:

```text
Model A writes the code
    │
    ▼
Model B reviews for correctness and architecture
    │
    ▼
Model A addresses the feedback
    │
    ▼
Human or lead agent makes the final call
```

This catches issues a single model might miss. Example prompt:

```text
Review this code change for correctness, security, and adherence to
project conventions. The spec says [X]. The change should [Y].
Flag any issues as Critical, Important, or Suggestion.
```

## Review Speed

Slow reviews block teams. The cost of context-switching to review is less than the waiting cost imposed on others.
- **Respond within one business day** — maximum, not target.
- **Ideal cadence:** respond shortly after a review request arrives, unless deep in focused coding. A typical change should complete multiple review rounds in a single day.
- **Prioritize fast individual responses** over quick final approval. Quick feedback reduces frustration even if multiple rounds are needed.
- **Large changes:** ask the author to split them rather than reviewing one massive changeset.

## Handling Disagreements

When resolving review disputes, apply this hierarchy:
1. **Technical facts and data** override opinions and preferences.
2. **Style guides** are the absolute authority on style matters.
3. **Software design** must be evaluated on engineering principles, not personal preference.
4. **Codebase consistency** is acceptable if it does not degrade overall health.

Do not accept "I'll clean it up later." Experience shows deferred cleanup rarely happens. Require cleanup before submission unless it is a genuine emergency. If surrounding issues cannot be addressed in this change, require filing a follow-up with self-assignment.

## Honesty in Review

When reviewing code — whether written by you, another agent, or a human:
- **Do not rubber-stamp.** "LGTM" without evidence of review helps no one.
- **Do not soften real issues.** "This might be a minor concern" when it is a production bug is dishonest.
- **Quantify problems when possible.** "This N+1 query will add ~50ms per item" is better than "this could be slow."
- **Push back on approaches with clear problems.** Sycophancy is a failure mode in reviews. If the implementation has issues, say so directly and propose alternatives.
- **Accept override gracefully.** If the author has full context and disagrees, defer to their judgment. Comment on code, not people — reframe personal critiques to focus on the code itself.

## Dependency Discipline

Part of code review is dependency review.

**Before adding any dependency:**
1. Does the existing stack solve this? (Often it does.)
2. How large is the dependency? (Check bundle impact.)
3. Is it actively maintained? (Check last commit, open issues.)
4. Does it have known vulnerabilities? (`npm audit` or equivalent.)
5. What is the license? (Must be compatible with the project.)

**Rule:** prefer standard library and existing utilities over new dependencies. Every dependency is a liability.

## Full Review Checklist

```markdown
## Review: [PR/Change title]

### Context
- [ ] I understand what this change does and why

### Correctness
- [ ] Matches spec; edge cases and error paths handled; tests adequate

### Readability
- [ ] Names clear and consistent; logic straightforward; no unnecessary complexity

### Architecture
- [ ] Follows existing patterns; no unnecessary coupling; abstraction level appropriate

### Security
- [ ] No secrets; input validated; no injection; auth checks; external data untrusted

### Performance
- [ ] No N+1 or unbounded ops; pagination on list endpoints

### Verification
- [ ] Tests pass; build succeeds; manual verification done if applicable

### Verdict
- [ ] **Approve** — Ready to merge
- [ ] **Request changes** — Issues must be addressed
```

## Common Rationalizations

| Rationalization | Rebuttal |
| --- | --- |
| "The implementation looks reasonable" | Review behavior and wiring, not aesthetics. |
| "The worker said tests pass" | Verify independently or mark as unverified. |
| "This is probably pre-existing" | Only skip if evidence shows it was not introduced or worsened. |
| "I should mention style too" | Style-only noise hides real findings. |
| "It works, that's good enough" | Working code that is unreadable, insecure, or architecturally wrong creates compounding debt. |
| "I wrote it, so I know it's correct" | Authors are blind to their own assumptions. Every change benefits from another set of eyes. |
| "We'll clean it up later" | Later never comes. Require cleanup before merge. |
| "AI-generated code is probably fine" | AI code needs more scrutiny, not less. |
| "The tests pass, so it's good" | Tests are necessary but not sufficient. They do not catch architecture, security, or readability problems. |

## Red Flags

- No `file:line` evidence for a finding.
- Findings describe preferences rather than bugs/risks.
- Review ignores acceptance criteria.
- Created files are not imported or invoked anywhere.
- Static placeholder responses or no-op handlers satisfy superficial tests.
- Reviewer modifies files.
- PRs merged without any review.
- Review that only checks if tests pass (ignoring other axes).
- "LGTM" without evidence of actual review.
- Security-sensitive changes without security-focused review.
- Large PRs that are "too big to review properly" (split them).
- No regression tests with bug fix PRs.
- Review comments without severity labels.
- Accepting "I'll fix it later" — it rarely happens.

## Complexity Red Flags

- **New module with shallow interface**: lots of public methods/props for small implementation — it is not hiding complexity, it is exposing it.
- **Information leakage**: one module exposes internal implementation details another module depends on.
- **Change amplification signal**: a simple conceptual change would touch many files — the structure is fighting the domain.
- **Cognitive load spike**: the diff requires understanding 5+ unrelated files to verify one change.
- **Pass-through methods**: methods that do nothing but delegate with the same signature — a sign the abstraction boundary is wrong.
- **Broken windows introduced**: messy formatting, dead imports, TODOs without tickets, inconsistent conventions within the same file.

## Verification

After review is complete:
- [ ] All Critical/P0 issues are resolved.
- [ ] P1/P2 issues are resolved or explicitly deferred with justification.
- [ ] Tests pass and build succeeds.
- [ ] The verification story is documented.
- [ ] Changed artifacts exist, are substantive, and key links are wired.
- [ ] Findings are ordered by severity; verdict is explicit: correct or incorrect.

## Skill Result Contract

```xml
<skill_result>
  <skill>code-review-and-quality</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Files reviewed, commands/checks run, findings with file:line evidence</evidence>
  <artifacts>Reviewed files or diff range</artifacts>
  <risks>Untested areas, unavailable base, or none</risks>
</skill_result>
```

## Consolidated Review Workflow

This is the canonical active review skill. It absorbs requesting-code-review, receiving-code-review, sprint-review, and reconcile responsibilities.

Use it for:
- self-review before claiming completion;
- subagent or peer review routing;
- skeptical treatment of received review comments;
- severity-ranked findings with file/line evidence;
- reconciliation between user intent, implementation, tests, and remaining risk.
