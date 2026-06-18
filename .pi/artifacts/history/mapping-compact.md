# Mapping Compact — Synthesis trước khi execute

**Ngày:** 2026-06-17
**Mục đích:** Crystallize toàn bộ context đã scan → file này. Dùng làm single source of truth khi bắt đầu Phase A-D.

---

## 1. State thực tế của 3 phía

### A. Source opencodekit: `/tmp/opencodekit-template/.opencode/`
- **Cấu trúc:** 12 thư mục, 210+ files, ~50K+ lines
- **Key files:** `AGENTS.md` (240 lines), `opencode.json` (503 lines), `dcp.jsonc` (67 lines)
- **Content:** 7 agents, 9 commands, 59 skills (4 Tier-1 + 55 Tier-2), 5 workflows, 10 templates, 8 plugins, 3 tools, 2 context files, 6 dcp-prompts, QUALITY.md

### B. Global `.pi/agent/`: `/Users/minhduydev/.pi/agent/`
- **6 agents** (explore, general, plan, review, scout, vision) — theo `pi-subagents` `custom-agents.ts` schema
- **7 skills:** code-review-and-quality, code-simplification, debugging-and-error-recovery, git-workflow-and-versioning, incremental-implementation, test-driven-development, using-agent-skills
- **1 extension tự viết:** `pi-rtk-optimizer/`
- **14 npm packages** (qua `packages` field): `@tintinweb/pi-subagents`, `@heyhuynhgiabuu/pi-search`, `@tintinweb/pi-tasks`, `@sting8k/pi-vcc`, `@sting8k/pi-srcwalk`, `pi-ollama-cloud`, `pi-mcp-adapter`, `pi-btw`, `pi-ask-user`, `@davecodes/pi-dcp`, `pi-rtk-optimizer`, `pi-powerline-footer`, `git:github.com/sting8k/pi-droid-styling`, `git:github.com/sting8k/pi-themes`
- **NO** `prompts/`, `workflows/`, `templates/`, `context/` — chỉ có native 4 folders (agents, skills, extensions, npm)

### C. Workspace `pi/`: `/Users/minhduydev/workspace/ockit-mapping/pi/`
```
pi/
├── AGENTS.md (8.6K, scoped rules cho .pi/ content)
├── README.md (9.8K)
├── settings.json (8 extensions + skills + prompts, ~30 lines)
├── agents/ 7 file (build + 6)
├── extensions/ 8 TS files:
│   ├── commands-dispatcher.ts (3.1K)
│   ├── workflows-runner.ts (6.9K)
│   ├── templates-injector.ts (2.2K)
│   ├── pi-guard.ts (2.3K)
│   ├── pi-memory.ts (10.6K)
│   ├── pi-session-summary.ts (6.9K)
│   ├── dcp-strategies.ts (2.2K)
│   └── skill-mcp.ts (3.2K)
├── prompts/ 9 file (init, fix, verify, ship, audit, research, gc, create, plan)
├── workflows/ 5 DAG file
├── skills/ 59 directories (full opencodekit set)
├── templates/ 10 file (Beads PRD, project, state, tech-stack, tasks, roadmap, user, design, proposal, adr)
├── context/ 2 file (architecture.md, fallow.md)
├── state/ 2 runtime artifacts
└── tasks/ 1 runtime artifact
```

### D. Pi-coding-agent native (từ docs)
- **Settings:** `.pi/settings.json` (project overrides global, merge nested)
- **Extensions:** `.pi/extensions/*.ts` hoặc `*/index.ts` (jiti auto-discover)
- **Skills:** `.pi/skills/<name>/SKILL.md` (recursive) hoặc root `.md` (Agent Skills spec — name + description only)
- **Prompts:** `.pi/prompts/*.md` (**NON-RECURSIVE**, chỉ root)
- **NO native:** agents/, workflows/, templates/, context/ — phải dùng extension

---

## 2. Vấn đề nghiêm trọng của workspace `pi/` hiện tại

### 🔴 CRITICAL — sẽ crash hoặc không hoạt động

