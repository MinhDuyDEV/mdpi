# 05 - Plugins Architecture (8 plugins)

## Tổng quan

`.opencode/plugin/` chứa **8 TypeScript plugins** (mỗi plugin = 1 file `.ts` entry + modules):

| Plugin | Purpose | Lines | Status vs Pi |
|---|---|---|---|
| `srcwalk` | Code-intel (7 tools: read, deps, map, callers, callees, flow, impact) | ~500 (srcwalk/ + srcwalk.ts) | ✅ Superset by `pi-srcwalk` |
| `memory` | 4-tier LTM (SQLite + FTS5) | 18 files, ~3000 lines | ❌ **No pi equivalent** |
| `session-summary` | Anchored iterative summarization | ~400 lines | ❌ No pi equivalent |
| `codesearch` | BM25-ranked csearch | ~600 lines | ⚠️ Adjacent (pi-search uses Exa AI) |
| `skill-mcp` | Bridge giữa skills và MCP servers | ~300 lines | ❌ No pi equivalent |
| `prompt-leverage` | 7-block framework transformation | ~200 lines | ✅ Analog (pi-augment) |
| `guard` | Curl-pipe blocker + conventional commits | ~60 lines | ❌ No pi equivalent |
| `copilot-auth` | GitHub Copilot OAuth + custom SDK | ~400 lines | ❌ No pi equivalent (very niche) |

