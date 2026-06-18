# garbage-collection

**Pattern:** Fallow analysis → review findings → file issues → optional auto-fix PRs
**Trigger:** Manual via `/gc` command or scheduled cadence

### Phase 1: Fallow Scan

- **Agent:** general
- **Concurrency:** 1

**Prompt:**

Run full structural analysis:

```bash
npx fallow --format json --quiet > .pi/artifacts/gc-fallow.json
```

Extract key findings:
- Dead code (unused exports, files, dependencies)
- Code duplication (clone groups)
- Complexity hotspots (high cyclomatic complexity)
- Architecture boundary violations

Report findings as structured JSON to {phase_1_output}.

### Phase 2: Quality Grade Update

- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 1

**Prompt:**

Grade each domain by scanning findings from {phase_1_output}:

| Domain | Definition | Source |
|--------|------------|--------|
| Plugin layer | `.pi/extensions/*.ts` | Fallow + structural check |
| Command layer | `.pi/prompts/*.md` | Manual assessment |
| Skills layer | `.pi/skills/*/SKILL.md` | Fallow |
| Documentation | `.pi/context/*.md` | Manual + link checker |
| Agent layer | `.pi/agents/*.md` | Manual assessment |
| Templates | `.pi/templates/*.md` | Manual assessment |

For each domain, assign grade:
- **A** — No issues, well-maintained
- **B** — Minor issues, no blockers
- **C** — Notable decay, needs cleanup
- **D** — Significant decay, priority cleanup

Update `.pi/QUALITY.md` with current grades.

Report grade table to {phase_2_output}.

### Phase 3: Prioritize Findings

- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 2

**Prompt:**

Using {phase_2_output} grades and {phase_1_output} findings, classify each finding by severity:

| Severity | Criteria | Action |
|----------|----------|--------|
| P0 | Dead code in critical path, security hazard | Immediate fix PR |
| P1 | Duplication >5 instances, complexity >20 | File issue / schedule PR |
| P2 | Minor style drift, stale docs | Log for next GC cycle |
| P3 | Informational | Note only |

Report prioritized findings to {phase_3_output}.

### Phase 4: Open Cleanup PRs (Optional)

- **Agent:** general
- **Concurrency:** Dynamic (estimate 1-2 per P0/P1, min 1, max 5)
- **Depends on:** Phase 3

**Prompt:**

For each P0 and P1 finding from {phase_3_output}, spawn a `general` agent per finding using subagent:

```
subagent({
  agent: "general",
  task: `
    Understand this Fallow finding: [detail]
    Create a fix branch
    Apply the fix
    Verify with: npm run typecheck && npm run lint
    Open PR with conventional commit message
  `
});
```

Use subagent with parallel mode to spawn multiple fix agents concurrently.

Report list of opened PRs to {phase_4_output}.

### Phase 5: Report

- **Agent:** general
- **Concurrency:** 1
- **Depends on:** Phase 4

**Prompt:**

Generate final GC report by aggregating {phase_1_output}, {phase_2_output}, {phase_3_output}, {phase_4_output}:

```text
## GC Report — $(date -u +%Y-%m-%d)

| Domain | Grade | Issues | Trend |
|--------|-------|--------|-------|
| Plugins | A | 0 | → |
| Commands | B | 2 | ↓ |
| Skills | A | 0 | → |
| Docs | B | 1 | ↓ |
| Agents | A | 0 | → |
| Templates | A | 0 | → |

**P0:** 0 | **P1:** 2 | **P2:** 1 | **P3:** 3
**PRs opened:** 1
```

## Final Synthesis (Main Agent)

Aggregate all phase outputs into a single cleanup report. Highlight any P0/P1 issues that did not get auto-fixed and need human review.

## Invocation

```
/gc
```

Or as part of CI/scheduled task.
