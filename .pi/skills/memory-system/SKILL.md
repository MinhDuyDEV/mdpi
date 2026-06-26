---
name: memory-system
description: "Documents the in-house markdown memory layer (.pi/extensions/memory.ts + skill-manage.ts + session-search.ts): memory/memory_search/session_search/skill_manage tools, before_agent_start auto-inject brief, deterministic correction detection, and /memory-insights /memory-consolidate /memory-import-hermes commands. Load when the agent needs to understand or leverage the memory system — searching past failures, saving learnings, or running maintenance."
---

# Memory System (in-house markdown)

## Overview

The kit's memory layer is **in-house** (`.pi/extensions/memory.ts`, `skill-manage.ts`, `session-search.ts`) — markdown files in `.pi/memory/`, in-process TF-IDF retrieval, `before_agent_start` auto-injection, deterministic correction detection, secret scanning. **No SQLite, no native dep, no LLM subprocess.** It replaces the former `npm:pi-hermes-memory` (reverted 2026-06-24 due to recurring `better-sqlite3` corruption, LLM-subprocess cost on every background review/correction/consolidation, and policy-only injection that missed memory when the agent "forgot" to search).

## How memory surfaces (no trigger needed)

- **Auto-inject brief** — at every `before_agent_start`, the extension keyword-matches your prompt against `.pi/memory/*.md` and injects a compact **Memory Brief** (~1.5k chars) of relevant entries into the system prompt. Memory surfaces automatically — you do NOT have to call `memory_search` for it to appear. (Fixes hermes's policy-only "agent forgets to search" failure.)
- **`<memory-policy>` block** — also injected each turn, telling you when to `memory_search` for deeper recall.

## Tools available

| Tool | Purpose | Key params |
|------|---------|------------|
| `memory` | Save/update/delete a markdown entry in `.pi/memory/*.md` | `action` (add/replace/remove), `target` (memory/user/project/failure), `content`, `category` (for target=failure), `id`/`old_text` (replace/remove) |
| `memory_search` | In-process TF-IDF over `.pi/memory/*.md` (no SQLite) | `query`, `target`, `category`, `limit` |
| `session_search` | Grep pi's JSONL session store (current project) | `query`, `project`, `role`, `limit` |
| `skill_manage` | CRUD procedural skills (SKILL.md) | `action` (create/view/patch/update/edit/delete/list), `name`/`skill_id`, `scope` (project/global), structured fields or `content` |

## Memory categories (for `target=failure`)

| Category | When to use |
|----------|------------|
| `failure` | Something tried that didn't work |
| `correction` | User corrected the agent (also auto-captured — see below) |
| `insight` | Durable learning from experience |
| `preference` | User preference or work style |
| `convention` | Project or team convention |
| `tool-quirk` | Non-obvious tool behavior |

`target=memory`/`user`/`project` are uncategorized facts (category ignored).

## Storage

`.pi/memory/{USER,PROJECT,MEMORY,LESSONS}.md` — gitignored, repo-local, portable. Entry format: `<!-- mem:<id> cat:<category> ts:<ts> -->` + `### <title>` + narrative. Cross-project user facts belong in `~/.pi/agent/AGENTS.md` (auto-loaded), not here.

## Deterministic correction detection (0 LLM)

On every user message, the extension checks for correction patterns (EN + VI):

- **Strong** — "don't do that", "not like that", "I said/told you", "that's not what I", "no, don't", "stop doing/using", "đừng làm/dùng/chạy/cài/thêm", "không phải vậy/thế", "sai rồi", "tôi đã nói/bảo".
- **Weak** — "no/wrong/actually, ..." + directive verb (use/change/fix/switch/prefer/...).
- **Negative (suppressed)** — "no worries", "looks great/good", "that's right/fine", "đúng rồi", "tốt rồi", "ok rồi".

When detected → auto-saves a `[correction]` entry to `LESSONS.md` (target=failure, category=correction). Rate-limited 1 save per 3 user turns. **You do NOT need to save corrections manually** — but DO save manually when you want a richer/curated entry than the raw correction text. Disable: env `PI_MEMORY_NO_CORRECTION=1`.

## Commands

| Command | Purpose |
|---------|---------|
| `/memory-insights` | List all entries grouped by file |
| `/memory-consolidate` | Dedupe exact-duplicate entries + cap per file (archive oldest beyond 60) |
| `/memory-import-hermes` | Migrate hermes markdown (`~/.pi/agent/pi-hermes-memory/{USER,MEMORY,failures}.md`) into `.pi/memory/` (titles prefixed `[hermes]` for review/prune) |

## When to use memory_search

Use `memory_search` for **durable, cross-session knowledge** — past failures, conventions, preferences, tool-quirks:

- `memory_search({ query: "similar error", target: "failure", category: "failure" })`
- `memory_search({ query: "prefers", target: "user" })`
- `memory_search({ query: "pnpm", project: "<project>" })`

Use `vcc_recall` for **current-session lineage** (what was just discussed). Use both in Guard phases for dual coverage.

## When to explicitly save (manual `memory`)

Correction detection runs automatically, but manually save when:

- **On 2× verification failure** — save the failed approach immediately (`target=failure`, `category=failure`) so future sessions don't repeat it.
- **On a critical discovery** — something that would save 15+ minutes for future-self.
- **On user's explicit request** — "remember this".
- **On learning a tool-quirk** — non-obvious behavior.

## Pitfalls

- **Correction capture is coarse** — it saves the raw user correction text, not an LLM-distilled lesson. Prune noisy `[correction]` entries via `memory remove` or `/memory-consolidate`.
- **`skill_manage` project scope writes to `.pi/skills/` (committed)** — runtime-created skills ship with the kit. Curate/prune or gitignore if personal-only.
- **`session_search` is bounded** — recent ~40 JSONL files, current project by default. Not a full cross-project index.
- **Lexical only** — TF-IDF/keyword, no semantic synonymy ("deploy" ≈ "ship" needs embeddings, deferred).
- **Repo-local** — memory is this-project-this-user (gitignored); not auto-shared across projects.

## Common Rationalizations

| Rationalization | Reality |
|-----------------|--------|
| "I'll just remember it in context this session" | Context is ephemeral — compaction/`/compact`/new session wipes it. Markdown memory survives across sessions and is auto-injected via the brief. Save durable facts explicitly. |
| "`memory_search` is the same as `websearch`/`codesearch`" | `websearch`/`codesearch` hit the open web; `memory_search` is in-process TF-IDF over **this repo's** `.pi/memory/*.md` for project-specific failures/conventions/preferences. Web search cannot know that `better-sqlite3` corrupted here, or that you prefer untrimmed descriptions. |
| "Corrections are noise — I'll skip saving them" | Correction detection is deterministic (0 LLM) and auto-saves to `LESSONS.md`. Skipping manual curation means raw correction text accumulates; run `/memory-consolidate` and `memory remove` to prune, don't disable capture (you lose the signal entirely). |
| "The auto-injected brief is enough, no need to `memory_search`" | The brief is ~1.5k chars, keyword-matched only. Deeper/different-topic recall needs an explicit `memory_search` query. The brief surfaces, the tool drills. |
| "`vcc_recall` replaces `memory_search`" | `vcc_recall` searches **current-session lineage** (pruned JSONL); `memory_search` searches **cross-session markdown**. They cover different time horizons — use both in Guard phases. |
| "Memory is RAG — it retrieves docs/chunks" | This is **memory, not RAG**. No embeddings, no vector store, no doc chunking. TF-IDF + keyword over curated markdown entries you (or correction detection) wrote. It's a durable fact layer, not a knowledge-base retriever. |

## Red Flags

- Using `websearch`/`codesearch` for **project-specific facts** (e.g. "did better-sqlite3 corrupt in this repo?") instead of `memory_search` — the web can't know your repo's history.
- Ignoring the auto-injected `<memory-policy>` block / Memory Brief — repeating work a prior session already did (e.g. re-investigating hermes removal that's already a `failure` entry).
- Never running `/memory-consolidate` despite duplicate `[hermes]`-prefixed or repeated `[correction]` entries accumulating in `.pi/memory/*.md`.
- Saving **secrets** via `memory` (token scanning blocks them, but attempting it signals a misuse — secrets belong in env/secret manager, never markdown memory).
- Treating `session_search` as a cross-project index — it's bounded to recent ~40 JSONL files of the **current project**; expecting global recall produces false negatives.
- Disabling correction capture (`PI_MEMORY_NO_CORRECTION=1`) to "clean up noise" instead of pruning entries — you lose the only deterministic correction signal.
- Saving task progress / temporary state (e.g. "currently editing file X") as memory entries — memory is for **durable** facts only; progress state belongs in todos/session lineage.
- Conflating `skill_manage` (procedural SKILL.md CRUD) with `memory` (fact entries) — skills are committed procedure docs; memory is gitignored repo-local facts. Writing a skill when you meant to save a lesson pollutes `.pi/skills/`.

## Verification

Before relying on memory_search:

- [ ] `.pi/memory/*.md` exist (created on first save) — `/memory-insights` lists entries.
- [ ] If a known entry isn't returned, check the file directly (`cat .pi/memory/LESSONS.md`).
- [ ] Use `memory_search` AND `vcc_recall` in Guard phases for dual coverage.
- [ ] When saving a failure, include: what was tried, why it failed, the error, what worked instead.