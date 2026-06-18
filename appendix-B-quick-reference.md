# Appendix B - Quick Reference

> **Mục đích:** Bảng tra cứu nhanh — file này ở đâu, dùng khi nào, effort bao nhiêu.

---

## File Index (8 main + 1 appendix)

| File | Nội dung | Khi nào đọc | Lines |
|------|----------|-------------|-------|
| [`README.md`](../README.md) | Entry point, TL;DR, structure | Đầu tiên | ~150 |
| [`00-overview.md`](../00-overview.md) | State-of-play, coverage matrix, 3-tier roadmap | Sau README | ~250 |
| [`01-agents-mapping.md`](../01-agents-mapping.md) | 7 agents opencodekit ↔ 6 agents pi chi tiết | Cần hiểu agent gap | ~350 |
| [`02-commands-porting.md`](../02-commands-porting.md) | 9 commands + 5 workflows, porting strategy | Plan Phase 2A | ~500 |
| [`03-skills-inventory.md`](../03-skills-inventory.md) | 59 skills (4 Tier-1 + 55 Tier-2), manifest schema | Plan Phase 1 + 3 | ~700 |
| [`04-templates-and-context.md`](../04-templates-and-context.md) | 10 templates + 2 context files + QUALITY.md | Plan Phase 1 | ~400 |
| [`05-plugins-architecture.md`](../05-plugins-architecture.md) | 8 plugins, 4-tier memory, session-summary, guard | Plan Phase 2B + 2C | ~500 |
| [`06-dcp-and-compression.md`](../06-dcp-and-compression.md) | DCP framework, prompts, vs pi-vcc | Decide có port DCP không | ~300 |
| [`07-port-recommendations.md`](../07-port-recommendations.md) | Phased roadmap, implementation details, copy-paste snippets | Execute phases | ~700 |
| [`appendix-A-phase1-sources.md`](../appendix-A-phase1-sources.md) | AGENTS.md full content + copy-paste commands | Implement Phase 1 | ~400 |

---

## Phase → Action Quick Map

### Phase 1: Foundation (1-2 ngày)

**Files to read:**
- `00-overview.md` (Section: Nhóm A)
- `03-skills-inventory.md` (Section F: Tier-1 content)
- `04-templates-and-context.md` (Section E: Implementation Plan)
- `appendix-A-phase1-sources.md` (full AGENTS.md + bash script)

**Files to create:**
- `/Users/minhduydev/.pi/agent/AGENTS.md` (270 lines)
- `/Users/minhduydev/.pi/agent/templates/*.md` (10 files, copy from opencodekit)
- `/Users/minhduydev/.pi/agent/context/{architecture,fallow}.md` (2 files, copy)
- `/Users/minhduydev/.pi/agent/QUALITY.md` (optional)

**Effort:** 4-8 giờ (mostly copy + adjust)
**Value:** 🟢 Foundation cho mọi phase sau

### Phase 2A: UX Layer (1-1.5 tuần)

**Files to read:**
- `02-commands-porting.md` (full)
- `07-port-recommendations.md` (Section Phase 2A)

**Packages to build:**
- `pi-commands` (300 lines TS + 9 command .md files)
- `pi-workflows` (500 lines TS + 5 workflow .md files)

**Update:**
- `/Users/minhduydev/.pi/agent/settings.json` (add 2 new extensions)

**Effort:** 5-7 ngày
**Value:** 🟢 UX layer giống opencodekit

### Phase 2B: Long-Term Memory (1-2 tuần)

**Files to read:**
- `05-plugins-architecture.md` (Section B: memory plugin)
- `07-port-recommendations.md` (Section Phase 2B)

**Package to build:**
- `pi-memory` (2000 lines TS + SQLite schema + tests)
  - Replicate 4 systems: Capture → Distill → Curate → Inject
  - 3 tools: observation, memory-search, memory-admin
  - 5 hooks: capture, distill, curate, inject, compact

**Effort:** 1-2 tuần
**Value:** 🟢 **Largest gap filled**

### Phase 2C: Polish (1 tuần)

**Files to read:**
- `05-plugins-architecture.md` (Sections C, E, G: session-summary, skill-mcp, guard)
- `07-port-recommendations.md` (Section Phase 2C)

**Packages to build:**
- `pi-guard` (150 lines TS) — 2-3 giờ
- `pi-session-summary` (400 lines TS) — 3-5 ngày
- `pi-skill-mcp` (300 lines TS, optional) — 1-2 ngày

**Effort:** 5-7 ngày
**Value:** 🟡 Polish

### Phase 3: Long-tail (tùy nhu cầu)

**Files to read:**
- `03-skills-inventory.md` (Section F: Tier-2A high-value skills)
- `06-dcp-and-compression.md` (Section E: zero-cost strategies)
- `07-port-recommendations.md` (Section Phase 3)

**Optional work:**
- Port 8 high-value Tier-2 skills
- Add 2 zero-cost strategies to pi-vcc
- Build `pi-dcp` extension (low priority)
- Build `pi-skills` pack (low priority)