| File | Lỗi | Impact |
|---|---|---|
| `extensions/commands-dispatcher.ts:17` | `import { Type } from "typebox"` — package sai | Runtime crash khi load extension |
| `extensions/pi-memory.ts:22` | `import { Type } from "typebox"` — package sai | Runtime crash |
| `extensions/skill-mcp.ts:20` | `import { Type } from "typebox"` — package sai | Runtime crash |
| `extensions/workflows-runner.ts:16` | `import { Type } from "typebox"` — package sai | Runtime crash |
| `extensions/workflows-runner.ts` (whole file) | **Stub execution** — chỉ emit plan text, không dispatch subagent thật | `/ship` workflow sẽ không chạy |
| `extensions/skill-mcp.ts` (whole file) | **Placeholder** — chỉ list MCP, không bridge | Tính năng skill-mcp không hoạt động |

**Correct import:** `import { Type } from "@sinclair/typebox"` (4 files)

### 🟡 MEDIUM — work nhưng chưa "hợp lý" với pi

| File | Vấn đề |
|---|---|
| `extensions/pi-session-summary.ts:200` | `require("@earendil-works/pi-tui")` chưa verify export `Container`/`Text` |
| `extensions/pi-memory.ts` | 2/4 tiers chưa code (distill, curator); JSON persistence không scale |
| `templates/*.md` (10 files) | Vẫn tham chiếu `opencode.json` instructions[] (đã verify `tech-stack.md:9`) |
| `context/architecture.md` | Vẫn describe 6 layers opencodekit (Instructions/Commands/Workflows/Plugins/Tools/SDK) — không khớp pi |
| `agents/*.md` (7 files) | Cần verify frontmatter match `pi-subagents/custom-agents.ts` schema |
| `prompts/*.md` (9 files) | Cần verify đã strip `agent:` field + `skill({...})` syntax |

### 🟢 OK — không cần fix

| File | Note |
|---|---|
| `extensions/templates-injector.ts` | Clean, production-ready |
| `extensions/pi-guard.ts` | Clean, production-ready |
| `extensions/dcp-strategies.ts` | Clean, zero-cost DCP (subset của `@davecodes/pi-dcp`) |
| `context/fallow.md` | CLI reference, language-agnostic |
| `prompts/init.md` | Đã port sạch (sample đã verify) |
| `workflows/audit-pattern.md` | Đã port sạch (sample đã verify) |
| `skills/behavioral-kernel/SKILL.md` | Đã port sạch (sample đã verify) |
| `extensions/commands-dispatcher.ts` | OK ngoại trừ import bug |
| `AGENTS.md` (scoped) | 253 lines, đúng pattern pi-coding-agent scoped rules |

---

## 3. Đề xuất Mapping tối ưu (đã user-approved: Self-contained)

### 3.1. Nguyên tắc
1. **Chọn lọc** — Không port 100% opencodekit
2. **Thay thế bằng pi** — Dùng giải pháp pi tốt hơn
3. **Workflow hợp lý** — End-to-end: init → research → plan → ship

### 3.2. Quyết định thay thế (chức năng opencodekit → giải pháp pi)

| Opencodekit | Pi-native thay thế | Hành động |
|---|---|---|
| `srcwalk` plugin (7 tools) | `pi-srcwalk` (5 tools, BM25 + RRF, superset) | Dùng `pi-srcwalk` |
| `codesearch` plugin | `pi-search` (Exa AI) + `pi-srcwalk` (local) | Dùng `pi-search` |
| `webclaw` plugin | `pi-search` (web_fetch, Exa) | Dùng `pi-search` |
| `grepsearch` tool | `pi-search` (đã có tool) | Dùng `pi-search` |
| `context7` tool | `pi-search` (đã có tool) | Dùng `pi-search` |
| `dcp.jsonc` + 6 prompts (full DCP) | `@davecodes/pi-dcp` package (faithful port) | Ship minimal subset (chỉ zero-cost strategies) |
| `prompt-leverage` (7-block) | `pi-augment` (analog) | Dùng `pi-augment` |
| `copilot-auth` | Quá niche | DROP |
| `guard` plugin (curl-pipe + commits) | Không có sẵn | PORT → `pi-guard.ts` |
| `memory` plugin (4-tier LTM) | Không có sẵn | PORT minimal → `pi-memory.ts` |
| `session-summary` plugin | Pi-vcc (end-of-task only) | PORT → `pi-session-summary.ts` |
| `skill-mcp` plugin | Không có | DROP (quá stub, quá niche) |
| `command/*.md` (slash commands) | Pi-native prompts | ADAPT (đã có 9) |
| `workflows/*.md` (DAG) | Không có | BUILD runner + port (đã có 5) |
| `templates/*.md` (project context) | Không có | COPY + adapt (đã có 10) |
| `context/*.md` (reference) | Không có | COPY + adapt (đã có 2) |
| `AGENTS.md` (240 lines) | Pi đã có global AGENTS.md | SHIP scoped version (253 lines, đã có) |

