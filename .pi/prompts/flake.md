---
description: Detect and quarantine flaky tests, and decide retry vs fix
argument-hint: "[--suite <pattern>] [--runs <N>] [--quarantine] [--dry-run] [--help]"
---

# Flake: $ARGUMENTS

Detect flaky tests (pass on retry, fail on rerun without code change), decide retry-vs-fix (fix is the default; retries mask bugs), and optionally quarantine with an owner + re-enable date. Flakes mask real regressions — do not ignore.

> **Lifecycle:** Maintenance utility. Composes with `debugging-and-error-recovery` (a flaky test is a bug) and `regression-strategy` (suite health).
> **IRON RULE:** Retries mask bugs. Fix the root cause. Quarantine is temporary debt, not a solution.

## Parse Arguments

| Argument       | Default | Description                                          |
| -------------- | ------- | ---------------------------------------------------- |
| `--suite`      | all     | Test pattern/path to check                           |
| `--runs`       | 5       | Number of runs to detect flakiness                   |
| `--quarantine` | false   | Quarantine detected flakes (requires owner + date)   |
| `--dry-run`    | false   | Detect + report without quarantining                 |
| `--help`       | false   | Show this usage                                      |

## Guard Phase

- Load `flaky-test-management` skill
- Confirm a clean working tree (flaky detection needs a stable code state)
- Detect the project's test command (package.json → npm test / vitest; pyproject → pytest; etc.)

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `flaky-test-management` | Always | Detection, retry-vs-fix decision, quarantine policy, find-the-polluter |
| `debugging-and-error-recovery` | A flake is confirmed | Root-cause the nondeterminism |
| `root-cause-tracing` | Order-dependent flake | Trace the polluter |
| `dcp-hygiene` | Output | Compress closed run-output when `compress` available |

## Execution

### Direct Execution (default)

1. **Detect:** run the suite `--runs` times (no code change between runs). Track per-test pass rate. A test with `<100%` but `>0%` pass rate is flaky.
   ```bash
   for i in $(seq 1 <runs>); do <test command> -- <suite> 2>&1 | tee run-$i.log; done
   ```
2. **Classify** each flaky test by likely root cause (shared state, order dependence, time/clock, randomness without seed, network, race, async-not-awaited, parallelism). Use `flaky-test-management` root-cause table.
3. **Decide:** FIX (default) vs QUARANTINE (only if fix is blocked + flake is blocking CI).
4. **Find-the-polluter** (if order-dependent): bisect — run tests one-by-one to find the test whose execution pollutes state for the flaky test.
5. **Quarantine** (only with `--quarantine`): skip the test with an inline annotation recording owner + re-enable date + ticket. Quarantine is debt.

### Dry-Run

`--dry-run` runs detection + classification + reports the fix recommendation, but does not quarantine or modify tests.

## Failure Handling

| Scenario | Action |
|----------|--------|
| No flakes detected | Report clean; stop (not an error) |
| Flake root cause ambiguous | Trace via `root-cause-tracing`; add instrumentation |
| Quarantine requested without owner/date | Refuse; require owner + re-enable date |
| Fix attempt fails 2x | Stop, escalate per debugging-and-error-recovery |

## Stop Conditions

- No flakes after `--runs` → report clean, stop
- Fix fails 2x on same flake → stop, escalate
- Quarantine without owner/date → refuse

## Output

> **DCP hygiene:** Before reporting, if `compress` is available, compress closed run-logs per `dcp-hygiene` — flake classification is captured in the report. Skip if unavailable.

1. **Runs executed** + per-test pass rates
2. **Flaky tests** (name, pass rate, likely root-cause category)
3. **Decision per flake** (FIX | QUARANTINE with owner+date)
4. **Find-the-polluter result** (if order-dependent)
5. **Quarantine actions taken** (or none, if dry-run)
6. **Next step:** FIX route → `/fix "<test> is flaky due to <cause>"`

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Fix a flake        | `/fix`        |
| Regression health  | `/verify`     |

## Related Skills

- `flaky-test-management` — detection, retry-vs-fix, quarantine, find-the-polluter
- `debugging-and-error-recovery` — a flake is a bug
- `root-cause-tracing` — order-dependent polluter tracing
- `regression-strategy` — suite health + flake budget
