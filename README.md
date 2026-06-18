# OpenCodeKit → .pi Mapping Analysis

**Generated:** 2026-06-16
**Source analyzed:** `/tmp/opencodekit-template/.opencode/` (template v0.22.0)
**Target:** `/Users/minhduydev/.pi/agent/`
**Method:** Direct file reading of all 200+ files + 3 parallel explore agents for synthesis

---

## Tài liệu này gồm 8 phần

Đọc theo thứ tự, hoặc nhảy thẳng đến phần bạn quan tâm:

| # | File | Nội dung | Lines |
|---|------|----------|-------|
| 1 | [`00-overview.md`](./00-overview.md) | Tổng quan + roadmap thực thi | ~ |
| 2 | [`01-agents-mapping.md`](./01-agents-mapping.md) | So sánh 7 agents opencodekit ↔ 6 agents pi | ~ |
| 3 | [`02-commands-porting.md`](./02-commands-porting.md) | 9 slash commands + 5 workflows chi tiết | ~ |
| 4 | [`03-skills-inventory.md`](./03-skills-inventory.md) | 59 skills (Tier 1+2) + manifest schema | ~ |
| 5 | [`04-templates-and-context.md`](./04-templates-and-context.md) | 10 templates + 2 context files + QUALITY.md | ~ |
| 6 | [`05-plugins-architecture.md`](./05-plugins-architecture.md) | 7 plugins (memory, session-summary, srcwalk, codesearch, prompt-leverage, guard, skill-mcp, copilot) | ~ |
| 7 | [`06-dcp-and-compression.md`](./06-dcp-and-compression.md) | DCP framework + dcp-prompts/ + compress tool | ~ |
| 8 | [`07-port-recommendations.md`](./07-port-recommendations.md) | Khuyến nghị cuối cùng + 3-tier roadmap | ~ |

---

## TL;DR (Executive Summary)

### Bạn đã có gì?

`.pi/agent/` của bạn đã có **6 agents production-ready** (explore, general, plan, review, scout, vision) + **13 npm extensions** mạnh mẽ (`pi-srcwalk`, `pi-search`, `pi-vcc`, `pi-subagents`, `pi-augment`, `pi-boomerang`, `pi-tasks`, v.v.). Về mặt infrastructure, `.pi` của bạn **không thua `.opencode`**, thậm ra mạnh hơn ở vài điểm (parallel subagents lên tới 99, deterministic compaction).

### `.opencode` có gì mà `.pi` chưa có?

**A. Content chưa port (ưu tiên cao):**
- `AGENTS.md` (1 file, 200 lines) — behavioral kernel cực cô đọng
- 4 Tier-1 skills (~300 lines) — execution discipline
- 10 templates (~1500 lines) — project context patterns
- 9 slash commands (~1500 lines content) — UX layer
- 5 workflows (~800 lines) — DAG orchestration
- 55 Tier-2 skills (~50K lines content) — domain expertise

**B. Capability chưa có (ưu tiên trung bình, cần build packages mới):**
- `pi-memory` — 4-tier long-term memory (SQLite + FTS5) — **gap lớn nhất**
- `pi-session-summary` — anchored iterative summarization
- `pi-commands` — slash command dispatcher
- `pi-workflows` — DAG executor với phase composition
- `pi-guard` — safety hooks (curl-pipe blocker + conventional commits)
- `pi-skill-mcp` — bridge giữa skills và MCP servers

**C. Không cần port:**
- `tui.json` — opencode-specific
- Copilot custom provider — quá niche
- opencodekit's `srcwalk` — `pi-srcwalk` của bạn là strict superset
- opencodekit's `grepsearch`/`context7` — `pi-search` của bạn cover
- DCP mid-session compression — pi-vcc đã đủ cho hầu hết use cases

### Đề xuất lộ trình

