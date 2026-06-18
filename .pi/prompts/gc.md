---
description: Run garbage collection — Fallow analysis, quality grading, and cleanup PRs
---

# Garbage Collection

Run structural analysis, update quality grades, and open cleanup PRs.

## Load Skills

- `fallow` skill
- `verification-before-completion` skill

## Phase 1: Run Fallow Scan

```bash
npx fallow --format json --quiet
```

Extract:
- Dead code (unused exports, files, dependencies)
- Code duplication (clone groups)
- Complexity hotspots (cyclomatic complexity)
- Architecture boundary violations

## Phase 2: Read Existing Quality Grades

Read `.pi/QUALITY.md` if it exists. Compare with current Fallow findings.

## Phase 3: Grade Each Domain

Run the structural check (use `.pi/scripts/gc-check.sh` if available, otherwise manual inspection):

```bash
bash .pi/scripts/gc-check.sh
```

Update `.pi/QUALITY.md` with grades per domain:

| Domain | Source | Grade |
|--------|--------|-------|
| Plugins | `.pi/extensions/*.ts` | A–D |
| Commands | `.pi/prompts/*.md` | A–D |
| Skills | `.pi/skills/` | A–D |
| Docs | `.pi/context/*.md` | A–D |
| Agents | `.pi/agents/*.md` | A–D |

## Phase 4: Open Cleanup PRs (if findings warrant)

For each P0/P1 finding from Fallow, spawn a `general` agent:

```typescript
subagent({
  agent: "general",
  task: `Fix this Fallow finding: [detail]. Run verification after.`
});
```

Wait for all fix tasks to complete. Verify each.

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
