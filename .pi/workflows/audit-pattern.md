---
description: Find all occurrences of a code pattern, review each for correctness/security/edge-cases, and produce prioritized remediation recommendations
---

# audit-pattern

Find all occurrences of a code pattern in the codebase, review each match for correctness/security/edge-cases, and produce prioritized remediation recommendations. Use for cross-cutting concerns like auth checks, error handling, or API patterns.

## Args

- `pattern` (required) — The code pattern to search for

## Phases

### Phase 1: discover

- **Agent:** explore
- **Concurrency:** 1
- **Depends on:** —
- **Tool:** `subagent` (single mode)

**Prompt:**

```
Search the codebase for the pattern: {pattern}. Use semantic_grep or semantic_query to find every occurrence. List each file with line numbers, grouped by subdirectory. If the pattern has common variations, include those too. Return results in this format:

## Directory: [path]
- `file.ts:42` — [brief context]
- `file.ts:87` — [brief context]

Keep each entry under 50 words.
```

### Phase 2: audit

- **Depends on:** Phase 1
- **Agent:** review
- **Concurrency:** Dynamic (estimate ~10 occurrences per agent, min 2, max 15)
- **Tool:** `subagent` (parallel mode)

**Guard:** If Phase 1 returns 0 occurrences, **skip Phase 2** and synthesize a clean report directly.

**Prompt:**

```
Review the following files for the pattern '{pattern}': {phase_1_output}. For each occurrence check: correctness, edge cases, security implications, error handling, and adherence to project conventions. Return findings in this format:

## File: [path:line]
- **Severity:** [critical/important/minor]
- **Issue:** [description]
- **Recommendation:** [fix suggestion]

Keep each finding under 100 words.
```

## Final Synthesis (Main Agent)

After Phase 2 completes, synthesize the audit findings directly from {phase_2_output}.

Produce:
1. **Issues ranked by severity** — Critical, important, minor with file:line references
2. **Affected scope** — Count of files and occurrences
3. **Recommended fixes** — Specific fix suggestions per issue
4. **Correct patterns** — Patterns that are already correct and should be preserved

Group findings by subdirectory. Keep the report under 1500 words.

## Invocation Example

```
/audit-pattern <pattern>
```

Or in a chain:

```
subagent({
  chain: [
    { agent: "explore", task: "Phase 1 prompt with pattern=console.log" },
    { agent: "review", task: "Phase 2 prompt with {previous}" },
    // Main agent synthesizes
  ]
});
```