| Phase | Effort | Output | ROI |
|-------|--------|--------|-----|
| **Phase 1 (1-2 ngày)** | Pure content port | AGENTS.md + 4 Tier-1 skills + 10 templates | 🟢 Cao |
| **Phase 2A (1 tuần)** | Build 2 packages | pi-commands + pi-workflows | 🟢 Cao |
| **Phase 2B (1-2 tuần)** | Build 1 package | pi-memory (gap lớn nhất) | 🟡 Trung bình-Cao |
| **Phase 2C (3-5 ngày)** | Build 3 packages | pi-guard + pi-session-summary + pi-skill-mcp | 🟡 Trung bình |
| **Phase 3 (tùy chọn)** | Content curation | Tier-2 skills pack | 🟠 Thấp (rất nhiều content) |

---

## Cấu trúc source `.opencode/`

```
/tmp/opencodekit-template/.opencode/
├── AGENTS.md                    ← 200 lines, behavioral kernel
├── opencode.json                ← 1000+ lines, providers + agents + permissions
├── dcp.jsonc                    ← Dynamic Context Protocol config
├── dcp-prompts/                 ← Compress tool prompt templates
│   ├── defaults/                ← system, compress-message, compress-range, nudges
│   └── overrides/               ← user-editable
├── package.json                 ← plugin deps
├── tsconfig.json
├── tui.json                     ← OpenCode TUI keybinds
├── QUALITY.md                   ← A/B/C/D grading per domain
├── .template-manifest.json      ← SHA-256 hashes of all files
├── .version
├── README.md
├── RELEASE.md
├── .env.example
├── .gitignore, .gitattributes
├── agent/                       ← 7 agent personas (markdown)
│   ├── build.md, explore.md, general.md, plan.md, review.md, scout.md, vision.md
├── command/                     ← 9 slash commands
│   ├── init.md, fix.md, verify.md, ship.md, audit.md
│   ├── research.md, gc.md, create.md, plan.md
├── workflows/                   ← 5 DAG workflows
│   ├── audit-pattern.md, garbage-collection.md
│   ├── batch-implement.md, deep-research.md
│   └── development-lifecycle-workflow.md
├── skill/                       ← 59 skills (4 Tier-1 + 55 Tier-2)
│   ├── manifest.json            ← tier classification
│   ├── behavioral-kernel/       ← Tier 1
│   ├── defense-in-depth/        ← Tier 1
│   ├── incremental-implementation/  ← Tier 1
│   ├── verification-before-completion/  ← Tier 1
│   └── [55 Tier-2 skills]/
├── plugin/                      ← 8 TypeScript plugins
│   ├── package.json
│   ├── srcwalk.ts + srcwalk/    ← code-intel (7 tools)
│   ├── memory.ts + memory/      ← 4-tier LTM (18 files)
│   ├── session-summary.ts + session-summary/
│   ├── codesearch.ts + codesearch/   ← BM25 csearch
│   ├── skill-mcp.ts + skill-mcp/     ← MCP bridge
│   ├── prompt-leverage.ts        ← 7-block framework
│   ├── guard.ts                  ← curl-pipe + conventional commits
│   ├── copilot-auth.ts           ← GitHub Copilot OAuth
│   └── sdk/copilot/              ← custom AI-SDK provider
├── tool/                        ← standalone tool definitions
│   ├── grepsearch.ts            ← grep.app wrapper
│   ├── context7.ts              ← context7.com docs lookup
│   └── structural-check.sh      ← architecture invariant enforcer
├── context/                     ← reference docs (not auto-injected)
│   ├── architecture.md
│   └── fallow.md
├── templates/                   ← 10 project templates
│   ├── prd.md, project.md, state.md, tech-stack.md
│   ├── tasks.md, roadmap.md, user.md, design.md
│   ├── proposal.md, adr.md
└── artifacts/                   ← generated artifacts per feature
    ├── .active
    ├── example/{plan,progress,research,spec}.md
    └── harness-workflows/plan.md
```

**Total: ~210 files, 12 thư mục, ước tính 50,000+ lines content**

---

## Cách đọc tài liệu này

- Nếu bạn muốn **bắt tay vào implement ngay** → đọc `00-overview.md` → `07-port-recommendations.md`
- Nếu bạn muốn **hiểu sâu từng layer** → đọc tuần tự 01 → 06
- Nếu bạn muốn **so sánh 1:1** giữa 2 hệ thống → xem coverage matrix ở cuối mỗi file
