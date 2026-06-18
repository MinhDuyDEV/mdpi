---
description: Run garbage collection — Fallow analysis, quality grading, and cleanup PRs
argument-hint: "[--dry-run] [--scope <dir>] [--help]"
---

# Garbage Collection

Run structural analysis, update quality grades, and open cleanup PRs.

## Parse Arguments

| Argument    | Default | Description                               |
| ----------- | ------- | ----------------------------------------- |
| `--dry-run` | false   | Run analysis and report without creating cleanup PRs |
| `--scope`   | `.`     | Limit GC to specific directory            |
| `--help`    | false   | Show this usage                           |

## Guard Phase

- GC is maintenance — don't run during active feature work
- If `.pi/artifacts/.active` exists, warn user: "Active feature in progress. GC changes may conflict."

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `fallow` | Always (Phase 1) | Structural analysis for dead code, duplication, complexity |
| `code-cleanup` | Phase 4 (cleanup PRs) | Safe code removal patterns |
| `verification-before-completion` | After cleanup PRs | Verify typecheck + lint pass before merging |
| `observability-and-instrumentation` | If removing instrumented code | Check that cleanup doesn't break monitoring/logging |

## Execution

This command delegates to the `garbage-collection` workflow for multi-phase execution.

### Phase 1: Structural Analysis

1. **Run Fallow scan:**
   ```bash
   npx fallow --format json --quiet
   ```
2. Extract findings: dead code, duplication, complexity hotspots, unused exports

### Phase 2: Quality Grade Update

1. Read `.pi/QUALITY.md`
2. Compare with Fallow results
3. Update quality grades per domain
4. No change is a valid result — report as-is

### Phase 3: Prioritize Findings

| Severity | Definition | Action |
|----------|-----------|--------|
| P0 | Security, crash, data loss | Fix immediately |
| P1 | Dead code >100 lines, complexity >15 | Fix this cycle |
| P2 | Dead code <100 lines, minor duplication | Log for next cycle |
| P3 | Style, naming, formatting | Skip (not GC concern) |

### Phase 4: Cleanup (P0/P1 only)

For each P0/P1 finding:
1. Spawn `subagent({ agent: "general", prompt: "Fix: [finding description] at [file:line]" })`
2. After subagent returns, follow Worker Distrust Protocol (read diff, run verification)
3. Load `verification-before-completion` skill — verify typecheck + lint pass
4. Load `observability-and-instrumentation` skill check if removing instrumented code

If `--dry-run`, skip this phase and report what would be cleaned.

### Phase 5: Report

1. **Quality Grades:** Per-domain status (before → after)
2. **Issues Found:** Count by severity
3. **Cleanup PRs:** Opened / not needed / skipped (dry-run)
4. **Recommendations:** Suggested improvements for next cycle

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

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Full verification | `/verify all --full` |
| Pattern audit     | `/audit`      |
| Fix a bug         | `/fix`        |

## Related Skills

- `fallow` — structural analysis engine (Phase 1)
- `code-cleanup` — safe code removal patterns (Phase 4)
- `verification-before-completion` — evidence gate after cleanup (Phase 4)
- `observability-and-instrumentation` — telemetry integrity check (Phase 4)
