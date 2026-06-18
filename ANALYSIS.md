# OpenCodeKit → .pi Mapping Analysis

Generated: 2026-06-16
Source: /tmp/opencodekit-template/.opencode/
Target: /Users/minhduydev/.pi/agent/

## Coverage Matrix

| Capability | .opencode | .pi current | Status | Action |
|---|---|---|---|---|
| Agent personas (7) | 7 files | 6 files | 🟡 | Add build.md (optional) |
| Tier-1 behavioral skills (4) | 4 SKILL.md | scattered in agents | 🟡 | Add as AGENTS.md sections |
| Slash commands (9) | 9 .md files | none | 🔴 | Build pi-commands extension |
| Workflows (5) | 5 .md DAG files | none | 🔴 | Build pi-workflows extension |
| Tier-2 skills (55) | 55 SKILL.md | none | 🔴 | Build pi-skills pack (or port individually) |
| Templates (10) | 10 .md files | none | 🟡 | Copy to .pi/agent/templates/ |
| Code-intel (srcwalk) | 7 tools | 5 tools (pi-srcwalk) | ✅ | None — superset |
| External research | 3 tools | 5 tools (pi-search) | ✅ | None — superset |
| Prompt leverage | transform hook | pi-augment slash | ✅ | None — analog |
| Context compression | DCP (mid-session) | pi-vcc (end-of-task) | ✅ | None — adjacent paradigms |
| Long-term memory | 4-tier SQLite | vcc_recall only | 🔴 | Build pi-memory extension |
| Session summary | anchored persist | none | 🔴 | Build pi-session-summary |
| Skill-MCP bridge | skill-mcp.ts | none | 🟡 | Optional — low priority |
| Safety guard | guard.ts | none | 🟡 | Build pi-guard (small) |
| Copilot provider | sdk/copilot | none | ⚪ | Skip — too niche |
| Structural check | .sh script | none | 🟡 | Build pi-lint (small) |
| Subagent delegation | task() | pi-subagents (mc=99) | ✅ | None — stronger |
| Todo tracking | todowrite | pi-tasks | ✅ | None |
| TUI customization | tui.json | built-in | ⚪ | N/A |

Legend: ✅ done · 🟡 small effort · 🔴 medium effort · ⚪ skip

## Port Difficulty Tiers

### Tier 1: Pure content ports (no new infrastructure)
- AGENTS.md (1 file, ~200 lines)
- 4 Tier-1 skills (4 files, ~300 lines total)
- 10 templates (10 files, ~1500 lines total)
- TDD section for general.md (~30 lines)
- Memory ritual for plan.md (~50 lines)

**Total: ~2100 lines content, 0 new code.**

### Tier 2: New pi extensions (npm packages)
- pi-commands (slash dispatcher): ~300 lines TS + 9 command .md files (~1500 lines content)
- pi-workflows (DAG executor): ~500 lines TS + 5 workflow .md files (~800 lines content)
- pi-memory (4-tier LTM): ~2000 lines TS + SQLite schema
- pi-guard (safety hooks): ~150 lines TS
- pi-session-summary (anchored summary): ~400 lines TS

**Total: ~3350 lines TS, ~2300 lines content, 5 packages.**

### Tier 3: Tier-2 skills (content packs)
- 55 SKILL.md files from opencodekit → optional pi-skills pack
- ~50,000 lines content (large effort to curate)

## Implementation Sequence (suggested)

1. **Day 1 (Tier 1):** AGENTS.md + Tier-1 skills + templates — pure markdown copy
2. **Day 2-3 (Tier 2a):** pi-commands + pi-workflows — highest leverage
3. **Day 4-5 (Tier 2b):** pi-memory — biggest gap closer
4. **Day 6+ (Tier 2c/3):** pi-guard, pi-session-summary, skills pack

## What NOT to Port (with reasons)

- **opencodekit's srcwalk** — pi-srcwalk is a strict superset with BM25 + PRF
- **opencodekit's grepsearch/context7** — pi-search bundles identical APIs
- **DCP mid-session compression** — different paradigm; pi-vcc handles end-of-task
- **Copilot provider** — too niche, most users have direct API access
- **tui.json** — opencode-specific TUI config; pi manages internally
- **opencodekit's prompt-leverage transform hook** — pi-augment covers the same ground via slash command
- **Most Tier-2 skills** — only port the ones you actually use (frontend-design, react-best-practices, test-driven-development are likely candidates)
