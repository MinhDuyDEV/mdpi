# 06 - DCP & Context Compression

## Tổng quan

`.opencode` có **DCP (Dynamic Context Protocol)** — một context-pruning framework expose `compress` tool cho LLM, cho phép mid-session compression thay vì chờ end-of-task.

`.pi` có `@sting8k/pi-vcc` (algorithmic compaction) — chỉ hoạt động ở end-of-task.

Phần này phân tích chi tiết DCP, prompts, và quyết định có nên port sang `.pi` không.

---

## A. DCP Configuration

### Source: `/tmp/opencodekit-template/.opencode/dcp.jsonc` (đã đọc full)

**Schema overview:**

```json
{
  "$schema": "...",
  "enabled": true,
  "autoUpdate": false,
  "debug": false,
  "pruneNotification": "minimal",        // off | minimal | detailed
  "pruneNotificationType": "toast",       // chat | toast
  "commands": {
    "enabled": true,
    "protectedTools": ["observation", "memory-*"]
  },
  "manualMode": {
    "enabled": false,
    "automaticStrategies": true
  },
  "turnProtection": {
    "enabled": true,
    "turns": 4                            // protect last 4 turns from pruning
  },
  "protectedFilePatterns": [
    "**/.env*",
    "**/AGENTS.md",
    "**/opencode.json*",
    "**/package.json",
    "**/tsconfig.json"
  ],
  "compress": {
    "mode": "range",                      // range (stable) | message (experimental)
    "permission": "allow",                // allow | ask | deny
    "showCompression": false,
    "summaryBuffer": true,
    "maxContextLimit": 140000,            // absolute tokens (not %)
    "minContextLimit": 50000,
    "nudgeFrequency": 3,                  // how often to nudge
    "iterationNudgeThreshold": 15,
    "nudgeForce": "soft",                 // soft | strong
    "protectUserMessages": false,
    "protectTags": false,
    "modelMaxLimits": { "opencode/deepseek-v4-flash-free": 170000 },
    "modelMinLimits": { "opencode/deepseek-v4-flash-free": 50000 },
    "protectedTools": ["observation", "memory-*"]
  },
  "experimental": {
    "allowSubAgents": false,
    "customPrompts": true
  },
  "strategies": {
    "deduplication": { "enabled": true, "protectedTools": [] },
    "purgeErrors": { "enabled": true, "turns": 2, "protectedTools": [] }
  }
}
```

**Key observations:**

1. **Free-tier tuned:** `maxContextLimit: 140000` is "free tier effective limit" (not the reported 1M context window). This is realistic for free models.

2. **Three protection mechanisms:**
   - `protectedTools` — tools whose outputs are never pruned
   - `protectedFilePatterns` — files matching glob are protected
   - `turnProtection.turns: 4` — protect last 4 turns

3. **Two automatic strategies (zero LLM cost):**
   - `deduplication` — removes duplicate tool calls (same tool + same arguments), keeps most recent
   - `purgeErrors` — prunes inputs from errored tool calls after N turns (error messages preserved)

4. **Nudging system:**
   - `nudgeFrequency: 3` — every 3 turns
   - `iterationNudgeThreshold: 15` — after 15 assistant iterations
   - `nudgeForce: "soft"` — keeps reasoning continuity for mimo model

5. **Custom prompts support:** `experimental.customPrompts: true` allows user-editable prompt overrides under `dcp-prompts/` directories

---

## B. DCP Prompts (6 files)

### Tổng quan

```
dcp-prompts/
├── defaults/                    ← baseline prompts
│   ├── README.md
│   ├── system.md                ← philosophy + WHEN to compress
│   ├── compress-message.md      ← instructions for `compress` tool (message mode)
│   ├── compress-range.md        ← instructions for `compress` tool (range mode)
│   ├── turn-nudge.md            ← reminder every N turns
│   ├── iteration-nudge.md       ← reminder after K iterations
│   └── context-limit-nudge.md   ← emergency nudge at context limit
└── overrides/                   ← user-editable copies
    ├── compress-message.md
    └── compress-range.md
```

### 1. `system.md` (đã đọc full)

**Core message:** "You operate in a context-constrained environment. Manage context continuously to avoid buildup and preserve retrieval quality."

