# 01 - Agents Mapping: opencodekit ↔ pi

## Tổng quan

`.opencode` có **7 agent personas** dạng markdown trong `agent/`. `.pi` của bạn đã port **6/7** vào `agents/`. Phần này phân tích chi tiết từng agent, sự khác biệt, và quyết định port/thêm/bỏ qua.

---

## Coverage Matrix

| Agent | `.opencode/agent/` | `.pi/agent/agents/` | Status | Effort để đồng bộ |
|---|---|---|---|---|
| `build` | 325 lines | ❌ | 🟡 Port tùy chọn | 2-3 giờ |
| `explore` | ~280 lines | ✅ 6043 bytes | ✅ Đã port | 0 |
| `general` | ~430 lines | ✅ 7206 bytes | ✅ Đã port (+có thể add TDD) | 1 giờ |
| `plan` | ~510 lines | ✅ 9562 bytes | ✅ Đã port (+có thể add memory ritual) | 1 giờ |
| `review` | ~280 lines | ✅ 6371 bytes | ✅ Đã port | 0 |
| `scout` | ~260 lines | ✅ 5956 bytes | ✅ Đã port | 0 |
| `vision` | ~240 lines | ✅ 7475 bytes | ✅ Đã port | 0 |

---

## 1. `explore` — Codebase Cartographer

### `.opencode/agent/explore.md` (đã đọc)

- **Role:** Fast read-only codebase search specialist
- **Tools:** `edit:false, write:false, todowrite:false, observation:false, question:false, websearch:false, webfetch:false, codesearch:false`; bash allowed với destructive deny-list
- **Source tools:** `srcwalk` CLI (semantic + structural search), LSP (goToDefinition, findReferences, hover)
- **Key behaviors:**
  - Prefers `srcwalk` CLI cho AST-aware search
  - Budget: ≤3 tool calls per symbol
  - Maps → inspect → read, then STOP
  - "Read-only is hard constraint"

### `.pi/agent/agents/explore.md` (đã đọc, 6043 bytes)

- **Role:** Same (read-only codebase cartographer)
- **Tools:** `read, bash, grep, find, ls`; `disallowed: edit, write`; `extensions: pi-srcwalk`
- **Source tools:** `semantic_query`, `semantic_inspect`, `semantic_grep`, `semantic_show`, `semantic_review` (từ `pi-srcwalk` 5-tool superset)
- **Key behaviors:**
  - Prefers `pi-srcwalk` tools (faster, AST-aware)
  - Budget: ≤5 tool calls per question (vs 3 của opencodekit — pi dùng ít tool calls mạnh hơn)
  - Citation-first: "If you can't point at file:line, you don't know it yet"
  - Fallback to built-in grep if srcwalk unavailable
  - Failure handling: explicit `[UNCERTAIN: ...]` markers

### So sánh chính

| Aspect | opencodekit | pi |
|---|---|---|
| Tool surface | 5 srcwalk tools + built-in | 5 semantic_* tools + built-in |
| Budget | ≤3 calls per symbol | ≤5 calls per question |
| LSP integration | Yes (goToDefinition, etc.) | No (covered by semantic_inspect) |
| Destructive bash deny | Yes (rm*, git push*, etc.) | Inherited from global settings |
| Output format | Free-form | Structured: Files → Findings → Next Steps |
| Failure handling | Mentioned briefly | Explicit `[UNCERTAIN]` markers, fallbacks |

**Kết luận:** Pi port **rất tốt** — thậm chí một số điểm tốt hơn (structured output, explicit uncertainty). Không cần action.

---

## 2. `general` — Surgical Implementer

### `.opencode/agent/general.md`

- **Role:** General-purpose subagent for fast, well-defined tasks; delegates complexity quickly
- **Tools:** bash + edit + write (with destructive denies); full primary-agent permissions
- **Key behaviors (4 deviation rules):**
  1. Auto-fix bugs / missing critical functionality / blocking issues
  2. STOP on arch changes (not auto-fixable)
  3. Auto-complete tasks when path is clear
  4. Don't ask for approval on mechanical decisions
- **TDD section:** RED → GREEN → REFACTOR (~30 lines)
- **Self-check before reporting:** file exists, tests pass, no stubs
- **Scope rule:** > 3 files → delegate to plan

### `.pi/agent/agents/general.md` (7206 bytes, đã đọc 60 lines đầu)

- **Role:** Same (surgical implementer, 1-3 files)
- **Tools:** `read, bash, grep, find, ls, edit, write`; `extensions: pi-srcwalk`
- **Key behaviors:** Same 4 deviation rules (theo explore agent report)
- **TDD section:** **REMOVED** trong pi version
- **Self-check:** Lighter version

### Đề xuất: Add TDD section (optional, 1 giờ)

