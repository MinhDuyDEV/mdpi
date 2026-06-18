# 00 - Overview & Execution Roadmap

## Mục đích

Trả lời câu hỏi: **"Mapping `.opencode` → `.pi`, chúng ta sẽ góp nhặt được gì, ROI cao nhất, tối ưu nhất?"**

## Câu trả lời ngắn

Bạn đã có hạ tầng tốt. Cơ hội lớn nhất nằm ở **content porting** (~2100 lines markdown thuần) chứ không phải build lại infrastructure. Sau đó, 2-3 packages cấp "bổ sung capability" sẽ đưa `.pi` của bạn lên **ngang hoặc vượt** `.opencode`.

---

## Phân tích State-of-Play

### Hạ tầng `.pi` hiện tại (đã có)

Đọc từ `/Users/minhduydev/.pi/agent/settings.json` + `agents/` + `npm/node_modules/`:

**6 agent personas** (đã port thành công từ opencodekit):
- `explore.md` — read-only cartographer (uses pi-srcwalk)
- `general.md` — surgical implementer
- `plan.md` — architecture specialist
- `review.md` — code review / debugging
- `scout.md` — external research (uses pi-search)
- `vision.md` — UI/UX review

**13 npm extensions** (cài sẵn):
- `@sting8k/pi-srcwalk` — 5 tools code-intel (superset của opencodekit's srcwalk)
- `@heyhuynhgiabuu/pi-search` — 5 tools external research (websearch, codesearch, context7, grepsearch, web_fetch)
- `@sting8k/pi-vcc` — deterministic compaction
- `@tintinweb/pi-subagents` — `maxConcurrent: 99`, smart join mode
- `@tintinweb/pi-tasks` — todo tracking
- `pi-augment` — prompt enhancement
- `pi-boomerang` — autonomous task execution
- `pi-btw` — quick commands
- `pi-treex` — tree visualization
- `pi-ollama-cloud` — Ollama provider
- `pi-powerline-footer` — UI
- `@sting8k/pi-droid-styling` (git) — theming
- `@earendil-works` packages

### Hạ tầng `.opencode` (reference)

**7 agent personas** (có thêm `build.md` mà pi chưa có)
**9 slash commands** (UX layer mà pi hoàn toàn thiếu)
**5 workflows** (DAG executor mà pi hoàn toàn thiếu)
**59 skills** (4 Tier-1 + 55 Tier-2; pi có 0)
**8 plugins** (memory, session-summary, codesearch, prompt-leverage, guard, skill-mcp, srcwalk, copilot-auth)
**10 templates** (project context files; pi có 0)
**2 context files** (architecture + fallow docs)
**QUALITY.md** + **.template-manifest.json** (meta)

---

## Coverage Matrix (đầy đủ)

| Capability | `.opencode` | `.pi` (current) | Status | Action |
|---|---|---|---|---|
| **Agents (6/7 ported)** | | | | |
| build | ✅ 325 lines | ❌ | 🟡 | Port tùy chọn (xem 01) |
| explore | ✅ | ✅ 6043 bytes | ✅ | None |
| general | ✅ | ✅ 7206 bytes | ✅ | None (TDD section có thể add) |
| plan | ✅ | ✅ 9562 bytes | ✅ | None (memory ritual có thể add) |
| review | ✅ | ✅ 6371 bytes | ✅ | None |
| scout | ✅ | ✅ 5956 bytes | ✅ | None |
| vision | ✅ | ✅ 7475 bytes | ✅ | None |
| **Slash commands** | | | | |
| /init | ✅ 313 lines | ❌ | 🔴 | Port sang pi-commands |
| /fix | ✅ ~50 lines | ❌ | 🔴 | Port sang pi-commands |
| /verify | ✅ ~100 lines | ❌ | 🔴 | Port sang pi-commands |
| /ship | ✅ 498 lines | ❌ | 🔴 | Port sang pi-commands |
| /audit | ✅ ~80 lines | ❌ | 🔴 | Port sang pi-commands |
| /research | ✅ ~150 lines | ❌ | 🔴 | Port sang pi-commands |
| /gc | ✅ ~80 lines | ❌ | 🔴 | Port sang pi-commands |
| /create | ✅ 256 lines | ❌ | 🔴 | Port sang pi-commands |
| /plan | ✅ 406 lines | ❌ | 🔴 | Port sang pi-commands |
| **Workflows (DAG)** | | | | |
| audit-pattern | ✅ | ❌ | 🔴 | Port sang pi-workflows |
| batch-implement | ✅ | ❌ | 🔴 | Port sang pi-workflows |
| deep-research | ✅ | ❌ | 🔴 | Port sang pi-workflows |
| garbage-collection | ✅ | ❌ | 🔴 | Port sang pi-workflows |
| development-lifecycle | ✅ | ❌ | 🔴 | Port sang pi-workflows |
| **Skills (59 files)** | | | | |
| Tier-1 (4) | ✅ 4 files | ❌ | 🟡 | Inline vào AGENTS.md (Phase 1) |
| Tier-2 (55) | ✅ 55 files | ❌ | 🟠 | Port tùy chọn theo nhu cầu |
| **Templates (10)** | | | | |
| prd, project, state, tech-stack, tasks, roadmap, user, design, proposal, adr | ✅ 10 files | ❌ | 🟡 | Copy thẳng vào `.pi/agent/templates/` |
| **Plugins** | | | | |
| srcwalk (code-intel) | ✅ 7 tools | ✅ 5 tools (pi-srcwalk) | ✅ | None — superset |
| memory (4-tier LTM) | ✅ 18 files | ❌ | 🔴 | Build pi-memory (largest gap) |
| session-summary (anchored) | ✅ | ❌ | 🔴 | Build pi-session-summary |
| codesearch (BM25 csearch) | ✅ | ⚠️ Exa AI (pi-search) | 🟡 | OK as-is (different paradigm) |
| skill-mcp (bridge) | ✅ | ❌ | 🟡 | Build nếu cần MCP integration |
| prompt-leverage (7-block) | ✅ transform hook | ✅ pi-augment slash | ✅ | None — analog |
| guard (safety) | ✅ | ❌ | 🟡 | Build pi-guard (small) |
| copilot-auth | ✅ | ❌ | ⚪ | Skip — too niche |
| **Tools** | | | | |
| grepsearch (grep.app) | ✅ | ✅ (pi-search) | ✅ | Identical |
| context7 (context7.com) | ✅ | ✅ (pi-search) | ✅ | Identical |
| structural-check.sh | ✅ | ❌ | 🟡 | Build pi-lint (small, ~150 lines bash) |
| **DCP (Dynamic Context Protocol)** | | | | |
| dcp.jsonc config | ✅ | ❌ | 🟡 | Pi-vcc đã cover (different paradigm) |
| dcp-prompts/ (6 files) | ✅ | ❌ | 🟡 | Adapt nếu cần (low priority) |
| compress tool (LLM-invoked) | ✅ | ❌ | 🟡 | Pi-vcc = end-of-task variant only |
| **Meta** | | | | |
| AGENTS.md | ✅ 200 lines | ❌ | 🟡 | **Phase 1 priority** |
| opencode.json (1000+ lines) | ✅ | ✅ settings.json | ✅ | Pi's settings.json is leaner equivalent |
| tui.json | ✅ | built-in | ⚪ | N/A |
| QUALITY.md | ✅ | ❌ | 🟡 | Optional |
| .template-manifest.json | ✅ | ❌ | 🟡 | Optional |

**Legend:**
- ✅ Done
- 🟡 Easy/medium port
- 🔴 Need new package build
- 🟠 Long-tail (low ROI)
- ⚪ Skip

---

## Phân tích "Góp nhặt" — 3 nhóm

### Nhóm A: Gặt ngay (Phase 1, ROI cao nhất)

> Effort: 4-8 giờ | Output: ~2100 lines content thuần | Công cụ: edit + write

1. **AGENTS.md** (1 file, 200 lines)
   - Đường dẫn đích: `/Users/minhduydev/.pi/agent/AGENTS.md`
   - Sửa: `opencode` → `pi`, `task()` → `pi-subagents`, `srcwalk` → `pi-srcwalk`, `webclaw` → `pi-search`, `fallow` (giữ nguyên CLI)
   - Lợi ích: 1 file thống nhất behavioral rules cho tất cả agents

2. **4 Tier-1 skills inline vào AGENTS.md** (300 lines)
   - `behavioral-kernel` (80 lines): 4 nguyên tắc + drift signals + recovery
   - `defense-in-depth` (50 lines): 4-layer validation
   - `incremental-implementation` (70 lines): thin vertical slices
   - `verification-before-completion` (100 lines): evidence before claims

3. **10 templates** (1500 lines) → `/Users/minhduydev/.pi/agent/templates/`
   - `prd.md`, `project.md`, `state.md`, `tech-stack.md`, `tasks.md`
   - `roadmap.md`, `user.md`, `design.md`, `proposal.md`, `adr.md`
   - Có thể thêm sub-agent `pi-templates` (1 file) để inject vào system prompt

### Nhóm B: Xây thêm 2 packages (Phase 2A, ROI cao)

> Effort: 5-7 ngày | Output: UX layer giống `.opencode` (commands + workflows)

4. **pi-commands** — Slash command dispatcher
   - Đường dẫn: `/Users/minhduydev/.pi/agent/npm/pi-commands/`
   - Implementation: ~300 lines TS
   - Function: Parse `/command args` → route tới persona tương ứng
   - Schema: frontmatter `description`, `argument-hint`, `agent:`
   - Source content: 9 commands từ `.opencode/command/*.md` (~1500 lines)

5. **pi-workflows** — DAG executor
   - Đường dẫn: `/Users/minhduydev/.pi/agent/npm/pi-workflows/`
   - Implementation: ~500 lines TS
   - Function: Walk markdown DAG, spawn `pi-subagents` `task()` calls song song
   - Schema: phases với `**Agent:**`, `**Concurrency:**`, `**Depends on:**`, `**Prompt:**`
   - Source content: 5 workflows từ `.opencode/workflows/*.md` (~800 lines)

### Nhóm C: Fill gap lớn (Phase 2B, ROI trung bình-cao)

> Effort: 1-2 tuần | Output: Long-term memory system (gap lớn nhất)

6. **pi-memory** — 4-tier LTM
   - 4 systems: Capture → Distill → Curate → Inject
   - Backend: SQLite + FTS5 (giống opencodekit)
   - Tools: `observation`, `memory-search`, `memory-admin`
   - Hooks: `tool.execute.after`, `experimental.chat.system.transform`
   - Lợi ích: Giải quyết "no context across sessions"

### Nhóm D: Polish (Phase 2C, tùy chọn)

7. **pi-guard** (~150 lines TS): curl-pipe blocker + conventional commits
8. **pi-session-summary** (~400 lines TS): anchored iterative summary
9. **pi-skill-mcp** (~300 lines TS): MCP bridge per skill
10. **pi-lint** (~150 lines bash): structural-check equivalent

### Nhóm E: Long-tail content (Phase 3, ROI thấp)

11. **Tier-2 skills** (55 files, ~50K lines): chỉ port khi cần
    - Ưu tiên: `frontend-design`, `react-best-practices`, `test-driven-development`, `git-workflow-and-versioning`, `documentation-and-adrs`, `accessibility-audit`
    - Có thể gom thành `pi-skills` pack lớn

---

## Tại sao cách tiếp cận này tối ưu?

### 1. Tận dụng tối đa hạ tầng hiện có

`.pi` của bạn đã có `pi-srcwalk` (superset của opencodekit's srcwalk), `pi-search` (cover grepsearch + context7 + Exa web), `pi-vcc` (compaction), `pi-subagents` (mạnh hơn opencodekit's `task()`). Không cần build lại những thứ này.

### 2. Content porting = effort thấp, value cao

Markdown files copy-paste với naming adjustment là xong. Không cần TypeScript, không cần test infrastructure.

### 3. Tách rời concerns

- **Content layer** (AGENTS.md, skills, templates): markdown, dễ maintain
- **UX layer** (commands, workflows): packages riêng, có thể nâng cấp độc lập
- **Memory layer** (pi-memory): package riêng, opt-in
- **Safety layer** (pi-guard): package riêng, opt-in

### 4. Backward compatible

Mọi thứ bạn đã có sẽ tiếp tục hoạt động. Phase 1 chỉ thêm file mới, không sửa file cũ (trừ frontmatter extensions nếu cần).

### 5. Phased delivery

Có thể ship Phase 1 trong 1-2 ngày và có giá trị ngay. Phase 2-3 làm sau khi đã có feedback.

---

## Kết luận

**"Góp nhặt" tối ưu = Phase 1 + Phase 2A + Phase 2B = ~3 tuần effort = 90% value.**

- Phase 1 (content): "Behavioral rules + project templates"
- Phase 2A (commands+workflows): "Slash command UX giống opencodekit"
- Phase 2B (pi-memory): "Long-term memory, giải quyết gap lớn nhất"

Còn lại là polish và tùy chọn. Bạn có thể dừng ở bất kỳ phase nào và vẫn có hệ thống `.pi` mạnh hơn opencodekit.
