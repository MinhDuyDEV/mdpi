---
description: Debug and fix a bug or failing test
argument-hint: "<description of bug or error> [--attach <file>] [--dry-run] [--help]"
---

# Fix: $ARGUMENTS

Systematically debug and fix the reported issue.

## Parse Arguments

| Argument        | Default  | Description                               |
| --------------- | -------- | ----------------------------------------- |
| `<description>` | required | What to fix (bug description, error message, or failing test) |
| `--attach`      | —        | Path to log file, crash report, or screenshot |
| `--artifact`   | —        | Write the fix report into the active feature's artifact dir (`.pi/artifacts/$SLUG/fix.md`) if `.active` exists |
| `--dry-run`     | false    | Diagnose and report root cause without applying fix |
| `--help`        | false    | Show this usage                           |

## Guard Phase

Before fixing:
- Use `vcc_recall` to search for prior fix attempts on the same issue — avoid repeating failed approaches
- Use `memory_search({ query: "<issue keywords>", target: "failure", category: "failure" })` for durable cross-session failed approaches
- Check that the codebase builds/tests pass at baseline (confirm the bug is not a pre-existing state)

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `root-cause-tracing` | Always | Trace bug backward through call stack to source |
| `debugging-and-error-recovery` | Always | Systematic 5-step triage: reproduce → localize → reduce → fix → guard |
| `verification-before-completion` | Always | Evidence-before-claims; verify fix actually resolves the bug |
| `defense-in-depth` | After fix is verified | Harden the layer so the bug becomes structurally impossible |
| `testing-anti-patterns` | If writing tests | Ensure regression test isn't a mock-only test |
| `dcp-hygiene` | Phase 5 Report | Compress the closed reproduce+isolate work-stream when `compress` is available |

## Phase 1: Reproduce

Reproduce the issue with the exact steps or command. Use the project's test command:

```bash
npm test -- -t "<test name pattern>"   # or equivalent
```

If `--attach` provided, read the attached log/error file for context.

## Phase 2: Isolate

1. Search for the error message or symptom using `semantic_grep`
2. Trace the execution path to find the root cause using `semantic_inspect`
3. Read the 2-4 most relevant files
4. Distinguish symptom from root cause — follow `root-cause-tracing` skill methodology

## Phase 3: Fix

1. Apply the **minimal** fix for the root cause
2. Do not add speculative guards, tolerant readers, or defensive copies
3. Prefer making the bad state impossible over handling all bad states (`defense-in-depth`:
   validate at the layer where invalid data enters)

## Phase 4: Verify

> **DCP hygiene (mid-command):** The fix is applied — the root cause is now captured; the reproduce/isolate reads and greps are no longer needed verbatim. If `compress` is available, compress the closed Phase 1-2 reproduce+isolate work-stream per the `dcp-hygiene` skill before running gates. Keep the root cause (file:line) and reproduction command in the summary. Skip if `compress` is unavailable.

Run verification gates:

```bash
npm run typecheck
npm run lint
npm test            # or vitest relevant test
```

**Regression check:** If writing a regression test, verify the red-green cycle:
1. Write test → run → MUST fail (confirm it catches the bug)
2. Apply fix → run → MUST pass
3. Revert fix → run → MUST fail again → restore fix

Then, load `defense-in-depth` skill and add validation at the data entry layer.

## Failure Handling

| Scenario | Action |
|----------|--------|
| Cannot reproduce issue | Report reproduction steps attempted, ask for clarification |
| Root cause ambiguous | Trace backward through call stack, add instrumentation |
| Verification fails 2x | Stop, report blocker with learnings from both attempts. **Also:** save to `memory(action: "add", target: "failure", category: "failure", content: "[root cause + approach tried + error + reproduction]")` so future sessions don't repeat the failed approach. |
| Fix causes regression | Revert fix, report regression with evidence |

## Stop Conditions

- Cannot reproduce after 3 attempts → stop, ask for clarification
- Fix causes regression → revert, report
- Verification fails 2x on same approach → stop, escalate with learnings
- Root cause is in third-party dependency → stop, report with upstream reference

## Phase 5: Report

> **DCP hygiene:** Before reporting, if the `compress` tool is available, compress the closed Phase 1-3 exploratory work-stream (reproduce bash + isolate grep/inspect/read output) per the `dcp-hygiene` skill — the root cause and fix are now captured in this report and the artifact. Skip if `compress` is unavailable; the artifact already holds the facts.

1. Root cause (with file:line)
2. Fix applied
3. Verification results (typecheck, lint, test)
4. Defense-in-depth layer added (if applicable)
5. What else was considered and rejected

If `--artifact` was passed (or `.pi/artifacts/.active` exists and the fix belongs to that feature), write the report to `.pi/artifacts/$SLUG/fix.md` and append a one-line summary to `progress.md`. Otherwise report inline.

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create feature | `/create`    |
| Verify gates   | `/verify`    |
| Ship fix       | `/ship`      |

## Related Skills

- `root-cause-tracing` — backward call-stack tracing in Phase 2
- `debugging-and-error-recovery` — full 5-step triage methodology
- `verification-before-completion` — evidence gate in Phase 4
- `defense-in-depth` — structural hardening after fix
- `testing-anti-patterns` — regression test quality
