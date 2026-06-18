---
description: Debug and fix a bug or failing test
argument-hint: "<description of bug or error>"
---

# Fix: $ARGUMENTS

Systematically debug and fix the reported issue.

## Load Skills

- `root-cause-tracing` skill
- `verification-before-completion` skill

## Before You Fix

- **Be certain**: Reproduce the issue before touching code
- **Don't guess**: Trace to root cause — never fix symptoms
- **Verify the fix**: Always reproduce the original issue first, then confirm it's gone
- **Escalate if stuck**: After 2 failed verification attempts, escalate with learnings

## Process

### Phase 1: Reproduce

```bash
# Reproduce the issue with the exact steps or command
```

### Phase 2: Isolate

- Search for the error message or symptom in the codebase using `semantic_grep`
- Trace the execution path to find the root cause using `semantic_inspect`
- Read the 2-4 most relevant files
- Distinguish symptom from root cause

### Phase 3: Fix

- Apply the minimal fix for the root cause
- Do not add speculative guards, tolerant readers, or defensive copies
- Prefer making the bad state impossible over handling all bad states

### Phase 4: Verify

```bash
npm run typecheck
npm run lint
npm test            # or vitest relevant test
```

If verification fails twice on the same approach, escalate with learnings.

## Failure Handling

| Scenario | Action |
|----------|--------|
| Cannot reproduce issue | Report reproduction steps attempted, ask for clarification |
| Root cause ambiguous | Trace backward through call stack, add instrumentation |
| Verification fails 2x | Stop, report blocker with learnings from both attempts |
| Fix causes regression | Revert fix, report regression with evidence |

## Stop Conditions

- Cannot reproduce after 3 attempts → stop, ask for clarification
- Fix causes regression → revert, report
- Verification fails 2x on same approach → stop, escalate with learnings
- Root cause is in third-party dependency → stop, report with upstream reference

## Output

Report:
1. Root cause (with file:line)
2. Fix applied
3. Verification results
4. What else was considered and rejected

## Related Skills

See `.pi/skills/INDEX.md` for the complete task → skill routing table.
