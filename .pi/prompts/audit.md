---
description: Audit codebase for a specific pattern
argument-hint: "<pattern>"
---

# Audit: $ARGUMENTS

Find all occurrences of a code pattern in the codebase, review each for issues, and produce prioritized remediation recommendations.

> Use for cross-cutting concerns like auth checks, error handling, API patterns, or security vulnerabilities.

## Parse Arguments

| Argument | Default  | Description                          |
| -------- | -------- | ------------------------------------ |
| Pattern  | required | Code pattern to search for           |

**Examples:**
- `/audit console.log` — Find all console.log statements
- `/audit app.use(` — Find all middleware registrations
- `/audit fetch(` — Find all fetch calls
- `/audit try {` — Find all try-catch blocks

## Load Skills

Before auditing, load these skills from `.pi/skills/`:

| Skill | Why |
|-------|-----|
| `security-and-hardening` | Identify vulnerability patterns in audited code |
| `code-review-and-quality` | Assess correctness and structural quality |
| `fallow` | Structural analysis for dead code, duplication, complexity |

## Before You Audit

- **Be certain**: Choose a specific pattern — broad searches produce noise
- **Don't over-audit**: Focus on correctness, security, and edge cases — not style
- **Use the workflow**: The audit-pattern workflow handles multi-agent parallel execution
- **Prioritize findings**: Critical issues first, minor notes last

## Execution

This command invokes the `audit-pattern` workflow for multi-agent parallel execution.

### Workflow Execution

1. **Read the workflow:** `.pi/workflows/audit-pattern.md`
2. **Execute all phases:**
   - Phase 1: `subagent({ agent: "explore", prompt: "Search codebase for all occurrences of pattern: {pattern}. Return file:line with brief context." })`
   - Phase 2: Spawn parallel `subagent({ agent: "review", prompt: "Audit occurrences for correctness/security/edge-cases..." })` (dynamic count)
   - Phase 3: `subagent({ agent: "general", prompt: "Synthesize audit findings from Phase 1+2 into prioritized report." })`
3. **Replace placeholders:**
   - `{pattern}` → the pattern from $ARGUMENTS
   - `{phase_N_output}` → actual output from completed phases
4. **Aggregate results** between phases
5. **Write final report** to `.pi/artifacts/$(cat .pi/artifacts/.active)/audit.md`

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
- `.active` slug missing → report, suggest running `/create` first

## Output

Report:

1. **Pattern:** [pattern searched]
2. **Occurrences found:** [count]
3. **Files affected:** [count]
4. **Issues by severity:**
   - Critical: [N]
   - Important: [N]
   - Minor: [N]
5. **Recommended fixes:** [list with file:line refs]
6. **Correct patterns:** [list of occurrences that are already correct]

> **Post-audit routing:** For individual issue remediation → `/fix`. For systematic cross-cutting fixes → `/create`.

## Related Commands

| Need              | Command       |
| ----------------- | ------------- |
| Research a topic  | `/research`   |
| Create feature    | `/create`     |
| Ship feature      | `/ship`       |
| Verify gates      | `/verify`     |

## Related Skills

See `.pi/skills/INDEX.md` for the complete task → skill routing table.
