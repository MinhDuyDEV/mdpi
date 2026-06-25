/**
 * Context Optimizer Coordinator Extension
 *
 * Orchestrates the 3-layer context-optimization stack so it auto-activates in
 * ANY .pi/ kit usage (not just workflow prompts):
 *
 *   rtk  (tool_call/tool_result)  — auto-compact tool output (inflow).        [auto]
 *   dcp  (context, every LLM call) — auto dedup + purge errors + nudge compress. [auto]
 *   vcc  (session_before_compact)  — deterministic no-LLM compaction + recall.   [manual by default]
 *
 * The three hook disjoint pi events (no conflict). This extension closes the
 * two auto-activation gaps the kit can't ship via package config alone:
 *   1. vcc has NO .pi/-project config — `overrideDefaultCompaction` defaults to
 *      false, so auto/overflow compactions bypass vcc and burn an LLM summary.
 *      We patch the global vcc config to `true` on session_start (idempotent).
 *   2. The agent is not guided to use vcc_recall/compress//pi-vcc in NORMAL
 *      usage — we inject a <context-optimization> policy block at every
 *      before_agent_start (always-present, like the memory-policy block).
 *
 * It also verifies the optional `rtk` binary (rtk rewrite is skipped gracefully
 * if absent; output compaction still works) and exposes /context-check for
 * observability. See .pi/skills/context-optimization/SKILL.md for the full
 * protocol. Respects user-owned rtk/dcp config (does not overwrite choices);
 * only flips the vcc DEFAULT (false→true).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function agentRoot(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");
}

function vccConfigPath(): string {
	return process.env.PI_VCC_CONFIG_PATH ?? path.join(agentRoot(), "pi-vcc-config.json");
}

/** Idempotently enable vcc auto-compaction (overrideDefaultCompaction: true). */
function ensureVccAutoCompaction(notify: (msg: string, level: "info" | "warning") => void): void {
	const p = vccConfigPath();
	let cfg: Record<string, unknown> = {};
	try {
		if (fs.existsSync(p)) cfg = JSON.parse(fs.readFileSync(p, "utf-8"));
	} catch {
		cfg = {}; // corrupt/empty → reset to sane defaults + the flag
	}
	if (cfg.overrideDefaultCompaction === true) return; // already optimal
	cfg.overrideDefaultCompaction = true;
	try {
		const tmp = `${p}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2));
		fs.renameSync(tmp, p);
		notify(
			"context-optimizer: enabled vcc auto-compaction (overrideDefaultCompaction:true) — auto/overflow compactions now use vcc's deterministic no-LLM summary.",
			"info",
		);
	} catch (e) {
		notify(`context-optimizer: could not patch vcc config (${String(e)}) — vcc stays manual.`, "warning");
	}
}

/** Verify the optional `rtk` binary (rewrite is skipped gracefully if missing). */
function checkRtkBinary(notify: (msg: string, level: "info" | "warning") => void): void {
	try {
		const res = spawnSync("rtk", ["--version"], { stdio: "ignore" });
		if (res.error || res.status !== 0) {
			notify(
				"context-optimizer: `rtk` binary not found — rtk command-rewriting is skipped (output compaction still active). Install rtk for full inflow compaction.",
				"warning",
			);
		}
	} catch {
		/* ignore — non-fatal */
	}
}

const POLICY = `<context-optimization>
Context is managed by a 3-layer stack (auto-active in any .pi/ kit):
- rtk: auto-compacts tool output (bash/read/grep/git/test/build/linter) — no action needed.
- dcp: auto-dedups + purges stale errors + applies compressions on every LLM call; nudges you to \`compress\` when context grows. When nudged, compress the CLOSED work-stream (range mode: startToolCallId + endToolCallId + a lossless summary preserving file:line, decisions, root causes, verification results).
- vcc: handles compaction deterministically (0 LLM); \`vcc_recall\` recovers pruned lineage.
Auto-use in normal usage (no workflow prompt needed):
- Before re-exploring a topic you may have already investigated, call \`vcc_recall({query:"<topic>"})\` to avoid repeating work.
- When a work-stream closes (artifact written / phase done / topic shift) or dcp nudges, \`compress\` that span.
- For manual compaction prefer \`/pi-vcc\` (deterministic, 0 LLM) over \`/compact\`.
- Skip any tool that is unavailable (graceful no-op).
</context-optimization>`;

export default function contextOptimizer(pi: ExtensionAPI) {
	// session_start: patch vcc config + verify rtk (only when a .pi/ kit is present).
	pi.on("session_start", async (_event, ctx) => {
		const notify = (msg: string, level: "info" | "warning") => {
			try {
				ctx.ui.notify(msg, level);
			} catch {
				/* ignore */
			}
		};
		// Only act inside a .pi/ kit (extension is project-local, but guard anyway).
		if (!fs.existsSync(path.join(ctx.cwd, ".pi", "settings.json"))) return;
		ensureVccAutoCompaction(notify);
		checkRtkBinary(notify);
	});

	// before_agent_start: inject the always-present context-optimization policy.
	pi.on("before_agent_start", async (event, _ctx) => {
		return { systemPrompt: event.systemPrompt + `\n\n${POLICY}` };
	});

	// /context-check: observability — report the 3-layer status.
	pi.registerCommand("context-check", {
		description: "Report the rtk/dcp/vcc context-optimization stack status",
		handler: async (_args, ctx) => {
			const lines: string[] = ["Context-optimization stack:"];
			// vcc
			let vccState = "unknown";
			try {
				const p = vccConfigPath();
				if (fs.existsSync(p)) {
					const c = JSON.parse(fs.readFileSync(p, "utf-8"));
					vccState = `overrideDefaultCompaction=${c.overrideDefaultCompaction ?? false}`;
				} else vccState = "config not created yet (will be on next session_start)";
			} catch {
				vccState = "config unreadable";
			}
			lines.push(`- vcc: ${vccState}${vccState.includes("true") ? " (auto-compaction ON)" : " (manual — auto will be enabled on session_start)"}`);
			// rtk binary
			let rtkState = "missing";
			try {
				const r = spawnSync("rtk", ["--version"], { stdio: "ignore" });
				if (!r.error && r.status === 0) rtkState = "installed (rewrite + output compaction)";
				else rtkState = "missing (output compaction only; rewrite skipped)";
			} catch {
				rtkState = "missing";
			}
			lines.push(`- rtk: ${rtkState}`);
			// dcp
			let dcpState = "global config";
			const projDcp = path.join(ctx.cwd, ".pi", "dcp.json");
			if (fs.existsSync(projDcp)) dcpState = ".pi/dcp.json project override present";
			lines.push(`- dcp: ${dcpState} (auto dedup + purge + nudge compress on every LLM call)`);
			lines.push("- policy block: injected every before_agent_start (vcc_recall / compress / /pi-vcc guidance)");
			try {
				ctx.ui.notify(lines.join("\n"), "info");
			} catch {
				/* ignore */
			}
		},
	});
}