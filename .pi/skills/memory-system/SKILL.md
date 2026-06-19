---
name: memory-system
description: "Documents pi-hermes-memory capabilities: background auto-review, correction detection, tools (memory, memory_search, session_search), and commands. Load when the agent needs to understand or leverage the memory system — searching past failures, saving learnings, or learning the auto-flywheel."
---

# Memory System (pi-hermes-memory)

## Overview

pi-hermes-memory is the **persistent memory extension** that runs automatically in every pi session. It provides a self-learning flywheel without the agent needing to trigger it manually. This skill documents its capabilities so the agent can leverage them strategically.

## Auto-Flywheel (already running — no trigger needed)

### 1. Background Review — automated "compound" every ~10 turns

Every N turns (default: 10) OR after accumulating enough tool calls, pi-hermes-memory spawns a background child process that:

- Snaps the full conversation as `[USER]`/`[ASSISTANT]` prefixed text
- Reviews for: user preferences, corrections, failures, insights, conventions, tool-quirks  
- Saves notable findings to `MEMORY.md`, `USER.md`, or `failures.md`
- Only acts if there's something genuinely worth saving ("Nothing to save." otherwise)
- Non-blocking — the session continues while the review runs

**→ You do NOT need to call this yourself.** It fires automatically on `turn_end`.

### 2. Correction Detection — real-time error learning

On every user message, pi-hermes-memory checks for correction patterns:

| Strength | Patterns | Example |
|----------|----------|---------|
| **Strong** (always trigger) | `"don't do that"`, `"not like that"`, `"I said..."`, `"I told you..."`, `"that's not what I..."` | "Don't do that — use pnpm instead" |
| **Weak** (needs directive) | `"no, ..."`, `"wrong, ..."`, `"actually..."` + verb like "use", "change", "fix" | "No, use the other approach" |
| **Negative** (suppress) | `"no worries"`, `"no problem"`, `"actually looks great"` | Ignored |

When detected → immediately saves to `target='failure', category='correction'` with the reason "User corrected the agent".

**→ Corrections are captured automatically.** You don't need to save them — it's already done.

### 3. Session Flush

Before session compaction/shutdown, a flush prompt extracts anything worth remembering from the closing session.

### 4. Auto-Consolidation

When `MEMORY.md` reaches the 5,000 character limit, entries are auto-merged, deduped, and staled entries (>30 days, unreferenced) are removed.

## Tools Available (agent can call)

| Tool | Purpose | Key params |
|------|---------|------------|
| `memory` | Save/update/delete memories | `action` (add/replace/remove), `target` (memory/user/failure/project), `content`, `category` |
| `memory_search` | Search durable memories across sessions | `query`, `target`, `category`, `project` |
| `session_search` | Search past conversation messages | `query`, `project`, `role` |
| `skill_manage` | Create/update procedural skills | `action`, `name`, `scope`, `when_to_use`, `procedure_steps` |

## Memory Categories (for `target='failure'`)

| Category | When to use | Example |
|----------|------------|---------|
| `failure` | Something tried that didn't work | "Used localStorage for tokens — XSS vulnerability" |
| `correction` | User corrected the agent | "Use pnpm, not npm" |
| `insight` | Durable learning from experience | "Complexity over 15 in a single function causes CI timeout" |
| `preference` | User preference or work style | "Prefers terse responses, no cheerleading" |
| `convention` | Project or team convention | "Monorepo with turborepo, uses pnpm workspaces" |
| `tool-quirk` | Non-obvious tool behavior | "tsc --noEmit fails silently on .d.ts syntax errors" |

## Commands Available (user can run)

| Command | Purpose |
|---------|---------|
| `/memory-insights` | Show everything stored in memory |
| `/memory-skills` | List all saved procedural skills |
| `/memory-consolidate` | Manually trigger memory cleanup/merge |
| `/memory-interview` | Onboarding interview to pre-fill user profile |
| `/memory-switch-project` | List all project memories |
| `/memory-index-sessions` | Import past sessions for search |
| `/memory-sync-markdown` | Backfill Markdown entries into SQLite search |
| `/memory-preview-context` | Show memory policy or legacy prompt blocks |
| `/learn-memory-tool` | Interactive guide to the memory system |

## When to Use memory_search

Use `memory_search` when you need **durable, cross-session knowledge** — things that happened in previous sessions, not just the current one:

- **Searching past failures**: `memory_search({ query: "similar error", target: "failure", category: "failure" })`
- **Finding project conventions**: `memory_search({ query: "typescript pattern", project: "<project>" })`
- **Recalling user preferences**: `memory_search({ query: "prefers", target: "user" })`
- **Checking tool quirks**: `memory_search({ query: "pnpm install", category: "tool-quirk" })`

Use `vcc_recall` when you need **current-session lineage** — what was just discussed or tried in this active workflow.

Use both together in Guard phases for maximum recall coverage.

## When to Explicitly Save (manual `memory` tool)

Even though auto-review runs every 10 turns, manually save when:

- **On 2x verification failure** — save the failed approach immediately so future sessions won't repeat it. Use `target='failure', category='failure'` with: what was tried, why it failed, the error, and what worked instead (if known).
- **On a critical discovery** — if you learn something that would save 15+ minutes for future-self, don't wait for the auto-review cycle.
- **On user's explicit request** — "remember this" → save immediately.
- **On learning a tool-quirk** — non-obvious behavior that would trip up a future agent.

## Pitfalls

- **Waiting for auto-review for critical failures** — if verification just failed 2x, save that failure NOW. The auto-review might not fire for 10 more turns.
- **Using vcc_recall for cross-session knowledge** — vcc_recall is lineage-scoped (active session); it may not find failures from a closed session. Use `memory_search` instead.
- **Over-saving** — don't save task progress, session outcomes, or temporary state. The auto-review already captures durable learnings. Manual saves are for URGENT or USER-REQUESTED facts only.
- **Assuming memory_search has everything** — if the SQLite sync is broken (the memory-sync-markdown command can fix this), older Markdown entries may not appear in search. The `/memory-sync-markdown` command backfills them.

## Verification

Before relying on memory_search:

- [ ] Check if the SQLite sync is healthy (`/memory-insights` shows recent entries)
- [ ] If search returns nothing but you KNOW the info was saved, run `/memory-sync-markdown` 
- [ ] Use both `memory_search` AND `vcc_recall` in Guard phases for dual coverage
- [ ] When saving a failure, include: what was tried, why it failed, the error message, reproduction steps