**Pi's npm extensions tương đương:**
- `@sting8k/pi-srcwalk` (5 tools, superset of opencodekit's srcwalk)
- `@heyhuynhgiabuu/pi-search` (5 tools, cover grepsearch + context7 + Exa web)
- `@sting8k/pi-vcc` (deterministic compaction)
- `@tintinweb/pi-subagents` (subagent delegation, maxConcurrent=99)
- `pi-augment` (prompt enhancement, analog of prompt-leverage)
- `pi-boomerang` (autonomous task execution + handoff)
- `@tintinweb/pi-tasks` (todo tracking)

---

## A. Plugin: `srcwalk` (Code-Intel)

### Source: `/tmp/opencodekit-template/.opencode/plugin/srcwalk.ts` (đã đọc)

**Entry point:** `SrcwalkPlugin` exports 7 tools:
- `srcwalk_read` — Read files với optional section/range
- `srcwalk_deps` — Show imports + dependents for a file
- `srcwalk_map` — Directory tree overview
- `srcwalk_callers` — Reverse call graph (grep-based)
- `srcwalk_callees` — Forward call graph (grep-based)
- `srcwalk_flow` — Compact function orientation
- `srcwalk_impact` — Heuristic blast-radius triage

**Implementation:** Pure grep + tree + node:fs, NO external binary

### Pi equivalent: `@sting8k/pi-srcwalk` (5 tools)

| Tool | Maps to opencodekit | Note |
|---|---|---|
| `semantic_query` | (new) | NL → ranked code evidence, BM25 + RRF fusion |
| `semantic_inspect` | `srcwalk_callers` + `srcwalk_callees` + context | Combined into 1 tool |
| `semantic_grep` | (new, faster) | Trigram-indexed exact text/regex |
| `semantic_show` | `srcwalk_read` | Path:line → surrounding source |
| `semantic_review` | (new) | Diff review with srcwalk evidence |

**Architecture:**
- Wraps separate `srcwalk` Rust/Node CLI (BM25 + PRF cache, trigram index)
- 5 tools = strict superset (more sophisticated backend)
- Decorative sentinels: `<!-- pi-srcwalk:tools-rules:start -->` block in `before_agent_start`

**Kết luận:** `pi-srcwalk` mạnh hơn `opencodekit/plugin/srcwalk`. Không cần action.

---

## B. Plugin: `memory` (4-tier LTM) — **LARGEST GAP**

### Source: `/tmp/opencodekit-template/.opencode/plugin/memory.ts` (đã đọc 100 lines đầu)

**Architecture overview (từ header comments):**

```
Unified Memory Plugin v2
Consolidates all memory tools + hooks + compaction into a single plugin.

Systems:
1. Capture — message.updated → temporal_messages
2. Distillation — session.idle → TF-IDF compression
3. Curator — session.idle → pattern-matched observations
4. LTM Injection — system.transform → relevance-scored knowledge
5. Context Management — messages.transform → token budget enforcement

Tools: observation, memory-search, memory-admin
Module structure:
  memory.ts              — Plugin entry
  memory/tools.ts         — Core tools (observation, memory-search)
  memory/admin.ts         — Admin tools (memory-admin)
  memory/hooks.ts         — Event hooks, transforms, compaction
  [14 more files]
```

**Tools provided:**
- `observation` — create observations OR give feedback on existing ones
- `memory-search` — search observations by text OR read memory files by path
- `memory-admin` — admin operations (probably cleanup, stats)

**Hooks:**
- `message.updated` (Capture)
- `session.idle` (Distillation + Curator)
- `experimental.chat.system.transform` (LTM Injection)
- `experimental.chat.messages.transform` (Context Management)
- `experimental.session.compacting` (compaction integration)

**Backend:** SQLite + FTS5 (full-text search)

**Why this is the LARGEST gap for Pi:**
- Pi currently has `vcc_recall` (search session history) — không phải LTM
- Opencodekit's memory persists across sessions — Pi forgets everything
- LTM is what makes an agent "learn" from past interactions

### Pi equivalent: NONE (need to build `pi-memory`)

**Implementation effort:** 1-2 tuần (large package)
- Replicate 4 systems: Capture → Distill → Curate → Inject
- SQLite + FTS5 backend
- Tool: `observation`, `memory-search`, `memory-admin`
- Hooks: `tool.execute.after` (capture), `experimental.chat.system.transform` (inject)

**Detailed plan:** See `07-port-recommendations.md` Phase 2B.

---

## C. Plugin: `session-summary` (Anchored Iterative Summarization)

### Source: `/tmp/opencodekit-template/.opencode/plugin/session-summary.ts` (đã đọc 80 lines đầu)

**Architecture overview:**

```
Session Summary Plugin — Structured Persistent Context
Maintains a structured, incrementally-updated session summary that survives
DCP compression cycles ("anchored iterative summarization"). Tracks:

1. File artifact trail — which files were read, modified, or created
2. Decisions — what was decided and why (rationale + alternatives)
3. Session intent and state — what we're doing and where we are
4. Continuation — next steps to resume work without re-fetching

On each system.transform, the summary is injected into context.
On compaction, the summary is persisted to disk so it survives the cycle.

Persistence: .opencode/state/session-summary.md
Hooks: tool.execute.before, experimental.chat.system.transform, experimental.session.compacting
```

**File structure:**
- `session-summary.ts` — entry
- `session-summary/serialize.js` — normalize, extract, format
- `session-summary/tracking.js` — enforce limits, addRead/Modified/Created/Decision
- `session-summary/persist.js` — load, save

**Key feature: "anchored iterative summarization"**
- Tracks read/edit/write tool calls incrementally
- Persists summary to disk before DCP compression
- Merges incremental summaries across compaction cycles
- Inspired by: https://factory.ai/news/evaluating-compression

**Hooks:**
- `tool.execute.before` — track read/edit/write
- `experimental.chat.system.transform` — inject into context
- `experimental.session.compacting` — persist before compaction

### Pi equivalent: PARTIAL (pi-vcc handles compaction, but no anchored tracking)

**Implementation effort:** 3-5 ngày
- File artifact tracking (read/edit/write events)
- Decision tracking (manual `decision()` calls or auto-detect)
- Persist to `/Users/minhduydev/.pi/agent/state/session-summary.md`
- Inject into system prompt on session start
- Integrate with pi-vcc compaction (persist before compact)

**Plan:** See `07-port-recommendations.md` Phase 2C.

---

## D. Plugin: `codesearch` (BM25 Csearch)

### Source: `/tmp/opencodekit-template/.opencode/plugin/codesearch.ts` (đã đọc 50 lines)

**Architecture:**

```
Csearch Plugin — Multi-Keyword Code Chunk Search with BM25 Ranking
Bridges natural language queries to structural code chunk retrieval.
The agent's LLM provides semantic query expansion; this tool provides
broad multi-keyword retrieval with function-level chunk extraction
and BM25 relevance ranking.

Design philosophy:
  - Zero infrastructure: no embeddings, no vector DB, no network
  - Function-level chunk extraction returns complete code units, not fragments
  - BM25 scoring provides principled relevance ranking
```

**Tool: `csearch`**
- Args: `query` (space-separated keywords), `scope` (optional)
- Returns: ranked function/class-level code chunks

**Implementation:** ripgrep + BM25 scoring + function-level extraction

**Module structure:**
- `codesearch.ts` — entry
- `codesearch/utils.js` — expandQuery, searchKeyword, ensureRgAvailable, resolveScope
- `codesearch/extract.js` — extractChunksFromMatches
- `codesearch/ranking.js` — scoreChunks (BM25)
- `codesearch/format.js` — formatResults

### Pi equivalent: PARTIAL (pi-search uses Exa AI, not local BM25)

**Comparison:**

| Aspect | opencodekit csearch | pi-search codesearch |
|---|---|---|
| Backend | Local ripgrep + BM25 | Remote Exa AI |
| Corpus | Local codebase | Internet |
| Network | None | Required |
| Speed | Fast (local) | Slower (API call) |
| Airgapped | ✅ Works | ❌ Requires network |
| Real-world patterns | ❌ No (only local) | ✅ Yes (Exa indexes GitHub etc.) |

**Kết luận:** Different paradigms. Pi-search's Exa backend is better for "find real-world examples", opencodekit's csearch is better for "search local codebase with structure awareness". For LOCAL codebase search, pi already has `semantic_query/inspect/grep` (pi-srcwalk).

**Action:** None — `pi-srcwalk` covers local structure-aware search better than csearch.

---

## E. Plugin: `skill-mcp` (MCP Bridge)

### Source: `/tmp/opencodekit-template/.opencode/plugin/skill-mcp.ts` (đã đọc 50 lines)

**Architecture:**

```
Skill-MCP Plugin — Bridge between OpenCode skills and MCP tools.
Loads MCP server configs from skill directories (mcp.json or YAML frontmatter),
spawns MCP processes, and exposes their tools to the agent via skill_mcp tools.

Implements the Ampcode-style MCP skill pattern:
- SKILL.md frontmatter or mcp.json declares MCP servers
- includeTools filtering reduces token usage
- Lifecycle management via connect / disconnect
```

**Tools:**
- `skill_mcp` — Invoke MCP tools from skill-embedded MCP servers
- `skill_mcp_status` — Show active MCP connections

**Example usage:**
```
skill_mcp(skill_name="playwright", list_tools=true)
skill_mcp(skill_name="playwright", tool_name="browser_navigate", arguments='{"url": "..."}')
```

**Module structure:**
- `skill-mcp.ts` — entry
- `skill-mcp/types.js` — McpServerConfig
- `skill-mcp/utils.js` — findSkillPath, loadMcpConfig
- `skill-mcp/client.js` — connectServer, disconnectAll, sendRequest, buildLoadedMcpDetails

### Pi equivalent: NONE (Pi has its own MCP mechanism)

**Pi's MCP approach:** Settings.json có `mcp` field (cấu hình MCP servers globally), không per-skill.

**Implementation effort:** 1-2 ngày
- Replicate per-skill MCP loading
- Add `includeTools` filtering
- Lifecycle management

**Value:** Medium — chỉ cần nếu user dùng nhiều MCP servers per skill.

**Plan:** See `07-port-recommendations.md` Phase 2C (optional).

---

## F. Plugin: `prompt-leverage` (7-Block Framework)

### Source: `/tmp/opencodekit-template/.opencode/plugin/prompt-leverage.ts` (đã đọc 60 lines)

**Architecture:**

```
Prompt Leverage Plugin
Automatically upgrades every user prompt with the seven-block framework
before the AI processes it.
Uses chat.message hook — safely inspects input structure before accessing properties.
```

**Task detection (từ TASK_KEYWORDS):**
- coding: code, bug, repo, refactor, test, implement, fix, function, api, add, update, remove
- research: research, compare, find, latest, sources, analyze, look up
- writing: write, rewrite, draft, email, memo, blog, copy, tone
- review: review, audit, critique, inspect, evaluate, assess
- planning: plan, roadmap, strategy, framework, outline
- analysis: analyze, explain, break down, diagnose, root cause

**7-block framework (inferred from header):**
- Objective
- Context
- WorkStyle
- ToolRules
- OutputContract
- Verification
- DoneCriteria

### Pi equivalent: `pi-augment` (analog)

**Comparison:**

| Aspect | opencodekit prompt-leverage | pi-augment |
|---|---|---|
| Mechanism | Transform hook (auto-rewrites every prompt) | Slash command (manual invoke) |
| Trigger | Automatic (every user message) | User explicitly invokes |
| Granularity | 7-block framework | ? (similar idea) |
| 3rd-party | No | No |

**Kết luận:** Different UX patterns (auto vs manual), but same concept. Pi's `pi-augment` covers the same ground.

**Action:** None.

---

## G. Plugin: `guard` (Safety Hooks)

### Source: `/tmp/opencodekit-template/.opencode/plugin/guard.ts` (đã đọc 60 lines)

**Architecture:**

```
Guard Plugin — Agent Safety & Convention Enforcement
Ported from pikit's extensions/guard.ts.

1. Pipe-to-shell blocker: rejects `curl … | bash` / `wget … | bash` patterns.
2. Conventional Commits: rejects `git commit` with non-compliant messages.
```

**Implementation:** Single `tool.execute.before` hook (60 lines)

**Hook logic:**
```typescript
"tool.execute.before": async (input, output) => {
  if (input.tool !== "bash") return;
  
  const cmd = output.args?.command ?? "";
  
  // --- curl/wget | bash blocker ---
  if (/(?:^|[;&|])\s*(?:curl|wget)\s.*\|\s*(?:ba)?sh/i.test(cmd)) {
    throw new Error("Blocked: detected pipe-to-shell pattern...");
  }
  
  // --- conventional commit enforcer ---
  const commitMatch = cmd.match(/git\s+commit\s/);
  if (!commitMatch) return;
  
  const msgMatch = cmd.match(/(?:-m|--message=?)\s*"([^"]*)"/) ?? ...;
  const msg = msgMatch?.[1];
  
  if (!msg) {
    throw new Error("Blocked: git commit missing -m message...");
  }
  
  if (!CONVENTIONAL_RE.test(msg)) {
    throw new Error("Blocked: commit message is not Conventional Commits compliant...");
  }
}
```

**Conventional Commits regex:**
```typescript
const CONVENTIONAL_RE = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+/;
```

### Pi equivalent: NONE

**Implementation effort:** 2-3 giờ (small package)
- 60 lines core logic (copy from opencodekit)
- Wrap as pi extension with `tool.execute.before` hook
- Optional: add more rules (no `rm -rf`, no `git push --force`, etc.)

**Value:** 🟢 Cao — safety hooks are critical for production use

**Plan:** See `07-port-recommendations.md` Phase 2C.

---

## H. Plugin: `copilot-auth` (GitHub Copilot OAuth)

### Source: `/tmp/opencodekit-template/.opencode/plugin/copilot-auth.ts` (đã đọc 50 lines)

**Architecture:**

```
GitHub Copilot Auth Plugin
Simplified auth provider without token expiration checks

Claude Reasoning Support:
This plugin adds `thinking_budget` to the request body for Claude models.
The Copilot API accepts this parameter and returns reasoning in the response.
```

**OAuth flow:**
- Client ID: `Ov23li8tweQw6odWQebz`
- Polling safety margin: 3000ms
- Headers: `User-Agent: opencode/1.3.17`

**Custom SDK:** `plugin/sdk/copilot/` — handles `reasoning_text` / `reasoning_opaque` conversion to AI SDK's reasoning content parts

### Pi equivalent: NONE (Pi has `pi-ollama-cloud` but not Copilot)

**Implementation effort:** 1-2 ngày
- OAuth flow + token storage
- Custom AI-SDK provider
- thinking_budget support

**Value:** ⚠️ Thấp — niche use case (Copilot subscribers only). Pi's `pi-ollama-cloud` covers Ollama users.

**Action:** SKIP (unless user specifically uses Copilot).

---

## I. Plugin: `plugin/package.json` (đã đọc)

```json
{
  "name": "opencode-plugins",
  "type": "module",
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.13"
  }
}
```

**Single dep:** OpenCode plugin SDK

**Plugin file size limits (từ `architecture.md`):**
- Plugin: max 300 lines
- SDK: max 150 lines
- Command: max 500 lines
- Workflow: max 150 lines

**Pi extensions tương đương:**
- Pi extensions dùng `@earendil-works/pi-coding-agent` SDK (or local extension loader)
- File size không có hard limit, nhưng convention là nhỏ gọn

---

## J. Coverage Matrix Summary

| Plugin | Lines | Opencodekit value | Pi value | Action |
|---|---|---|---|---|
| `srcwalk` | ~500 | Code-intel 7 tools | ✅ Superseded by `pi-srcwalk` (5 tools, more sophisticated) | None |
| `memory` | ~3000 | 4-tier LTM | ❌ **Largest gap** | Build `pi-memory` (Phase 2B) |
| `session-summary` | ~400 | Anchored iterative summary | ❌ Partial (pi-vcc = end-of-task only) | Build `pi-session-summary` (Phase 2C) |
| `codesearch` | ~600 | Local BM25 csearch | ⚠️ Adjacent (pi-search uses Exa AI) | None — pi-srcwalk covers local search |
| `skill-mcp` | ~300 | Per-skill MCP bridge | ❌ Pi has global MCP only | Optional `pi-skill-mcp` (Phase 2C) |
| `prompt-leverage` | ~200 | 7-block framework | ✅ Analog (pi-augment) | None |
| `guard` | ~60 | Curl-pipe + conventional commits | ❌ | Build `pi-guard` (Phase 2C) |
| `copilot-auth` | ~400 | GitHub Copilot OAuth | ❌ Very niche | SKIP |

---

## K. Implementation Priority

| Package to build | Lines | Effort | Value | Phase |
|---|---|---|---|---|
| `pi-guard` | ~150 TS | 2-3 giờ | 🟢 Cao (safety) | 2C |
| `pi-session-summary` | ~400 TS | 3-5 ngày | 🟡 Medium (compaction complement) | 2C |
| `pi-memory` | ~2000 TS | 1-2 tuần | 🟢 **Cao nhất** (largest gap) | 2B |
| `pi-skill-mcp` | ~300 TS | 1-2 ngày | 🟠 Lower (niche) | 2C (optional) |
| `pi-copilot` | ~400 TS | 1-2 ngày | ⚪ Skip (too niche) | Skip |

**Net recommendation:**
- Phase 2B: `pi-memory` (largest gap, highest value)
- Phase 2C: `pi-guard` (small, high value) + `pi-session-summary` (medium value)
- Optional: `pi-skill-mcp` (only if user needs per-skill MCP)
- Skip: `pi-copilot` (too niche)
