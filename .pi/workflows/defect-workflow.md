---
description: Triage a reported defect, run process root-cause analysis (5-whys/fishbone — no code), delegate fix to /fix, and close the defect→regression loop — for no-code QA
---

# defect-workflow

Manage a reported defect end-to-end for no-code QA: triage (severity vs priority), reproduce from the running app/API only (no source code), blameless process root-cause analysis (5-whys / fishbone), delegate the fix to `/fix`, add a regression test, and close the defect→regression→prevention loop.

> **When to use:** A defect is reported and needs structured triage + process RCA + regression closure. Use `/fix` directly for simple bugs without management overhead.
> **Invoked by:** `/defect`
> **Composes with:** `defect-management` (lifecycle + process RCA), `/fix` (the fix, delegated). Does NOT require code access. Process RCA (5-whys/fishbone) asks "what process gap let this escape?" — not "what line of code triggered this?"

## Args

- `defect` (required) — Defect description, error, screenshot, or ticket reference
- `severity` (optional) — Initial severity hint: `critical|high|medium|low`
- `--attach` (optional) — Path to log/crash report/screenshot

## Phases

### Phase 1: triage
- **Agent:** review
- **Concurrency:** 1
- **Depends on:** —
- **Tool:** `subagent` (single mode)
- **Skill:** `defect-management`

**Prompt:**

```
Triage the defect: {defect}. Attach: {attach}.
IRON RULE: do NOT read source code, do NOT inspect implementation. Reproduce only from the running app/API.

1. REPRODUCE: attempt to reproduce using the running app (playwright CLI / APIRequestContext / curl) or the provided screenshot/log. If not reproducible, document evidence and mark NON-REPRO (do not skip — record what was tried).
2. SEVERITY (impact on system): critical (data loss/security/crash on common path) | high (likely user-visible bug) | medium (edge-case bug) | low (cosmetic).
3. PRIORITY (fix urgency): fix-now | this-release | next-release | backlog. Justify any severity≠priority split.
4. CLASSIFY: functional | visual | performance | a11y | contract-breach | regression.
5. DUPLICATE CHECK: `vcc_recall` + `memory_search(target:"failure",category:"failure")` for prior occurrences.

Return a triage record to {phase_1_output}. If NON-REPRO, stop here and surface for clarification.
```

### Phase 2: rca
- **Agent:** review
- **Concurrency:** 1
- **Depends on:** Phase 1
- **Tool:** `subagent` (single mode)
- **Skill:** `defect-management`

**Prompt:**

```
Root cause the reproduced defect from {phase_1_output}. Do NOT read source code.

PROCESS RCA (blameless): a defect escaped to QA/production. Ask WHY it was possible:
- 5-whys: ask "why?" 3-5 levels until you reach a PROCESS gap (not a person, not a code location).
  Example: "Empty email accepted." → Why was there no validation? → Why wasn't the spec clear? → Why wasn't there a test for empty input? → Why doesn't the regression set cover boundary cases? GAP: no boundary test cases in regression set.
- Fishbone: categorize the gap into Process / Requirements / Tools / Environment / Timing.

Output: the PROCESS gap that let this defect escape. Do NOT produce a code location or call stack — the dev handles that. Your job is the quality process.
```

### Phase 3: fix
- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 2
- **Tool:** `subagent` (single mode)

**Prompt:**

```
Delegate the fix for the defect to the `/fix` command. The defect's observable behavior (from {phase_1_output}) is the description.

After /fix completes, capture: fix applied (observable from outside), verification results (running app confirms fixed), regression test added. Return to {phase_3_output}.

Guard: if /fix cannot reproduce or verification fails 2x, surface the blocker — do not claim fixed.
```

### Phase 4: regression
- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 3
- **Tool:** `subagent` (single mode)
- **Skills:** `defect-management`

**Prompt:**

```
Close the defect→regression loop from {phase_3_output}:

1. REGRESSION TEST: ensure a regression test exists that fails without the fix and passes with it (observable from the running app — no code). If /fix already added one, validate it from the running app. If missing, add one (a black-box test: given the input, the app should reject it / handle it correctly).
2. PROCESS GAP REMEDIATION: from the process RCA in {phase_2_output}, propose the structural fix that makes this defect CLASS impossible to recur (e.g., "add boundary test cases to the regression set for all input forms", "add a contract test for the error shape", "add a charter for this area in exploratory sessions"). This is defect prevention.
3. RECORD: save the defect (observable behavior + process gap + fix + regression test + prevention) to `memory(action:"add", target:"failure", category:"failure")` so future sessions don't repeat the class.
4. CLOSE: update the defect record status to CLOSED with the regression test reference.

Return the closed defect record to {phase_4_output}.
```

## Final Synthesis (Main Agent)

Write the defect record to `.pi/artifacts/$SLUG/defect.md` (or inline):

1. **Triage** (severity, priority, classification, repro status)
2. **Process gap** (the root cause: what process failure let this escape — not a code location)
3. **Fix** (observable result: what changed from outside)
4. **Regression test** (name + red-green confirmed from running app)
5. **Defect prevention** (structural fix to make the class impossible)
6. **Memory saved** (failure category, for cross-session recall)
7. **Status:** CLOSED | BLOCKED (with reason)

> **Post-workflow routing:** Prevention items → `/test --black-box`. Cross-cutting prevention → `/audit` + `/create`.

## Invocation

```
run_workflow({ name: "defect-workflow", args: { defect: "<description>", severity: "<hint>", attach: "<path>" } })
```

Typically invoked by `/defect`.