### 3.3. Skill Triage (theo opencodekit's own design)

**Ship 17 skills (Tier 1+2), drop 42 skills (Tier 3):**

**Tier 1 (5 skills, auto-load):**
1. behavioral-kernel
2. verification-before-completion
3. incremental-implementation
4. defense-in-depth
5. using-agent-skills

**Tier 2 (12 skills, on-demand):**
1. code-review-and-quality
2. debugging-and-error-recovery
3. root-cause-tracing
4. test-driven-development
5. testing-anti-patterns
6. git-workflow-and-versioning
7. documentation-and-adrs
8. subagent-driven-development
9. spec-driven-development
10. brainstorming
11. planning-and-task-breakdown
12. code-simplification

**Tier 3 (42 skills, DROP từ kit):**
- Frontend/UI: frontend-design, react-best-practices, accessibility-audit, design-system-audit, design-taste-frontend, high-end-visual-design, industrial-brutalist-ui, minimalist-ui, mockup-to-code, redesign-existing-projects
- Platform: cloudflare, core-data-expert, polar, resend, supabase, supabase-postgres-best-practices, swift-concurrency, swiftui-expert-skill, vercel-deploy-claimable, ci-cd-and-automation
- Tools: figma, jira, gemini-large-context, webclaw, pdf-extract, opensrc, srcwalk, fallow
- Process: agent-code-quality-gate, code-cleanup, deprecation-and-migration, development-lifecycle, grill-me, security-and-hardening, shipping-and-launch, source-driven-development, performance-optimization, using-git-worktrees, api-and-interface-design, writing-skills, browser-testing-with-devtools, playwright, chrome-devtools

### 3.4. Cấu trúc kit tối ưu

```
.pi/                                      ← drop-in kit
├── AGENTS.md                             ← scoped (253 lines, OK)
├── settings.json                         ← 7 extensions + 17 skills + 9 prompts
├── README.md                             ← hướng dẫn sử dụng (cần viết)
├── agents/ 7 files (build + 6)
├── extensions/ 7 files (drop skill-mcp):
│   ├── commands-dispatcher.ts            ← FIX: typebox
│   ├── workflows-runner.ts               ← FIX: typebox + implement thật
│   ├── templates-injector.ts             ← OK
│   ├── pi-guard.ts                       ← OK
│   ├── pi-memory.ts                      ← FIX: typebox
│   ├── pi-session-summary.ts             ← VERIFY: pi-tui
│   └── dcp-strategies.ts                 ← OK (zero-cost DCP)
├── prompts/ 9 files (init, fix, verify, ship, audit, research, gc, create, plan)
├── workflows/ 5 files (audit-pattern, batch-implement, deep-research, garbage-collection, development-lifecycle)
├── skills/ 17 directories (Tier 1+2)
├── templates/ 10 files (FIX: opencode.json references)
└── context/ 2 files
    ├── architecture.md                   ← REWRITE: 5 layers pi
    └── fallow.md                         ← OK
```

### 3.5. Workflow End-to-End

**Greenfield:**
```
/init --all
  → Tạo AGENTS.md (root) + 5 templates
  → Skill: behavioral-kernel
/plan "feature X"
  → Skill: brainstorming (nếu ambiguous) + incremental-implementation
  → Output: .pi/artifacts/<slug>/plan.md
/ship
  → Workflow: batch-implement → audit-pattern → final synthesis
  → Skill: verification-before-completion
```

**Brownfield:**
```
/init --deep
  → Detect existing code, Tier 2 skill: code-review-and-quality
/research "X" | /audit "pattern"
  → Workflow: deep-research | audit-pattern
  → Skill: root-cause-tracing (nếu bug)
/plan → /ship
```

**Bug fix:**
```
/fix "<description>"
  → Skill: root-cause-tracing
  → 4 phases: reproduce → isolate → fix → verify
```

**Daily:**
```
Primary agent tự route dựa trên intent:
- "find X" → subagent(explore) + pi-srcwalk
- "research X" → subagent(scout) + pi-search
- "review X" → subagent(review)
- "implement X" → subagent(general) cho 1-3 files, plan() cho multi-file
- "design X" → subagent(vision)
```

---

## 4. Phased execution plan