Từ opencodekit `general.md` lines 158-188 (theo explore agent report), TDD section giúp ích khi task nói rõ "TDD" hoặc khi user muốn test-first approach. Có thể add vào pi `general.md` dưới dạng supplementary block.

**Action items:**
- [ ] (Optional) Copy TDD section từ opencodekit `general.md:158-188` vào pi `general.md`
- [ ] Không cần sửa gì khác

---

## 3. `plan` — Architecture Specialist

### `.opencode/agent/plan.md`

- **Role:** Primary planning agent for architecture and multi-phase execution
- **Tools:** bash + write/edit **only to `.opencode/artifacts/**/*.md` and `.opencode/templates/**/*.md`**; `question: allow`; read-only otherwise
- **5-phase ritual:**
  1. **Ground** — current state + assumptions + constraints
  2. **Calibrate** — quality bar, scope, success criteria
  3. **Transform** — research, design, decomposition
  4. **Release** — write plan, verify
  5. **Reset** — close out, archive
- **Goal-backward methodology:** truth → artifacts → wiring → key links
- **Discovery Levels 0-3:** skip / verify / scout / deep dive
- **Context budget:** ~50% per plan, 2-3 tasks max
- **Memory ritual:** search observations, create plan context (dùng `memory_search`, `memory_read`, `memory_update`)

### `.pi/agent/agents/plan.md` (9562 bytes)

- **Role:** Same (architecture / decomposition)
- **Tools:** `read, bash, grep, find, ls`; `disallowed: edit, write`; `extensions: pi-srcwalk`
- **5-phase ritual:** Preserved (theo explore report)
- **Goal-backward methodology:** Preserved
- **Discovery Levels:** Preserved (refers to `scout` instead of `task` subagent)
- **Memory ritual:** **REMOVED** trong pi version (no `memory_search` tool)

### Đề xuất: Add memory ritual (optional, 1 giờ)

Pi có `vcc_recall` (search history) — không giống `memory_search` (search observations trong LTM), nhưng vẫn hữu ích cho "institutional research" phase.

**Action items:**
- [ ] (Optional) Add "Memory Search (Recommended)" section vào pi `plan.md` Phase 0
  - Use `vcc_recall` để search prior decisions
  - Skip references to `memory_search/read/update` (không có trong pi)
  - Skip `compress` reference (no DCP)
- [ ] Không cần sửa gì khác

---

## 4. `review` — Code Review / Debugging

### `.opencode/agent/review.md`

- **Role:** Read-only code review, debugging, security audit
- **Tools:** `edit:false, write:false, observation:false, todowrite:false, question:false`; bash with deny-list
- **4-level severity:** P0 (critical), P1 (important), P2 (minor), P3 (nit)
- **3-level artifact verification:**
  1. Exists (file present)
  2. Substantive (not stub/placeholder)
  3. Wired (connected, used)
- **Triage criteria:** 4 conditions, all required
- **Strict JSON schema variant:** available
- **Pre-existing issues:** Never flag unless change worsens them

### `.pi/agent/agents/review.md` (6371 bytes)

- **Role:** Same (read-only code review / debugging)
- **Tools:** `read, bash, grep, find, ls`; `disallowed: edit, write`; `extensions: pi-srcwalk`
- **All preserved:** 4-level severity, 3-level verification, triage criteria, strict JSON, "don't worsen pre-existing"
- **Slightly tighter wording:** same examples

**Kết luận:** Pi port **hoàn hảo**. Không cần action.

---

## 5. `scout` — External Research

### `.opencode/agent/scout.md`

- **Role:** External research specialist for library docs, patterns, real-world usage
- **Tools:** `observation:false, todowrite:false, question:false`; write/edit **only `.opencode/artifacts/**/*.md`**; bash for `git clone` to `/tmp`
- **Source quality hierarchy:** docs > source > maintainer > community
- **Tools used:** `webclaw` (scrape/crawl/batch/brand), `context7`, `grepsearch`, `codesearch`
- **3-pass research:** Plan → Retrieve → Synthesize
- **Memory-first protocol:** search observations, reuse findings

### `.pi/agent/agents/scout.md` (5956 bytes)

- **Role:** Same (external research)
- **Tools:** `read, bash, grep, find, ls`; `disallowed: edit, write`; `extensions: pi-search` (5 tools: websearch, codesearch, context7, grepsearch, web_fetch)
- **Source hierarchy:** Preserved
- **Tools used:** `pi-search` (covers grepsearch + context7 + Exa web search)
- **"Never refer to tools by name" rule:** Preserved
- **Clone-to-/tmp convention:** Preserved
- **Memory-first:** Preserved (slightly trimmed)

**Kết luận:** Pi port **rất tốt**. `pi-search` covers all opencodekit's external research needs + thêm Exa web search. Không cần action.

---

## 6. `vision` — UI/UX / Accessibility

