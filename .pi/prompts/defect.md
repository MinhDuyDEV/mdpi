---
description: Triage a reported defect, run process RCA, delegate fix to /fix, and close the defect→regression loop
argument-hint: "<defect description> [--severity critical|high|medium|low] [--attach <file>] [--dry-run] [--help]"
---

# Defect: $ARGUMENTS

Manage a reported defect end-to-end: triage (severity vs priority), reproduce, blameless process root-cause analysis (5-whys / fishbone), delegate the fix to `/fix`, add a regression test, and close the defect→regression→prevention loop.

> **Lifecycle:** Verify utility. The lifecycle layer around debugging. Use `/fix` directly for simple bugs without management overhead.
> **Composes with:** `defect-management` (process RCA), `/fix` (the fix, delegated). **Black-box lane** — does NOT require reading code or call-stack tracing. Process RCA asks 'what process gap let this escape?' not 'what line of code?'

## Parse Arguments

| Argument     | Default  | Description                                    |
| ------------ | -------- | ---------------------------------------------- |
| `<defect>`   | required | Defect description, error, or ticket reference |
| `--severity` | —        | Initial severity hint: critical\|high\|medium\|low |
| `--attach`   | —        | Path to log/crash report/screenshot            |
| `--dry-run`  | false    | Triage + RCA without applying fix              |
| `--help`     | false    | Show this usage                                |

## Guard Phase

- Load `defect-management` skill
- `vcc_recall` for prior occurrences of this defect
- `memory_search({ query: "<keywords>", target: "failure", category: "failure" })` for cross-session defect history
- Verify baseline: confirm the bug is not a pre-existing state

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `defect-management` | Always | Lifecycle, severity vs priority, process RCA, prevention loop |
| `defect-management` | Phase 2 | Process RCA only: 5-whys/fishbone — find the process gap, not the code location |
| `testing-anti-patterns` | Phase 4 | Regression test quality audit |
| `dcp-hygiene` | Output | Compress closed triage/RCA reads when `compress` available |

## Execution

Delegate to the `defect-workflow` for the 4-phase pipeline (triage → rca → fix [delegates /fix] → regression):

```
run_workflow({ name: "defect-workflow", args: { defect: "<defect from $ARGUMENTS>", severity: "<--severity>", attach: "<--attach>" } })
```

**Announce:** "Managing defect: [description]. Invoking defect-workflow."

The runner handles phase dispatch and `{phase_N_output}` substitution. Phase 3 delegates the actual fix to `/fix`. For `--dry-run`, run Phases 1–2 (triage + RCA) and stop before fixing.

## Failure Handling

| Scenario | Action |
|----------|--------|
| Cannot reproduce | Record evidence as NON-REPRO, stop at Phase 1, ask for clarification |
| `/fix` cannot reproduce or fails 2x | Surface blocker from Phase 3, do not claim fixed |
| Root cause in third-party dep | Stop, report with upstream reference |
| Regression test can't be written | Report; require a monitor/assertion as a fallback guard |

## Stop Conditions

- NON-REPRO after triage → stop, surface for clarification (no RCA on unreproduced defects)
- `/fix` fails 2x → stop, escalate with learnings
- Defect is a duplicate → link to existing, stop
- `--dry-run` → stop after Phase 2

## Output

> **DCP hygiene:** Before reporting, if `compress` is available, compress closed triage/RCA exploratory output per `dcp-hygiene`. Skip if unavailable.

1. **Triage** (severity, priority, classification, repro status)
2. **Root cause** (code: file:line; process: the gap that let it escape)
3. **Fix** (file:line, verification, defense-in-depth)
4. **Regression test** (name + red-green confirmed)
5. **Defect prevention** (structural fix to make the class impossible)
6. **Memory saved** (failure category, for cross-session recall)
7. **Status:** CLOSED | BLOCKED (with reason)

Write to `.pi/artifacts/$SLUG/defect.md` (or inline).

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Quick fix (no mgmt)| `/fix`       |
| Add tests         | `/test`       |
| Release sign-off  | `/release-gate` |

## Related Skills

- `defect-management` — lifecycle, severity vs priority, process RCA, prevention
- `root-cause-tracing` — code call-stack RCA
- `testing-anti-patterns` — regression test quality
- `debugging-and-error-recovery` — the fix itself (via `/fix`)
