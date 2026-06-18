/**
 * Session Summary Extension
 *
 * Anchored iterative summarization that survives pi-vcc compaction cycles.
 * Tracks file artifact trail (read/edit/write), decisions, and session intent.
 *
 * Persistence: .pi/state/session-summary.md
 * Hooks: tool.execute.before, before_agent_start, session.compacting
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface SessionSummary {
	sessionId: string;
	startedAt: number;
	lastUpdatedAt: number;
	intent: string;
	filesRead: Set<string>;
	filesModified: Set<string>;
	filesCreated: Set<string>;
	decisions: Array<{ ts: number; text: string; rationale?: string }>;
	openQuestions: string[];
	nextSteps: string[];
}

let currentSummary: SessionSummary | null = null;

function emptySummary(): SessionSummary {
	return {
		sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		startedAt: Date.now(),
		lastUpdatedAt: Date.now(),
		intent: "",
		filesRead: new Set(),
		filesModified: new Set(),
		filesCreated: new Set(),
		decisions: [],
		openQuestions: [],
		nextSteps: [],
	};
}

function getSummaryFile(cwd: string): string {
	return path.join(cwd, ".pi", "state", "session-summary.json");
}

function getMarkdownFile(cwd: string): string {
	return path.join(cwd, ".pi", "state", "session-summary.md");
}

function saveSummary(cwd: string, summary: SessionSummary): void {
	const stateDir = path.join(cwd, ".pi", "state");
	fs.mkdirSync(stateDir, { recursive: true });

	// JSON for programmatic access
	const json = {
		...summary,
		filesRead: Array.from(summary.filesRead),
		filesModified: Array.from(summary.filesModified),
		filesCreated: Array.from(summary.filesCreated),
	};
	fs.writeFileSync(getSummaryFile(cwd), JSON.stringify(json, null, 2));

	// Markdown for human reading
	const md = renderMarkdown(summary);
	fs.writeFileSync(getMarkdownFile(cwd), md);
}

function renderMarkdown(s: SessionSummary): string {
	const lines: string[] = [];
	lines.push(`# Session Summary`);
	lines.push("");
	lines.push(`**Session ID**: ${s.sessionId}`);
	lines.push(`**Started**: ${new Date(s.startedAt).toISOString()}`);
	lines.push(`**Last updated**: ${new Date(s.lastUpdatedAt).toISOString()}`);
	lines.push("");

	if (s.intent) {
		lines.push("## Intent");
		lines.push(s.intent);
		lines.push("");
	}

	if (s.filesRead.size > 0) {
		lines.push(`## Files Read (${s.filesRead.size})`);
		for (const f of Array.from(s.filesRead).sort()) lines.push(`- ${f}`);
		lines.push("");
	}

	if (s.filesModified.size > 0) {
		lines.push(`## Files Modified (${s.filesModified.size})`);
		for (const f of Array.from(s.filesModified).sort()) lines.push(`- ${f}`);
		lines.push("");
	}

	if (s.filesCreated.size > 0) {
		lines.push(`## Files Created (${s.filesCreated.size})`);
		for (const f of Array.from(s.filesCreated).sort()) lines.push(`- ${f}`);
		lines.push("");
	}

	if (s.decisions.length > 0) {
		lines.push(`## Decisions (${s.decisions.length})`);
		for (const d of s.decisions) {
			lines.push(`- **${new Date(d.ts).toISOString()}**: ${d.text}`);
			if (d.rationale) lines.push(`  - Rationale: ${d.rationale}`);
		}
		lines.push("");
	}

	if (s.openQuestions.length > 0) {
		lines.push(`## Open Questions`);
		for (const q of s.openQuestions) lines.push(`- ${q}`);
		lines.push("");
	}

	if (s.nextSteps.length > 0) {
		lines.push(`## Next Steps`);
		for (const n of s.nextSteps) lines.push(`- [ ] ${n}`);
		lines.push("");
	}

	return lines.join("\n");
}

function loadSummary(cwd: string): SessionSummary | null {
	const file = getSummaryFile(cwd);
	if (!fs.existsSync(file)) return null;
	try {
		const json = JSON.parse(fs.readFileSync(file, "utf-8"));
		return {
			...json,
			filesRead: new Set(json.filesRead ?? []),
			filesModified: new Set(json.filesModified ?? []),
			filesCreated: new Set(json.filesCreated ?? []),
		};
	} catch {
		return null;
	}
}

export default function piSessionSummary(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const existing = loadSummary(ctx.cwd);
		currentSummary = existing ?? emptySummary();
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		if (!currentSummary) return;

		const input = event.input as { path?: string; file_path?: string } | undefined;
		if (!input) return;

		const filePath = input.path ?? input.file_path;
		if (!filePath) return;

		if (event.toolName === "read") {
			currentSummary.filesRead.add(filePath);
		} else if (event.toolName === "edit") {
			currentSummary.filesModified.add(filePath);
		} else if (event.toolName === "write") {
			currentSummary.filesCreated.add(filePath);
		}

		currentSummary.lastUpdatedAt = Date.now();
		saveSummary(ctx.cwd, currentSummary);
	});

	pi.on("session_compact", async (_event, ctx) => {
		if (currentSummary) {
			saveSummary(ctx.cwd, currentSummary);
		}
	});

	// Inject summary into system prompt at session start
	pi.on("before_agent_start", async (event, ctx) => {
		if (!currentSummary) return;
		if (currentSummary.filesRead.size === 0 && currentSummary.decisions.length === 0) return;

		const summary = currentSummary;
		const summaryText = renderMarkdown(summary);

		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n## Session Summary (anchored)\n\n${summaryText}\n\n` +
				`Use this summary to orient after compaction. Update via decision() and intent() helpers.`,
		};
	});

	pi.registerCommand("summary", {
		description: "Show current session summary",
		handler: async (_args, ctx) => {
			if (!currentSummary) {
				ctx.ui.notify("No active session summary", "info");
				return;
			}
			const md = renderMarkdown(currentSummary);
			await ctx.ui.custom((_tui, theme, _kb, done) => {
				const { Box, Text } = require("@earendil-works/pi-tui");
				const container = new Box();
				container.addChild(new Text(theme.fg("accent", theme.bold("Session Summary")), 0, 0));
				container.addChild(new Text(md, 0, 0));
				container.addChild(new Text(theme.fg("dim", "Press Esc to close"), 0, 0));
				return {
					render: (width: number) => container.render(width),
					invalidate: () => container.invalidate(),
					handleInput: (data: string) => {
						if (data === "\x1b" || data === "\r") done(undefined);
					},
				};
			});
		},
	});

	pi.registerCommand("decision", {
		description: "Record a decision in session summary",
		handler: async (args, ctx) => {
			if (!currentSummary) {
				ctx.ui.notify("No active session", "warning");
				return;
			}
			currentSummary.decisions.push({ ts: Date.now(), text: args });
			currentSummary.lastUpdatedAt = Date.now();
			saveSummary(ctx.cwd, currentSummary);
			ctx.ui.notify(`Decision recorded: ${args}`, "info");
		},
	});

	pi.registerCommand("intent", {
		description: "Set session intent",
		handler: async (args, ctx) => {
			if (!currentSummary) {
				currentSummary = emptySummary();
			}
			currentSummary.intent = args;
			currentSummary.lastUpdatedAt = Date.now();
			saveSummary(ctx.cwd, currentSummary);
			ctx.ui.notify(`Intent set: ${args}`, "info");
		},
	});
}
