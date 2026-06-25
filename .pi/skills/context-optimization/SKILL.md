---
name: context-optimization
description: "Auto-activating 3-layer context-optimization stack for the mdpi .pi/ kit: rtk (tool-output compaction, auto), dcp (in-flight pruning + compress nudge, auto), vcc (deterministic compaction + vcc_recall). Load when you need to understand how context is kept lean in long sessions, when to call vcc_recall/compress//pi-vcc, or to tune the stack. A policy block is auto-injected every turn via the context-optimizer extension."
---

# Context Optimization (3-layer stack)

## Overview

The kit keeps long sessions cheap via 3 complementary extensions that hook **disjoint pi events** (no conflict). The `context-optimizer` extension auto-activates them in **any .pi/ kit usage** (not just workflow prompts) — patching vcc auto-compaction + injecting a policy block every turn.

| Layer | Package | Pi event | Role | Auto? |
|---|---|---|---|---|
| Inflow | rtk | `tool_call`/`tool_result` | auto-rewrite bash→rtk + compact tool output (ANSI/test/build/git/linter/search/truncate) | ✅ auto |
| In-flight | dcp | `context` (every LLM call) | auto dedup + purge stale errors + apply compressions + nudge `compress` | ✅ auto |
| Compaction | vcc | `session_before_compact` | deterministic no-LLM structured summary (35–99% reduction) + `vcc_recall` recover lineage | ✅ auto (`overrideDefaultCompaction:true`, patched by context-optimizer) |

**Pipeline:** rtk shrinks inflow → dcp prunes in-flight + nudges compress → vcc handles compaction deterministically + recall. Each owns a distinct stage; no redundant work.

## How it auto-activates (normal usage, no workflow prompt needed)

The `context-optimizer` extension (`.pi/extensions/context-optimizer.ts`):
- **session_start** (in a `.pi/` kit): patches `~/.pi/agent/pi-vcc-config.json` `overrideDefaultCompaction:true` (idempotent) + verifies the `rtk` binary (warns if missing).
- **before_agent_start** (every turn): injects a `<context-optimization>` policy block guiding you to `vcc_recall` / `compress` / `/pi-vcc`.

rtk + dcp are auto by their own defaults; vcc auto via the patched config.

## When to use each

- **Before re-exploring a topic** you may have already investigated → `vcc_recall({query:"<topic>"})` (avoid repeating work; recover pruned lineage).
- **When a work-stream closes** (artifact written / phase done / topic shift) OR dcp nudges → `compress({startToolCallId, endToolCallId, topic, summary})` (range mode).
- **For manual compaction** → `/pi-vcc` (deterministic, 0 LLM) over `/compact`.
- **rtk + dcp auto** → no action (they handle inflow compaction + dedup/purge/nudge).

## Compress safeguards (dcp)

- Only compress **closed** spans (artifact written or output consumed by the next phase).
- Never pick endpoints inside the last 3 turns (turn protection).
- Summary must be **lossless-but-terse**: file:line, root cause, decisions, verification results.
- Skip if `compress` is unavailable (graceful no-op).

## Config

- **vcc**: `~/.pi/agent/pi-vcc-config.json` — `overrideDefaultCompaction:true` (auto-patched by the extension). Global only (no `.pi/` project config).
- **dcp**: `~/.pi-dcp/config.json` (global) + `.pi/dcp.json` (project override, shipped by the kit). Auto dedup + purge + nudge.
- **rtk**: `~/.pi/agent/extensions/pi-rtk-optimizer/config.json` (global, **user-owned — not overwritten** by the kit). Defaults are already optimal.

## Observability

- `/context-check` — reports vcc/rtk/dcp stack status.
- `/dcp context` + `/dcp stats` — dcp token usage + lifetime savings.
- `/rtk stats` — rtk output-compaction metrics.
- vcc emits a toast on each compaction.

## Pitfalls

- **rtk binary missing** → rewrite skipped (output compaction still works). Install `rtk` for full inflow compaction.
- **vcc config is global** — once auto-patched, vcc auto-compaction applies to ALL projects (intended for full-auto).
- **compress is agent-initiated** — dcp nudges but you decide; don't ignore nudges in long sessions or context fills and overflow compaction fires.
- **Don't overwrite user rtk/dcp config** — the extension only flips the vcc default; respect user-owned runtime config.

## Verification

- [ ] `/context-check` shows vcc `overrideDefaultCompaction=true` + rtk installed + dcp active.
- [ ] In a long session, dcp nudges fire as context grows; you compress closed spans.
- [ ] After compaction, `vcc_recall` recovers the pruned lineage (no loss in practice).
- [ ] `/rtk stats` + `/dcp stats` show non-zero savings.