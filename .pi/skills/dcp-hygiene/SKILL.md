---
name: dcp-hygiene
description: "Use at command/phase closure points to compress closed exploratory work-streams via the pi-dcp `compress` tool, preserving file:line refs, root causes, decisions, and verification results in the summary. No-ops gracefully when DCP is not installed."
---

# DCP Hygiene

## When to Use

- A slash command's Report/Closure phase just finished writing its artifact (spec.md, plan.md, progress.md, fix.md, audit.md, research.md, etc.) — the exploratory tool output (reads, greps, bash) that produced it is now closed.
- A long command transitions between phases and the previous phase's detailed output is captured in the next phase's input or an artifact.
- A workflow loop iteration (e.g. quality-loop) finishes a fix cycle and is about to re-review — accumulated output can be compressed before the next round.

## When NOT to Use

- The `compress` tool is not registered (DCP extension not installed, or `compress.permission: "deny"`) — see No-op clause below.
- The work-stream is still in-flight or spans your most recent turn — DCP turn protection (last 3 turns) already refuses these; don't try.
- The user just asked about the content you'd be compressing — they still need it verbatim.
- The command is read-only/scaffold and produced almost no tool output (`/status`, `/close`, `/loop-init`, `/loop-check`, `/loop-review`) — compressing near-empty streams wastes more tokens than it saves.
- Inside orchestrator workflows' phase prompts — subagents carry their own context; only the orchestrator's accumulated summaries matter, and those are bounded by "Keep under N words" per prompt.

## Core Principle

**Compress closed work, preserve the facts that produced it.**

A compress call only pays off when (a) the tool output is genuinely closed and (b) the summary keeps every fact a later turn might need. A lossy summary that drops a file:line or a root cause is worse than no compression — it forces a re-read.

## The Compress Protocol (range mode)

DCP's default `compress.mode` is `"range"` — pass the FIRST and LAST tool-call IDs of the closed span.

1. **Identify the closed span** — the contiguous block of tool calls from the start of the just-completed phase/section up to (but not including) the current in-flight turn.
2. **Pick endpoints** — `startToolCallId` = first call of the span, `endToolCallId` = last call of the span. Everything between (inclusive) is summarized, except protected tools (write/edit/todo/task/skill/compress) which are appended verbatim.
3. **Never pick endpoints inside your most recent turn or in-flight work** — DCP refuses these upfront; respect the boundary.
4. **Write a lossless-but-terse summary** in the `summary` argument. Include:
   - What was accomplished (one line)
   - **Concrete facts**: file paths, line numbers, error messages, decisions made
   - Root cause / diagnosis (for `/fix`)
   - Verification results (for `/verify`, `/ship`)
   - What is still open / unresolved
5. **The replacement applies on the next LLM request** — your current turn still sees the originals, so you can read them while writing the summary.

## What to Preserve (per command)

| Command | Must keep in summary |
|---------|----------------------|
| `/fix` | root cause with file:line, fix applied, verification results |
| `/verify` | gate results (typecheck/lint/test pass/fail), completeness score, phantom score |
| `/ship` | tasks completed/total, commits made, verification gate results, review summary |
| `/gc` | quality grades (before→after), issue counts by severity, PRs opened |
| `/audit` | pattern, occurrence count, issues by severity with file:line, recommended fixes |
| `/research` | questions, answer status + confidence, key insights, sources |
| `/plan` | discovery level, observable truths, required artifacts, dependency waves |
| `/init` | detected tech stack, validated commands, created files |

## What NEVER to Compress

- Your most recent turn (turn protection: last 3 turns are immune anyway).
- In-flight work — anything you're still actively reading/editing.
- Content the user just referenced in their last message.
- Protected tools' output (write/edit/todo/task/skill/compress) — DCP appends these verbatim regardless, so don't exclude them from your span; just know they survive.

## No-op Clause (portability)

This skill must work whether or not DCP is installed:

- If the `compress` tool is **not available** in the current tool set, **skip compression entirely**. The artifact (spec.md/plan.md/progress.md/etc.) already captures the durable facts — skipping is correct, not a failure.
- If `compress` is available but the closed span is tiny (< ~5 tool calls, < ~2k tokens of output), the compress call costs more than it saves — skip.
- Never error or retry on a missing `compress` tool. Treat it as an optional optimization.

## Procedure

### At a closure point

1. Confirm the work-stream is actually closed (artifact written OR next phase already has the summary it needs).
2. Check: is `compress` available? If no → stop here, report "DCP not installed — skipped, artifact captures facts."
3. Check: is the span worth it? (≥ ~5 tool calls, ≥ ~2k tokens). If no → skip.
4. Call `compress({ startToolCallId, endToolCallId, topic, summary })` with a terse, lossless summary preserving the table above.
5. Continue to the next phase/command. The compression applies on the next request.

### At a mid-command phase transition (long commands only: `/ship`, `/fix`, `quality-loop`)

1. Confirm the previous phase's output is fully consumed by the next phase's input (the next prompt references `{phase_N_output}` or the artifact).
2. Compress the previous phase's exploratory calls (reads/greps/bash), NOT the phase output summary itself if it's about to be passed forward.
3. Proceed to the next phase.

## Pitfalls

- **Compressing too early** — before the artifact is written — loses the facts with nowhere captured. Always write the artifact first, then compress what produced it.
- **Lossy summaries** — dropping file:line or "because" clauses forces expensive re-reads. Terse ≠ incomplete.
- **Compressing the phase output you're about to pass forward** — the next phase needs it. Compress the *exploratory calls* that produced the output, not the output itself.
- **Forcing compress when DCP is absent** — errors and wastes a turn. The no-op is the correct behavior.
- **Compressing inside turn protection** — DCP refuses; don't try to work around it.
- **Over-compressing short commands** — a 3-call `/status` has nothing worth compressing.

## Verification

Before claiming a compress was done correctly:

- [ ] `compress` tool was available (else no-op was the correct outcome)
- [ ] The compressed span was genuinely closed (artifact written or output consumed)
- [ ] Summary preserves file:line, root cause/decisions, verification results per the table above
- [ ] No endpoint landed inside the most recent turn or in-flight work
- [ ] The next phase/command still has everything it needs (no forced re-reads)

If `compress` was unavailable and you skipped — that's a successful no-op, not a failure. Report "DCP not installed — artifact captures facts; skipped compression."