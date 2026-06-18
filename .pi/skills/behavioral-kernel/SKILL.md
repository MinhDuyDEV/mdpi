---
name: behavioral-kernel
description: Use when work starts drifting into silent assumptions, overengineering, drive-by refactors, or vague completion claims. Re-centers the agent on a compact Pi-native execution kernel with concrete anti-pattern examples.
---

# Behavioral Kernel

A short reset skill for non-trivial work when the larger prompt is getting noisy.

## When to Use

- Work is drifting into silent assumptions, overengineering, or drive-by refactors
- You're about to add abstraction for a single use case
- You're changing adjacent code "while you're here"
- Completion is being claimed without a named proof path
- You're silently picking one interpretation from multiple valid readings

## When NOT to Use

- The task is a trivial, single-step change with an obvious answer
- You already surfaced assumptions and named the verification path up front
- Pure lookup/reference questions (no decision or diff involved)

## Kernel

1. **Clarify before committing** — surface assumptions or ask instead of silently choosing.
2. **Choose the smallest working change** — solve today's problem directly before inventing flexibility.
3. **Keep diffs surgical** — change only what the request requires; log unrelated issues and keep moving.
4. **Define proof before acting** — say how success will be verified before implementation, then run that proof after.

## Apply the Kernel

Before coding, write down:

- the ambiguity or assumptions in 1-3 bullets
- the smallest acceptable diff
- what you are explicitly not touching
- the verification command, test path, or evidence you will use

## Drift Signals

Stop and reload this kernel if you catch yourself:

- adding abstraction for a single use case
- changing adjacent code "while you're here"
- postponing verification until the end
- claiming completion without a named proof path
- silently picking one interpretation from multiple valid readings

## Recovery Move

When drift is detected:

1. Re-state the request in one sentence.
2. Re-state the smallest working change.
3. Re-state the proof path.
4. Delete or avoid anything outside that boundary.

## Pi-Specific Notes

- pi-srcwalk tools (`semantic_query`, `semantic_inspect`, `semantic_grep`, `semantic_show`) replace srcwalk CLI
- pi-search tools (`websearch`, `codesearch`, `context7`, `grepsearch`, `web_fetch`) replace webclaw
- `memory_search` (pi-hermes-memory) = durable LTM across sessions; `vcc_recall` = active-session history (not LTM)
- `subagent` tool replaces `task()` for delegation
- Avoid building "infrastructure for infrastructure's sake" — Pi already has 13 npm extensions

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I know what to do without reading the skill" | Drift happens silently. Re-read the kernel before it compounds. |
| "This edge case isn't important right now" | Edge cases ignored become edge-case bugs in production later. |
| "I'll just make this one quick change" | "Quick changes" outside scope are the primary vector for entropy. |
| "The skill is too restrictive for this task" | The restrictions exist because they prevent known failure modes. |

## Red Flags

- Adding abstraction for a single use case
- Changing adjacent code "while you're here"
- Postponing verification until the end
- Claiming completion without a named proof path
- Silently picking one interpretation from multiple valid readings

## Verification

After applying the behavioral kernel:

- [ ] The task scope is clearly defined and bounded
- [ ] No unrelated code was modified "while you're here"
- [ ] The smallest working change was chosen for each step
- [ ] Verification evidence exists before any completion claim
- [ ] Assumptions were surfaced and confirmed, not silently acted on