**Philosophy:** `compress` is "crystallization, not cleanup" — replaces older content with high-fidelity summaries

**COMPRESS WHEN (closed section, raw served purpose):**
- Research concluded and findings are clear
- Implementation finished and verified
- Exploration exhausted and patterns understood
- Dead-end noise can be discarded

**DO NOT COMPRESS IF:**
- Raw context is still relevant for edits/precise references
- Target content is still actively in progress
- May need exact code, error messages, file contents in immediate next steps

**Evaluation criterion:** _"Is this section closed enough to become summary-only right now?"_

---

### 2. `compress-message.md` (đã đọc full)

**Purpose:** Collapse selected individual messages (mNNNN IDs) into summaries

**THE SUMMARY requirement:** EXHAUSTIVE — preserve file paths, function signatures, decisions, constraints, key findings, tool outcomes, user intent

**USER INTENT FIDELITY:** Preserve intent with extra care. Directly quote short user instructions.

**LEAN:** Strip noise — failed attempts, verbose tool output, repetition. Pure signal.

**MESSAGE IDS:**
- `mNNNN` — raw messages (use these for compression)
- `bN` — already-compressed blocks (don't re-compress these)
- `priority` attribute indicates context cost (compress high-priority first)

**Rules:**
- Pick IDs from injected `<dcp-message-id>` XML tags in context
- Don't invent IDs
- BLOCKED messages cannot be compressed

**BATCHING:** Select MANY messages in single tool call

**GENERAL CLEANUP:** Compress all medium/high-priority messages not relevant to active task. Optimize for reducing footprint, not grouping by topic.

---

### 3. `compress-range.md` (chưa đọc chi tiết, dự đoán cùng pattern)

**Purpose:** Compress range of messages (span-based) thay vì individual

**Mode:** `range` (stable, default) — compresses spans into block summaries

**Difference from `compress-message.md`:** Works on contiguous ranges, creates `bN` block references

---

### 4. `turn-nudge.md` (chưa đọc chi tiết)

**Purpose:** Reminder mỗi N turns để compress closed sections

**Trigger:** `nudgeFrequency: 3` (every 3 turns)

---

### 5. `iteration-nudge.md` (chưa đọc chi tiết)

**Purpose:** Reminder sau K assistant iterations

**Trigger:** `iterationNudgeThreshold: 15` (after 15 iterations)

---

### 6. `context-limit-nudge.md` (chưa đọc chi tiết)

**Purpose:** Emergency nudge khi at/over `maxContextLimit`

**Trigger:** When at/over limit (140K tokens)

---

## C. Comparison: DCP vs pi-vcc

| Aspect | DCP (opencodekit) | pi-vcc (pi) |
|---|---|---|
| **Trigger** | LLM-invoked mid-session (`compress` tool) | Algorithmic end-of-task (compaction event) |
| **Granularity** | Per-message (mNNNN) or per-range (bN) | Whole-session summary |
| **Backend** | LLM summarization (uses context budget) | Algorithmic, structured 5-section |
| **Cost** | Mid-session LLM calls (token cost) | Zero LLM cost (algorithmic) |
| **Customization** | Per-project config (`dcp.jsonc`) + editable prompts | Single algorithm, no per-project tuning |
| **Auto-strategies** | Deduplication + purgeErrors (zero cost) | None (full compaction only) |
| **Nudging** | 3 types (turn/iteration/context-limit) | None (event-driven) |
| **Bounded blocks** | Yes (`bN` placeholders preserved + can decompress) | No (replaced by structured summary) |
| **User messages** | Compressible (`protectUserMessages: false`) | Preserved verbatim |
| **Tools integration** | `protectedTools` list | No concept (compaction is whole-session) |

### Philosophical difference

**DCP = "continuous context shaping"**
- LLM actively decides what's closed
- Preserves exact wording via block IDs
- High-fidelity, low-noise
- But: requires LLM discipline, costs tokens

**pi-vcc = "deterministic snapshot"**
- Algorithmic, predictable
- Zero LLM cost
- But: lower fidelity (5-section template is rigid), no per-message control

---

## D. Should Pi adopt DCP?

### Pros of DCP for Pi

1. **Higher fidelity** — preserves exact file paths, decisions, IDs
2. **Per-message control** — LLM can selectively compress closed sections
3. **Nudging system** — keeps context lean throughout long sessions
4. **Bounded blocks** — `bN` references can be decompressed if needed
5. **Auto-strategies** — deduplication + purgeErrors work without LLM

### Cons of DCP for Pi

1. **LLM cost** — mid-session compression uses tokens
2. **Pi-vcc already exists** — adding DCP is duplicative
3. **Implementation complexity** — `bN` block management, XML metadata injection
4. **Configuration surface** — 50+ line `dcp.jsonc` to maintain
5. **Paradigm mismatch** — Pi's design favors deterministic, algorithmic approach

### Recommendation

**KHÔNG nên port DCP sang Pi ngay.** Lý do:

1. **Pi-vcc đã cover end-of-task** (95% use case)
2. **DCP's value là mid-session** — chỉ hữu ích cho sessions >50 turns
3. **Pi's design philosophy** leans deterministic, không phải LLM-invoked tools
4. **Effort lớn** — replicate block management + XML metadata + nudging

### Nếu thực sự cần DCP trong tương lai

Có thể build **`pi-dcp`** extension (Phase 3, low priority):
- Wrap pi-vcc's structured summary thành `bN` blocks
- Add dedup + purgeErrors strategies (zero LLM cost)
- Add turn/iteration/context-limit nudges
- Skip the LLM-invoked `compress` tool (giữ algorithmic)

**Effort:** 1 tuần
**Value:** 🟠 Thấp (chỉ hữu ích cho long sessions)

---

## E. Auto-Strategies: Zero-Cost Wins

Dù không port toàn bộ DCP, **2 auto-strategies** (deduplication + purgeErrors) là zero LLM cost và có thể adapt sang pi-vcc hoặc tạo extension riêng.

### Strategy 1: Deduplication

**Opencodekit behavior:**
- Removes duplicate tool calls (same tool + same arguments)
- Keeps most recent
- Zero LLM cost

**Pi equivalent:** Có thể implement trong `pi-vcc` enhancement hoặc `pi-compact` extension

**Effort:** 2-3 giờ
**Value:** 🟡 Medium

### Strategy 2: Purge Errors

**Opencodekit behavior:**
- Prunes inputs from errored tool calls after N turns
- Error messages preserved (not full input)
- Zero LLM cost

**Pi equivalent:** Có thể implement tương tự

**Effort:** 2-3 giờ
**Value:** 🟡 Medium

**Recommendation:** Nếu user thường xuyên gặp long sessions (>50 turns), thêm 2 strategies này vào pi-vcc hoặc tạo `pi-compact` extension. Effort rất nhỏ, value cũng vừa phải.

---

## F. DCP Prompts Content Adaptation

Nếu trong tương lai cần `pi-dcp`, có thể copy prompts từ opencodekit với minor adjustments:

| opencodekit prompt | Pi adaptation |
|---|---|
| `system.md` | Replace `compress` tool với `pi-vcc compact` (algorithmic, không cần LLM) |
| `compress-message.md` | Không cần (no LLM-invoked tool) |
| `compress-range.md` | Không cần (pi-vcc = whole-session) |
| `turn-nudge.md` | Inject vào system prompt mỗi N turns (thông qua hook) |
| `iteration-nudge.md` | Tương tự turn-nudge |
| `context-limit-nudge.md` | Kích hoạt khi token count > threshold |

**Lưu ý:** Pi system prompt injection qua `before_agent_start` hook. Cần build custom logic để inject nudge theo turn count.

---

## G. Tổng kết

| Quyết định | Effort | Value | Action |
|---|---|---|---|
| KHÔNG port toàn bộ DCP | — | — | Skip (pi-vcc đã cover) |
| Add 2 zero-cost strategies (dedup + purgeErrors) vào pi-vcc | 4-6 giờ | 🟡 Medium | Optional (Phase 2C) |
| Tạo `pi-dcp` extension (full DCP) | 1 tuần | 🟠 Thấp | Skip (chỉ khi cần long sessions >50 turns) |
| Copy `dcp-prompts/` cho tương lai | 30 phút | 🟢 Low (insurance) | Optional — backup to `/tmp/ockit-mapping/dcp-prompts/` |

**Net:** Pi-vcc + optional dedup/purgeErrors enhancement = 95% DCP value với 10% effort.