### `.opencode/agent/vision.md`

- **Role:** Visual content specialist for multimodal analysis and UI/UX guidance
- **Tools:** `edit:false, write:false, bash:false, task:false, observation:false, todowrite:false` — **no tools beyond read/ls**
- **DESIGN.md protocol:** Sections as audit checklist
- **Anti-slop taste protocol:** 9 criteria (no Lorem ipsum, no Tailwind defaults, etc.)
- **Figma-first workflow:** via `figma-go` MCP
- **Brand extraction:** via `webclaw`
- **5 taste-skill variants:** design-taste-frontend, brutalist, minimalist, high-end, industrial
- **Strict QA checklist:** hierarchy, layout, spacing, color, typography, states, a11y, content

### `.pi/agent/agents/vision.md` (7475 bytes)

- **Role:** Same (UI/UX / accessibility / design system)
- **Tools:** `read, bash, find, ls`; `disallowed: edit, write`; no extensions
- **DESIGN.md protocol:** Preserved
- **Anti-slop taste protocol:** Preserved (9 criteria)
- **Figma workflow:** Downgraded to "request via build agent" (no Figma MCP in pi)
- **`webclaw` references:** Removed (uses pi-search implicitly)
- **Taste-skill variants:** Removed (pi's `skills: none` is conservative)
- **QA checklist:** Preserved
- **Examples:** Cite concrete WCAG ratios

### Đề xuất: Add taste-skill variants (optional, nếu bạn thực sự làm frontend)

Nếu bạn làm nhiều frontend work, có thể add lại 5 taste variants như skills (load on-demand). Hiện tại pi `skills: none` nên tạm thời skip.

**Action items:**
- [ ] (Optional) Add `taste-skill-variants.md` reference vào pi `vision.md` (chỉ nếu bạn thường xuyên làm UI design)

---

## 7. `build` — Primary Orchestrator ⚠️ MISSING IN PI

### `.opencode/agent/build.md` (325 lines, chưa đọc chi tiết)

- **Role:** Primary development agent with full codebase access
- **Tools:** bash (destructive denies); write/edit **all**; `question: allow`
- **"Layers of operation":** Direct → Plan → Delegate → Verify
- **Decision priority (5 rules, higher wins):** Security > Anti-hallucination > User intent > Agency > Task
- **Minimalism gate before delegating:** Check if direct action is feasible
- **Auto-delegation table:** Maps user phrases → subagent type
  - "find X" → explore
  - "research X" → scout
  - "review X" → review
  - "build X" → general (if small) or plan (if large)
  - "design X" → vision
- **Post-delegation acceptance gate:** read diff, run verification, check criteria
- **Iterative quality loop:** 5/5 score-gated, max 5 rounds, escalation rules
- **Context file pattern:** Shared worker context across subagents

### Tại sao pi chưa có?

Pi architecture khác opencodekit:
- **opencodekit:** `build` = primary agent (user-facing) + delegates via `task()` to subagents
- **pi:** Primary agent (main session) **không cần** file `build.md` — nó là implicit, user-facing session, delegates qua `pi-subagents` `task()` calls

### Quyết định: KHÔNG cần port `build.md` vì...

1. **Pi's primary session** đã làm việc này implicitly qua `pi-subagents`
2. **Agent files trong `agents/`** = subagent personas, không phải primary
3. **Decision priority, auto-delegation table, quality loop** → có thể document trong `AGENTS.md` (Phase 1) thay vì tạo agent mới

### Nếu vẫn muốn port (optional, 2-3 giờ)

Tạo `/Users/minhduydev/.pi/agent/agents/build.md` với:
- 5-rule decision priority
- Auto-delegation table (map user phrases → subagent)
- Post-delegation acceptance gate
- **BỎ** references to `task()` (dùng `pi-subagents` tương đương)
- **BỎ** `TodoWrite` references (dùng `pi-tasks` nếu cần)
- **BỎ** `memory-search` references (không có trong pi)

Nhưng thực tế: **không cần** vì primary session tự handle những thứ này.

---

## Tổng kết

| Quyết định | Effort | Value | Action |
|---|---|---|---|
| ✅ 6 agents đã port đầy đủ | 0 | — | None |
| 🟡 Add TDD section to `general.md` | 1 giờ | Medium | Optional |
| 🟡 Add memory ritual to `plan.md` | 1 giờ | Medium | Optional |
| 🟡 Add taste variants to `vision.md` | 1 giờ | Low (nếu không làm frontend) | Skip |
| 🟡 Port `build.md` | 2-3 giờ | Low (redundant với primary session) | Skip |
| 🟢 Document decision priority in `AGENTS.md` | 30 phút | Medium | Phase 1 |

**Net recommendation:** Giữ nguyên 6 agents hiện tại, add 1-2 section optional, focus Phase 1 vào AGENTS.md.