### Phase A: Critical fixes (kit không load nổi nếu không fix)
| # | Action | File | Effort |
|---|---|---|---|
| A1 | Fix `typebox` → `@sinclair/typebox` | 4 files: commands-dispatcher, pi-memory, skill-mcp, workflows-runner | 5 phút |
| A2 | Implement workflow execution (không stub) | `workflows-runner.ts` | 4-6 giờ |
| A3 | Verify `pi-tui` import trong `pi-session-summary.ts` | `pi-session-summary.ts:200` | 30 phút |
| A4 | Drop `skill-mcp` (stub, niche) hoặc fix minimal | DELETE `skill-mcp.ts` + remove from settings.json | 5 phút |

**Phase A total: ~5-7 giờ**

### Phase B: Adapt content (kit hợp lý với pi)
| # | Action | File | Effort |
|---|---|---|---|
| B1 | Rewrite `architecture.md` cho pi 5 layers | `context/architecture.md` | 30 phút |
| B2 | Fix `opencode.json` references trong templates | 10 files templates | 15 phút |
| B3 | Verify agents frontmatter match pi-subagents schema | 7 files agents | 15 phút |
| B4 | Verify prompts đã strip `agent:` field + `skill({...})` syntax | 9 files prompts | 15 phút |
| B5 | Verify workflows format match workflows-runner parser | 5 files workflows | 15 phút |

**Phase B total: ~1.5-2 giờ**

### Phase C: Triage (giảm kích thước)
| # | Action | Effort |
|---|---|---|
| C1 | Move 42 Tier-3 skills ra khỏi kit (chuyển sang `skills/_tier-3-archive/` hoặc document riêng) | 30 phút |
| C2 | Tạo `skills/INDEX.md` mapping task → skill (giúp agent discover) | 30 phút |

**Phase C total: ~1 giờ**

### Phase D: Polish (production-ready)
| # | Action | Effort |
|---|---|---|
| D1 | Viết kit README với workflow diagrams | 1 giờ |
| D2 | Verify 1 workflow end-to-end (`/init` → `/plan` → `/ship`) | 1 giờ |
| D3 | Verify load được trong pi-coding-agent (chạy `pi` xem errors) | 30 phút |
| D4 | Add tier-3 install instructions vào README | 30 phút |

**Phase D total: ~3 giờ**

### Total: ~10-13 giờ (~1.5-2 ngày)

---

## 5. Verification gates (sau mỗi phase)

**Sau Phase A:**
- [ ] `pi` load được workspace `pi/` không crash
- [ ] Tất cả extension files compile (jiti không error)
- [ ] 0 import errors

**Sau Phase B:**
- [ ] 0 references đến `opencode.json` trong templates
- [ ] `architecture.md` describe đúng pi 5 layers
- [ ] Tất cả agents có frontmatter match schema
- [ ] Tất cả prompts không có `agent:` field

**Sau Phase C:**
- [ ] Kit size < 200KB (từ ~500KB)
- [ ] `skills/INDEX.md` tồn tại với task→skill mapping

**Sau Phase D:**
- [ ] `/init` chạy thành công end-to-end
- [ ] `/plan` tạo plan.md
- [ ] `/ship` execute được ít nhất 1 task
- [ ] README có workflow diagrams

---

## 6. Out-of-scope (không làm)

- ❌ Port `build.md` differently (analysis cũ nói skip — workspace vẫn có, giữ)
- ❌ Build `pi-templates` auto-inject differently (đã có `templates-injector.ts`)
- ❌ Build `pi-dcp` full (analysis cũ nói skip — kit chỉ ship zero-cost strategies)
- ❌ Build `pi-copilot` auth (niche, skip)
- ❌ Inline 4 Tier-1 skills vào AGENTS.md (đã có 17 skills riêng)
- ❌ Port thêm bất cứ thứ gì từ opencodekit (đã có hết)

---

## 7. References (file:line)

- Pi-coding-agent docs: `/Users/minhduydev/.nvm/versions/node/v24.15.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/`
- pi-subagents source: `/Users/minhduydev/.pi/agent/npm/node_modules/@tintinweb/pi-subagents/src/custom-agents.ts`
- pi-dcp package: `/Users/minhduydev/.pi/agent/npm/node_modules/@davecodes/pi-dcp/`
- Source opencodekit: `/tmp/opencodekit-template/.opencode/`
- Source opencodekit (init tại workspace): `.opencode/`
- Workspace `pi/` (sẽ rename thành `.pi/`): `pi/`
- Global `.pi/agent/`: `/Users/minhduydev/.pi/agent/`
