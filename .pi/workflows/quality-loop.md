# Quality Loop Workflow

Score-gated, review-driven feedback loop for high-risk features. Runs iterative review cycles until the implementation reaches quality threshold (5/5) or escalation is triggered.

> **When to use:** High-risk features, explicit user quality gating requests, complex cross-cutting changes.
> **Invoked by:** `/ship` Phase 5 (Iterative Quality Loop mode)

---

### Phase 1: Setup
- **Agent:** @general
- **Concurrency:** 1
- **Prompt:**
  Initialize the review loop state. Create or update `.pi/artifacts/$SLUG/review-state.json`:

  ```json
  {
    "slug": "$SLUG",
    "rounds": 0,
    "maxRounds": 5,
    "lastScore": 0,
    "sameScoreCount": 0,
    "findingsResolved": 0,
    "findingsRemaining": 0,
    "status": "active"
  }
  ```

  Confirm: review-state.json initialized for slug `$SLUG`.

---

### Phase 2: Review
- **Agent:** @review
- **Concurrency:** 1
- **Depends on:** Phase 1
- **Prompt:**
  You are a quality-gate reviewer. Your job is to produce a confidence score and categorized findings.

  **Context:**
  - Read the spec from `.pi/artifacts/$SLUG/spec.md`
  - Read the current diff: `git diff origin/main...HEAD`
  - Read the review state from `.pi/artifacts/$SLUG/review-state.json`

  **Score (X/5):**
  | Score | Criteria |
  |-------|----------|
  | 5/5 | Perfect — all acceptance criteria met, no issues |
  | 4/5 | Good — minor issues only, safe to ship |
  | 3/5 | Needs work — important issues remain |
  | 2/5 | Significant gaps — critical issues or missing features |
  | 1/5 | Fundamentally wrong — does not address the spec |

  **Findings:** Return an array of findings, each with:
  - `severity`: "critical" | "important" | "minor"
  - `file`: path with line number
  - `finding`: description of the issue
  - `suggestion`: concrete fix suggestion

  **Return format:**
  ```json
  {
    "score": 3,
    "findings": [
      { "severity": "critical", "file": "src/auth.ts:42", "finding": "...", "suggestion": "..." }
    ],
    "suggested_action": "fix" | "ask_user" | "proceed"
  }
  ```

---

### Phase 3: Gate
- **Agent:** @general
- **Concurrency:** 1
- **Depends on:** Phase 2
- **Prompt:**
  Evaluate the review score from Phase 2:

  | Score | Action |
  |-------|--------|
  | 5/5 | Update review-state.json: `status: "passed"`. Exit loop. Mark as DONE. |
  | 4/5 | Present findings to user. Ask: "Minor issues only. Ship as-is or fix?" |
  | <4/5 | Continue to Phase 4 (Stall Check) |

  Update review-state.json:
  - Increment `rounds` by 1
  - Set `lastScore` to current score
  - If score unchanged from previous round, increment `sameScoreCount`

---

### Phase 4: Stall Check
- **Agent:** @general
- **Concurrency:** 1
- **Depends on:** Phase 3
- **Prompt:**
  Read `.pi/artifacts/$SLUG/review-state.json`.

  **Stall detection:**
  - If `sameScoreCount ≥ 2`: ESCALATE — fixes are not improving quality. Surface accumulated findings to user with the message:
    > "Quality loop stalled — same score ({score}/5) for 2 consecutive rounds. Accumulated findings may indicate a design issue. Options:
    > 1. Accept current state and proceed
    > 2. Revisit the spec/plan
    > 3. Manual intervention"

  **Max rounds:**
  - If `rounds ≥ maxRounds (5)`: ESCALATE — maximum iterations reached. Report all unresolved findings.
    > "Quality loop reached maximum rounds (5). Current score: {score}/5. Unresolved findings: [list]."

  If no stall and not maxed, continue to Phase 5 (Filter).

---

### Phase 5: Filter
- **Agent:** @general
- **Concurrency:** 1
- **Depends on:** Phase 4
- **Prompt:**
  Split Phase 2 findings into three categories:

  | Category | Criteria | Action |
  |----------|----------|--------|
  | **Actionable** | Concrete fix with clear file:line and suggestion | Route to Phase 6 fixer |
  | **Informational** | Observation, convention note, style preference | Log to progress.md, no fix needed |
  | **Architecture** | Structural or design concern | Stop — escalate to user with options |

  If any architecture findings exist, stop and present to user:
  > "Architecture finding: [description] at [file:line]. This may require plan/spec revision. Options:
  > 1. Proceed despite concern
  > 2. Revise spec/plan
  > 3. Manual review"

  Update review-state.json: `findingsRemaining` = count of actionable findings.

---

### Phase 6: Fix
- **Agent:** @general
- **Concurrency:** Dynamic (1 per actionable finding, max 3 parallel)
- **Depends on:** Phase 5
- **Prompt:**
  You are fixing review finding: **{finding.severity}: {finding.finding}**

  **Context:**
  - File: `{finding.file}`
  - Suggestion: `{finding.suggestion}`

  **Instructions:**
  1. Read the file at `{finding.file}`
  2. Apply the fix
  3. Run typecheck + lint on the changed file
  4. Report: status (fixed/unable), what was changed, verification result

  **Guard:** Stay within the file scope. Do not touch unrelated code.

  After all fixers complete, the orchestrator:
  - Updates review-state.json: `findingsResolved` += count of successful fixes
  - Re-runs full verification gates (typecheck + lint + test)

---

### Phase 7: Re-Review
- **Agent:** @general
- **Concurrency:** 1
- **Depends on:** Phase 6
- **Prompt:**
  Loop back to Phase 2. The implementation has been updated based on review findings. Spawn a fresh review agent with the updated diff and spec.

  ```typescript
  subagent({
    agent: "review",
    prompt: "[Phase 2 prompt, with updated diff]"
  });
  ```

  Continue the loop until exit condition (score ≥ 5, stall, or max rounds).

---

## Exit Conditions

| Condition | Trigger | Action |
|-----------|---------|--------|
| **PASS** | Score 5/5 | Mark review-state.json status "passed". Report completion. |
| **USER ACCEPT** | Score 4/5, user accepts | Mark review-state.json status "accepted". Proceed. |
| **STALL** | sameScoreCount ≥ 2 | Escalate with accumulated findings. |
| **MAX ROUNDS** | rounds ≥ 5 | Escalate with unresolved findings. |
| **ARCHITECTURE** | Architecture-level finding | Escalate to user for design decision. |

## Output

After loop exit, report:
1. Final score (X/5)
2. Rounds completed
3. Findings resolved / remaining
4. Exit reason
5. Recommendation: proceed, revise, or manual review
