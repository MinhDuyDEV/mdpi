---
name: defect-management
description: "Use when managing a reported defect end-to-end — triage (severity vs priority), defect lifecycle, blameless process root-cause analysis (5-whys/fishbone — distinct from root-cause-tracing which is CODE call-stack RCA), and the defect→regression-test→prevention loop. The lifecycle layer around debugging. Load for /defect or when a defect needs structured handling (not a quick fix)."
---

# Defect Management

## When to Use

- A defect is reported and needs structured handling beyond a quick fix
- Triaging: severity, priority, classification
- Blameless process root-cause analysis (not just code tracing)
- Closing the defect→regression→prevention loop
- Running the `/defect` workflow

## When NOT to Use

- Fix alone is sufficient — use `/fix`, `debugging-and-error-recovery`, or `root-cause-tracing`
- Code review for a fix PR — use `code-review-and-quality`
- Measuring defect trends — use `qa-metrics`
- The defect is a typo/rename with no behavior impact — fix directly

## Overview

**Core principle:** A defect that ships without a regression test and a process RCA is a defect that will ship again.

Defect management is the **lifecycle layer** around debugging and fixing. It owns the process from triage through closure, adds blameless process root-cause analysis (distinct from code call-stack tracing), and ensures the defect→regression→prevention loop completes. This is not the fix itself — that belongs to `debugging-and-error-recovery`, `root-cause-tracing`, and `/fix`. This is the structured container.

### Skills That Handle the Same Defect

| Skill | Owns | Relationship |
| --- | --- | --- |
| `root-cause-tracing` | Code call-stack RCA | Adds process RCA (5-whys, fishbone) — use both |
| `debugging-and-error-recovery` | Debugging | Delegates the debugging session |
| `testing-anti-patterns` | Test quality | Regression tests follow these rules |
| `regression-strategy` | Regression suite design | Adds test to the right suite |
| `code-review-and-quality` | Five-axis review | Coordinates fix PR review |
| `verification-before-completion` | Completion gate | Defect unverified until /verify passes |

**Black-box note:** When testing without source code access, skip the source-code skills above (root-cause-tracing, debugging, code review). Focus on process RCA (5-whys/fishbone) using the running app/API and defect report.

## Defect Lifecycle

`NEW → TRIAGED → ASSIGNED → IN-PROGRESS → FIXED → VERIFIED → CLOSED` with `REOPENED` from any state after FIXED.

| State | Event | Exit |
| --- | --- | --- |
| **NEW** | Defect reported | Reproduced or NON-REPRO documented; sev + pri assigned |
| **TRIAGED** | Sev/pri/class set; dup check done | Assigned to owner with fix version |
| **ASSIGNED** | Owner identified, fix target defined | Work begins on fix + regression test |
| **IN-PROGRESS** | Code RCA → fix → regression test (red-green) | Fix ready, regression test fails before fix |
| **FIXED** | Code committed, verified locally | Deployed to verification environment |
| **VERIFIED** | Fix confirmed, regression passes | Process RCA complete; prevention identified |
| **CLOSED** | Fix + test + prevention complete | Saved to memory(failure) + qa-metrics |
| **REOPENED** | Fix didn't hold, defect recurs | Re-enter at TRIAGED or ASSIGNED |

## Severity vs Priority

This is the most common triage mistake. **Severity and priority are independent.**

| Dimension | Values | Examples |
| --- | --- | --- |
| **Severity** (system impact) | Critical / High / Medium / Low | CRITICAL: data loss, auth bypass. LOW: cosmetic. |
| **Priority** (fix urgency) | Fix-Now / This-Release / Next-Release / Backlog | Fix-Now: blocks release. Backlog: known but not urgent. |

**Rule:** these are independent. A CRITICAL-severity bug behind a flag is Next-Release priority. A LOW-severity CEO-reported typo is Fix-Now priority. Never set severity = priority by default.

## Triage Steps

1. **Reproduce** — Follow report steps against the running app/API (do not read source code). If reproducible, record exact steps. If not, record NON-REPRO with environment evidence — do not silently drop.
2. **Assign severity** — Impact on system, not reporter's frustration.
3. **Assign priority** — Urgency relative to other work, not severity.
4. **Classify** — Functional / Performance / Security / Accessibility / Regression. Determines which QC skill verifies.
5. **Duplicate check** — Use `vcc_recall` for session history + `memory_search` target="failure" for cross-session matches. If duplicate, link and close.

### NON-REPRO Discipline

A non-reproducible defect is a bug without known reproduction, not "not a bug." Record environment, logs, screenshots, and attempted approaches. Set severity/priority based on report credibility. Revisit after 2 releases; if no recurrence, close as CANT-REPRO.

## Process Root-Cause Analysis (Blameless)

Process RCA answers: **"What process gap allowed this defect to ship?"** It is distinct from code RCA (which answers "what code path triggered this?"). Use both.

### 5-Whys

Ask "why" iteratively until you reach a **process gap**, not a person's mistake. Typically 3–5 levels.

```
1. Why NPE? → Discount service returns null for expired codes, no null check.
2. Why no null check? → Developer didn't consider expired codes as input path.
3. Why didn't they consider it? → Review focused on discount logic, not input validation.
4. Why did review miss it? → Review checklist lacks "null handling for all inputs" item.
5. Why no checklist item? → Test case template doesn't require edge-case inputs.
```