**Effort:** Tùy nhu cầu
**Value:** 🟠 Lower

---

## Source Files Reference (`.opencode` originals)

Tất cả files trong `/tmp/opencodekit-template/.opencode/` đã được reference chi tiết. Nếu bạn cần xem original:

| File | Used in |
|------|---------|
| `AGENTS.md` | `appendix-A-phase1-sources.md` (adapted) |
| `agent/*.md` (7 files) | `01-agents-mapping.md` |
| `command/*.md` (9 files) | `02-commands-porting.md` |
| `workflows/*.md` (5 files) | `02-commands-porting.md` |
| `skill/manifest.json` | `03-skills-inventory.md` |
| `skill/{behavioral-kernel,defense-in-depth,incremental-implementation,verification-before-completion}/SKILL.md` | `03-skills-inventory.md` + `appendix-A-phase1-sources.md` |
| `skill/<other 55>/SKILL.md` | `03-skills-inventory.md` (inventory only) |
| `templates/*.md` (10 files) | `04-templates-and-context.md` |
| `context/{architecture,fallow}.md` | `04-templates-and-context.md` |
| `plugin/srcwalk.ts` | `05-plugins-architecture.md` |
| `plugin/memory.ts` (+18 files) | `05-plugins-architecture.md` |
| `plugin/session-summary.ts` | `05-plugins-architecture.md` |
| `plugin/codesearch.ts` | `05-plugins-architecture.md` |
| `plugin/skill-mcp.ts` | `05-plugins-architecture.md` |
| `plugin/prompt-leverage.ts` | `05-plugins-architecture.md` |
| `plugin/guard.ts` | `05-plugins-architecture.md` |
| `plugin/copilot-auth.ts` | `05-plugins-architecture.md` |
| `dcp.jsonc` | `06-dcp-and-compression.md` |
| `dcp-prompts/*.md` (6 files) | `06-dcp-and-compression.md` |
| `QUALITY.md` | `04-templates-and-context.md` |
| `.template-manifest.json` | `04-templates-and-context.md` (skip) |
| `opencode.json` | `01-agents-mapping.md` (read-only reference) |

**Total opencodekit files referenced: ~60 files**

---

## Effort Cheat Sheet

| Action | Effort | ROI |
|--------|--------|-----|
| Copy 1 markdown file | 1 phút | — |
| Adjust frontmatter dates | 30 giây/file | — |
| Create AGENTS.md (270 lines) | 1-2 giờ | 🟢 Foundation |
| Copy 10 templates | 30 phút | 🟢 Templates ready |
| Copy 2 context files | 5 phút | 🟢 Reference docs |
| Build `pi-guard` (150 lines TS) | 2-3 giờ | 🟢 Safety |
| Build `pi-commands` (300 lines TS) | 2-3 ngày | 🟢 UX layer |
| Build `pi-workflows` (500 lines TS) | 3-4 ngày | 🟢 DAG executor |
| Build `pi-session-summary` (400 lines TS) | 3-5 ngày | 🟡 Compaction complement |
| Build `pi-memory` (2000 lines TS) | 1-2 tuần | 🟢 **Largest gap** |
| Port 1 Tier-2 skill | 1-2 giờ | 🟡 Domain-specific |
| Add 2 zero-cost strategies to pi-vcc | 4-6 giờ | 🟡 Long sessions |
| Build `pi-dcp` (full) | 1 tuần | 🟠 Low priority |
| Build `pi-skills` (55 skills pack) | 3-5 ngày | 🟠 Low priority |
| Build `pi-copilot` (Copilot auth) | 1-2 ngày | ⚪ Skip (too niche) |

---

## Decision Flowchart

```
START
  │
  ├─ Want behavioral rules + project templates?
  │   YES → Phase 1 (1-2 ngày) → DONE (foundation)
  │   NO  ↓
  │
  ├─ Want slash commands + workflows UX?
  │   YES → Phase 1 + Phase 2A (2-3 tuần) → DONE (UX parity)
  │   NO  ↓
  │
  ├─ Want long-term memory across sessions?
  │   YES → Phase 1 + 2A + 2B (3-4 tuần) → DONE (full parity)
  │   NO  ↓
  │
  ├─ Want safety hooks + session summary?
  │   YES → + Phase 2C (1 tuần) → DONE (polish)
  │   NO  ↓
  │
  └─ Want Tier-2 skills + DCP?
      YES → + Phase 3 (tùy nhu cầu) → DONE (long-tail)
      NO  → STOP HERE (sweet spot)
```

---

## Nguồn tham khảo

- OpenCodeKit template: `/tmp/opencodekit-template/`
- Pi documentation: `/Users/minhduydev/.nvm/versions/node/v24.15.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/`
- Pi extensions: `/Users/minhduydev/.pi/agent/npm/node_modules/`
- This analysis: `/tmp/ockit-mapping/`

---

**Questions?** Re-read specific file theo index ở trên.
