/**
 * Session Search Extension — episodic recall across past sessions (replaces
 * hermes `session_search`). No SQLite, no native dep — greps pi's on-disk JSONL
 * session store.
 *
 * Sessions live at <agentRoot>/sessions/--<cwd as "-"-joined>--/*.jsonl
 * (agentRoot = $PI_CODING_AGENT_DIR || ~/.pi/agent). Each line is a JSON entry;
 * `type:"message"` entries carry `message.{role, content: [{type:"text",text}]}`.
 *
 * Default: searches the CURRENT project's sessions (bounded + most useful).
 * `project` param: substring-match other projects' session dirs.
 * Bounded: most-recent ~40 session files, returns up to `limit` (default 5) snippets.
 *
 * Use for durable, cross-session recall of what was discussed/tried. For
 * current-session lineage use vcc_recall instead.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

function agentRoot(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");
}

function sessionsRoot(): string {
	return path.join(agentRoot(), "sessions");
}

/** cwd → session dir name, e.g. /Users/x/proj → --Users-x-proj-- */
function dirForCwd(cwd: string): string {
	return "--" + cwd.split("/").filter(Boolean).join("-") + "--";
}

function extractText(message: { content?: unknown }): string {
	const c = message.content;
	if (typeof c === "string") return c;
	if (!Array.isArray(c)) return "";
	const parts: string[] = [];
	for (const p of c as Array<{ type?: string; text?: string }>) {
		if (p && p.type === "text" && typeof p.text === "string") parts.push(p.text);
	}
	return parts.join("\n");
}

function dateFromFilename(file: string): string {
	const base = path.basename(file);
	const m = base.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
	return m ? m[1].replace(/-/g, (s, i: number) => (i > 9 ? ":" : s)) : base;
}

interface Hit {
	file: string;
	date: string;
	role: string;
	snippet: string;
}

function searchFile(file: string, query: string, roleFilter: string | undefined, hits: Hit[], limit: number): void {
	let raw: string;
	try {
		raw = fs.readFileSync(file, "utf-8");
	} catch {
		return;
	}
	const date = dateFromFilename(file);
	for (const line of raw.split("\n")) {
		if (!line.trim()) continue;
		if (hits.length >= limit) return;
		let entry: { type?: string; message?: { role?: string; content?: unknown } };
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}
		if (entry.type !== "message" || !entry.message) continue;
		const role = entry.message.role ?? "?";
		if (roleFilter && role !== roleFilter) continue;
		const text = extractText(entry.message);
		if (!text) continue;
		const idx = text.toLowerCase().indexOf(query.toLowerCase());
		if (idx < 0) continue;
		const start = Math.max(0, idx - 100);
		const snippet = (start > 0 ? "…" : "") + text.slice(start, idx + query.length + 120).replace(/\s+/g, " ") + "…";
		hits.push({ file: path.basename(file), date, role, snippet });
	}
}

export default function sessionSearch(pi: ExtensionAPI) {
	pi.registerTool({
		name: "session_search",
		label: "Session Search",
		description: [
			"Search past conversation messages across sessions (current project's JSONL session store).",
			"Use for durable cross-session recall — what was discussed/tried in previous sessions.",
			"For current-session lineage use vcc_recall instead. Lexical (substring), bounded to recent ~40 sessions.",
		].join(" "),
		parameters: Type.Object({
			query: Type.String({ description: "Search query (substring, case-insensitive)" }),
			project: Type.Optional(
				Type.String({ description: "Project dir substring (default: current project)" }),
			),
			role: Type.Optional(
				Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
			),
			limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const limit = Math.min(params.limit ?? 5, 20);
			const root = sessionsRoot();
			if (!fs.existsSync(root)) {
				return { content: [{ type: "text", text: `No sessions store at ${root}.` }] };
			}

			// Resolve target session dirs.
			let dirs: string[] = [];
			if (params.project) {
				const all = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
				dirs = all.filter((d) => d.name.toLowerCase().includes(params.project!.toLowerCase())).map((d) => path.join(root, d.name));
			} else {
				const cur = path.join(root, dirForCwd(ctx.cwd));
				if (fs.existsSync(cur)) dirs = [cur];
			}
			if (dirs.length === 0) {
				return { content: [{ type: "text", text: `No session dirs matched.` }] };
			}

			const hits: Hit[] = [];
			for (const dir of dirs) {
				if (hits.length >= limit) break;
				let files: string[] = [];
				try {
					files = fs
						.readdirSync(dir)
						.filter((f) => f.endsWith(".jsonl"))
						.map((f) => path.join(dir, f))
						.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
						.slice(0, 40);
				} catch {
					continue;
				}
				for (const f of files) {
					searchFile(f, params.query, params.role, hits, limit);
					if (hits.length >= limit) break;
				}
			}

			if (hits.length === 0) {
				return { content: [{ type: "text", text: `No sessions matched "${params.query}".` }] };
			}
			const lines = hits.map(
				(h) => `## ${h.date} [${h.role}] — ${h.file}\n${h.snippet}`,
			);
			return { content: [{ type: "text", text: lines.join("\n\n---\n\n") }] };
		},
	});
}