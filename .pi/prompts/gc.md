---
description: Run garbage collection — Fallow analysis, quality grading, and cleanup PRs
---

# Garbage Collection

Run structural analysis, update quality grades, and open cleanup PRs.

## Load Skills

Before running GC, load these skills from `.pi/skills/`:

| Skill | Why |
|-------|-----|
| `fallow` | Structural analysis for dead code, duplication, complexity |
| `code-cleanup` | Safe code removal patterns for Phase 4 cleanup PRs |

Load `verification-before-completion` skill after fixes are applied.

## Before You GC

- **Be certain**: GC is maintenance — don't run during active feature work
- **Don't over-clean**: Only fix P0/P1 findings; P2/P3 are logged for next cycle
- **Use the workflow**: The garbage-collection workflow handles multi-phase execution
- **Verify fixes**: Each cleanup PR must pass typecheck + lint before merging

## Execution

This command delegates to the `garbage-collection` workflow for multi-phase execution.

1. **Read the workflow:** `.pi/workflows/garbage-collection.md`
2. **Execute all phases:**
   - Phase 1: Run `npx fallow --format json --quiet` and extract findings
   - Phase 2: Read `.pi/QUALITY.md`, compare with Fallow results, update grades
   - Phase 3: Prioritize findings by severity (P0-P3)
   - Phase 4: (if findings warrant) Spawn `subagent({ agent: "general", prompt: "Fix: [finding]" })` for P0/P1
3. **Replace placeholders:** `{phase_N_output}` → actual output from completed phases
4. **Aggregate results** between phases

**Announce:** "Running garbage collection via garbage-collection workflow."

## Failure Handling

| Scenario | Action |
|----------|--------|
| Fallow scan fails | Check if fallow is installed: `npx fallow --version`. Install if missing. |
| Quality grades unchanged | Report as-is — no change is a valid result |
| Cleanup PR creation fails | Log issue, continue with remaining PRs |
| Verification fails 2x | Stop, report blocker with file:line evidence |

## Stop Conditions

- Fallow not installed → report install command, stop
- No findings returned → report clean state, skip Phase 4
- Cleanup PR fails review → log issue, don't block report
- Verification fails 2x on same approach → stop, escalate

## Phase 5: Report

Output:

1. **Quality Grades:** Per-domain status
2. **Issues Found:** Count by severity
3. **Cleanup PRs:** Opened/not needed
4. **Recommendations:** Suggested improvements for next cycle

## Related Commands

| Need | Command |
|---|---|
| Full verification | `/verify all --full` |
| Architecture audit | `/audit` |

## Related Skills

See `.pi/skills/INDEX.md` for the complete task → skill routing table.