**Process gap:** test case design template lacks edge-case requirements. **Fix:** update template and retroactively apply.

**Blameless principle:** If a "why" names a person, you have not dug deep enough. Keep going until the answer is a process, tool, or system gap.

### Fishbone (Ishikawa) Diagram

For complex defects with multiple contributing factors, use the fishbone categories to map all causes:

| Category | Look For |
| --- | --- |
| **People** | Skill gaps, unclear ownership, handoff gaps |
| **Process** | Missing steps, no checklist, review gap |
| **Tools** | Missing linter, weak type system, no CI gate |
| **Environment** | Config diff, staging vs prod, flag state |
| **Code** | Complexity, hidden coupling, poor naming |
| **Requirements** | Underspecified, ambiguous acceptance criteria |

Identify which enabled the escape. Fix the weakest category (Process or Requirements first — fixing those catches future defects).

Identify which category enabled the escape. Fix the weakest category (often Process or Requirements first, because fixing those catches future defects).

### Code RCA vs Process RCA

**Black-box note:** When testing without source code access, **SKIP code RCA** (call-stack tracing). Run only process RCA (5-whys/fishbone) using the running app/API and the defect report. Do not inspect source code.

`root-cause-tracing` traces the **code call stack** to find where invalid data originated. `defect-management` (Process RCA) traces the **process stack** to find what process gap let it ship. **Use both when you have source access.** Code RCA tells you where; process RCA tells you how to prevent its class.

## The Defect→Regression→Prevention Loop

Every fixed defect must complete this loop:

```
FIX → REGRESSION TEST (red-green) → PREVENTION PROPOSAL → MEMORY SAVE
```

| Step | Action |
| --- | --- |
| **Fix** | Delegate to `debugging-and-error-recovery` or `root-cause-tracing` for code RCA (SKIP when testing without code — run process RCA only); apply via `/fix` |
| **Regression test** | Write test → confirm RED (fails with defect) → apply fix → confirm GREEN (passes) → add to regression suite |
| **Prevention proposal** | Structural change making the defect class impossible: add to regression suite, add NFR gate, update template, add review checklist item, reduce review size, or feature flag |
| **Save to memory** | `memory({ target: "failure", category: "failure", content: "<defect summary + process gap + prevention>" })` |

**Anti-pattern:** If the regression test passes before the fix (RED not confirmed), it does not verify the fix. See `testing-anti-patterns`.

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "Severity and priority are the same" | Impact ≠ urgency — conflating masks trade-offs. |
| "RCA is blame" | Blameless RCA finds the process gap, not the person. |
| "Fix it and move on" | No regression test + prevention → defect class recurs. |
| "NON-REPRO means not a real bug" | NON-REPRO is a state, not a verdict. Document and revisit. |
| "The code RCA is enough" | Code RCA finds trigger. Process RCA finds why it shipped. Both needed. |
| "Bug fixed, tests pass — done" | Loop closes only when prevention is identified and saved. |
| "5-whys is overkill for small bugs" | Small bugs reveal the same process gaps. Fix the template, prevent the next. |

## Red Flags

- severity = priority by default
- RCA blames a person
- Defect closed without regression test or prevention action
- Regression test that passes before the fix (RED not verified)
- NON-REPRO dropped silently
- Prevention is a one-time fix, not structural change
- No `memory(failure)` save

## Verification

- [ ] Lifecycle state tracked; severity and priority independently assigned
- [ ] Triage complete: reproduction, severity, priority, classification, duplicate check
- [ ] NON-REPRO documented with environment and evidence
- [ ] Code RCA performed (SKIP when testing without code access — process RCA alone suffices)
- [ ] Process RCA identified a process gap — not a person
- [ ] Regression test verified red-green (fails before fix, passes after)
- [ ] Prevention action is structural and addresses the defect class
- [ ] Prevention saved to `memory(failure)` for cross-session recall
- [ ] Loop closed: fix → regression test → prevention → memory

## Skill Result Contract

```xml
<skill_result>
  <skill>defect-management</skill>
  <status>closed|in-progress|blocked|reopened</status>
  <evidence>Lifecycle state, triage record, code RCA ref, process RCA output, regression test ref, prevention action</evidence>
  <artifacts>Regression test file, prevention proposal, memory(failure) record</artifacts>
  <risks>NON-REPRO not further investigated, prevention not implemented yet, or none</risks>
</skill_result>
```

## See Also

- `root-cause-tracing` — code call-stack RCA (source-access only; SKIP for black-box)
- `debugging-and-error-recovery` — debugging workflow (source-access only; SKIP for black-box)
- `testing-anti-patterns` — regression test quality rules (source-access only)
- `regression-strategy` — regression suite design and maintenance
- `code-review-and-quality` — review of the fix PR (source-access only)
- `verification-before-completion` — completion gate (/verify) for the fix (source-access only)
- `qa-metrics` — defect trend measurement across releases
- `release-readiness` — QA sign-off gate (defects affect release decisions)
- `qa-qc-framework` — QA/QC/Testing concepts router
