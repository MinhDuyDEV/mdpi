---
description: Verify implementation completeness, correctness, and coherence
argument-hint: "[path|all] [--quick] [--full] [--fix] [--no-cache] [--dry-run] [--help]"
---

# Verify: $ARGUMENTS

Check implementation against PRD before shipping.

> **Canonical gate owner:** This command owns the verification protocol (gates, cache, phantom detection). `/ship` Phase 4 delegates here — do not redefine gates elsewhere.

## Parse Arguments

| Argument     | Default  | Description                                    |
| ------------ | -------- | ---------------------------------------------- |
| `<path|all>` | required | The path or keyword to verify (use `all` for in-progress work) |
| `--quick`    | false    | Gates only, skip coherence check               |
| `--full`     | false    | Force full verification mode (non-incremental) |
| `--fix`      | false    | Auto-fix lint/format issues                    |
| `--no-cache` | false    | Bypass verification cache, force fresh run     |
| `--dry-run`  | false    | Report what would be verified without executing |
| `--help`     | false    | Show this usage                                |

## Determine Input Type

| Input Type | Detection           | Action                     |
| ---------- | ------------------- | -------------------------- |
| Path       | File/directory path | Verify that specific path  |
| `all`      | Keyword             | Verify all in-progress work |

## Guard Phase

- Load `verification-before-completion` skill
- Read `.pi/artifacts/$(cat .pi/artifacts/.active)/spec.md` (if active slug exists)
- Verify guards: spec exists, you have read the full spec

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `verification-before-completion` | Always | Evidence-before-claims; phantom detection; verification cache protocol; Worker Distrust Protocol |
| `code-review-and-quality` | Phase 4 coherence check | Cross-reference artifacts for correctness |
| `testing-anti-patterns` | Phase 3 after tests pass | Detect mock-only tests, production pollution, and fragile assertions |
| `dcp-hygiene` | Phase 5 Report | Compress the closed gate output (typecheck/lint/test) when `compress` is available |

## Phase 0: Verification Cache

Load `verification-before-completion` skill. Follow its verification cache protocol:

- If `--no-cache` or `--full` → skip cache, run fresh
- If cache stamp matches current state → report **cached PASS**, skip to Phase 2
- If cache miss or mismatch → run gates normally

## Phase 1: Completeness

Extract all requirements/tasks from the PRD and verify each is implemented:

- For each requirement: find evidence in the codebase (file:line reference)
- Mark as: complete, partial, or missing
- Report completeness score (X/Y requirements met)

## Phase 2: Correctness

Follow the Verification Protocol from `verification-before-completion` skill:

**Default: incremental mode** (changed files only, parallel gates).

| Mode        | When                                      | Behavior                         |
| ----------- | ----------------------------------------- | -------------------------------- |
| Incremental | Default, <20 changed files                | Lint changed files, test changed |
| Full        | `--full` flag, >20 changed files, or ship | Lint all, test all               |

**Execution order:**

1. **Parallel**: typecheck + lint (simultaneously)
2. **Sequential** (after parallel passes): test, then build (ship only)

Report results with mode column:

```text
| Gate      | Status | Mode        | Time   |
|-----------|--------|-------------|--------|
| Typecheck | PASS   | full        | 2.1s   |
| Lint      | PASS   | incremental | 0.3s   |
| Test      | PASS   | incremental | 1.2s   |
| Build     | SKIP   | —           | —      |
```

After all gates pass, load `testing-anti-patterns` skill and audit tests for mock-only coverage, fragile assertions, and production code pollution.

If `--fix` flag provided, run the project's auto-fix command (e.g., `npm run lint:fix`, `ruff check --fix`, `cargo clippy --fix`), then **re-run the failed gate(s)**. Loop up to 2 times: fix → re-verify → fix → re-verify. If the gate still fails after 2 fix attempts, stop and report the remaining errors with file:line evidence. Do not claim a fix succeeded without a re-verified green gate.

**After all gates pass**, record to verification cache per `verification-before-completion` skill's cache protocol.

## Phase 3: Coherence (skip with --quick)

Cross-reference artifacts for contradictions:

- PRD vs implementation (does code address all PRD requirements?)
- Plan vs implementation (did code follow the plan?)
- Research recommendations vs actual approach (if different, is it justified?)

Flag contradictions with specific file references.

## Phase 4: Phantom Detection

Load `verification-before-completion` skill. Follow its phantom completion detection protocol:

- Scan modified files for stub patterns (TODO, FIXME, return null, placeholder, etc.)
- Run three-level artifact verification (exists → substantive → wired)
- Run key link verification (component→API, API→DB, form→handler, state→render, route→page)
- Report phantom score: CLEAN | SUSPECT | PHANTOM

## Failure Handling

| Scenario | Action |
|----------|--------|
| Gate fails | Report which gate failed with exact error |
| Verification fails 2x | Stop, report blocker with file:line evidence. **Also:** save the failure to `memory(action: "add", target: "failure", category: "failure")` — the gate that failed, the error, and what was tried. |
| Cache stamp mismatch | Run gates fresh — don't reuse stale cache |
| Phantom artifacts detected | Report PHANTOM score, block completion |

## Stop Conditions

- Any gate (typecheck/lint/test/build) fails → stop, report exact error
- Phantom score is PHANTOM → block completion, fix stubs first
- Cache bypassed but gates fail → re-cache not permitted until all pass
- Verification fails 2x on same approach → stop, escalate

## Phase 5: Report

> **DCP hygiene:** Before reporting, if the `compress` tool is available, compress the closed Phase 2 gate output (typecheck/lint/test/bash) per the `dcp-hygiene` skill — results are recorded in the report table and the verification cache. Skip if `compress` is unavailable.

Append to `.pi/artifacts/$SLUG/progress.md`: `Verification: [PASS|PARTIAL|FAIL] - [summary]`

1. **Result**: READY TO SHIP / NEEDS WORK / BLOCKED
2. **Completeness**: score and status
3. **Correctness**: gate results (with mode column)
4. **Coherence**: contradictions found (if not --quick)
5. **Phantom Score**: CLEAN | SUSPECT | PHANTOM
6. **Blocking issues** to fix before shipping
7. **Next step**: `/ship` if ready, or list fixes needed

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Ship after verify | `/ship`       |
| Plan a feature    | `/plan`       |
| Fix a bug         | `/fix`        |
| Audit codebase    | `/audit`      |

## Related Skills

- `verification-before-completion` — evidence gate, cache protocol, phantom detection, Worker Distrust Protocol (all phases)
- `code-review-and-quality` — coherence cross-reference (Phase 3)
- `testing-anti-patterns` — mock-only test detection (Phase 2 post-gate)
