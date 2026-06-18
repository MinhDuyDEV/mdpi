---
description: Audit codebase for a specific pattern
argument-hint: "<pattern> [--scope <dir>] [--dry-run] [--help]"
---

# Audit: $ARGUMENTS

Find all occurrences of a code pattern in the codebase, review each for issues, and produce prioritized remediation recommendations.

> Use for cross-cutting concerns like auth checks, error handling, API patterns, or security vulnerabilities.

## Parse Arguments

| Argument     | Default  | Description                          |
| ------------ | -------- | ------------------------------------ |
| `<pattern>`  | required | Code pattern to search for           |
| `--scope`    | `.`      | Limit audit to specific directory    |
| `--format`   | markdown | Output format: `markdown` (default), `json`, `inline` |
| `--dry-run`  | false    | Search and count without reviewing or reporting |
| `--help`     | false    | Show this usage                      |

**Examples:**
- `/audit console.log` — Find all console.log statements
- `/audit app.use(` — Find all middleware registrations
- `/audit fetch(` — Find all fetch calls
- `/audit try {` — Find all try-catch blocks
- `/audit "await.*catch" --scope src/api` — Limit to src/api directory

## Guard Phase

- Check `.pi/artifacts/.active` — if active slug exists, write report to that artifact directory
- If `.active` is missing, write report inline
- If `--dry-run`, skip guard and proceed to search only

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `security-and-hardening` | Pattern involves auth, secrets, validation, input | Identify vulnerability patterns in audited code |
| `code-review-and-quality` | Occurrences > 5 | Assess correctness and structural quality across results |
| `fallow` | Occurrences > 20 or scope is project-wide | Structural analysis for dead code, duplication, complexity |

## Execution

This command invokes the `audit-pattern` workflow via the `run_workflow` tool for multi-agent parallel execution.

### Direct Execution (≤5 occurrences)

For small audits, execute directly without workflow overhead:
1. Search with `semantic_grep`
2. Read each occurrence
3. Report findings inline

### Workflow Execution (>5 occurrences)

1. **Invoke the workflow:**
   ```
   run_workflow({ name: "audit-pattern", args: { pattern: "<pattern from $ARGUMENTS>", scope: "<--scope value or '.'>" } })
   ```
2. The workflow runner handles phase dispatch (explore → review) and placeholder substitution (`{pattern}`, `{phase_N_output}`).
3. **Aggregate results** between phases as returned by the runner.
4. **Write final report** to `.pi/artifacts/$SLUG/audit.md` (or inline if no active slug)

**Announce:** "Auditing codebase for pattern: [pattern]. Invoking audit-pattern workflow."

## Failure Handling

| Scenario | Action |
|----------|--------|
| Workflow phase fails | Retry once with adjusted prompt, then escalate |
| No occurrences found | Report: "Pattern not found in codebase." |
| Audit timeout | Report partial results with what was covered |
| Subagent returns failure | Read error, retry once, then escalate |

## Stop Conditions

- Pattern returns 0 occurrences → report, stop (not an error)
- Workflow phase fails 2x → stop, escalate with partial results
- Audit timeout → report partial findings, note uncovered scope
- `.active` slug missing → write inline report (not an error)

## Output

1. **Pattern:** [pattern searched]
2. **Occurrences found:** [count]
3. **Files affected:** [count]
4. **Issues by severity:**
   - Critical: [N]
   - Important: [N]
   - Minor: [N]
5. **Recommended fixes:** [list with file:line refs]
6. **Correct patterns:** [list of occurrences that are already correct]

> **Post-audit routing:** Individual issue remediation → `/fix`. Systematic cross-cutting fixes → `/create`.

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Research topic | `/research`  |
| Create feature | `/create`    |
| Fix a bug      | `/fix`       |
| Verify gates   | `/verify`    |

## Related Skills

- `security-and-hardening` — vulnerability detection in audited code
- `code-review-and-quality` — correctness assessment of findings
- `fallow` — structural analysis for large-scale audits
