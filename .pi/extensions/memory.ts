/**
 * Memory Extension — markdown-file long-term memory (Slice 1 MVP).
 *
 * Replaces `npm:pi-hermes-memory`. Source of truth = markdown files in
 * `.pi/memory/` (gitignored, runtime, repo-local, portable). No SQLite, no
 * native dep, no LLM subprocess.
 *
 * Files (one per `target`):
 *   USER.md     — target=user   (profile, preferences, communication style)
 *   PROJECT.md  — target=project (conventions, architecture decisions, tooling)
 *   MEMORY.md   — target=memory (general durable facts / learnings)
 *   LESSONS.md  — target=failure+category (failures/corrections/insights/
 *                 conventions/tool-quirks/preferences), grouped by `## <category>`
 *
 * Entry format (machine-readable anchor + human-readable block):
 *   <!-- mem:<id> cat:<category> ts:<createdAtMs> -->
 *   ### <title>
 *   <narrative>
 *
 * Tools (names/signatures kept compatible with the kit's existing prompt wiring):
 *   memory         — add / replace / remove an entry (markdown-backed, atomic,
 *                    secret-scanned). Hermes-compatible: action/target/content/
 *                    category/old_text/id.
 *   memory_search  — in-process TF-IDF over the markdown files. No SQLite.
 *
 * Injection: `before_agent_start` auto-injects a keyword-matched memory brief
 * (relevance to the user's prompt) + a compact `<memory-policy>` block. NOT
 * policy-only — memory surfaces automatically. (Solves "memory không hiện khi
 * cần".) Token budget ~1.5k.
 *
 * Out of scope for Slice 1 (later slices): deterministic correction detection
 * (Slice 2), consolidation + /memory-import-hermes (Slice 3), session_search +
 * skill_manage + docs rewrite (Slice 4). See .pi/artifacts/memory-markdown/spec.md.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// --- Types -----------------------------------------------------------------

interface Entry {
	id: string;
	category: string; // for LESSONS: failure/correction/insight/...; for flat files: the target
	ts: number; // createdAt ms
	title: string;
	narrative: string;
}

interface ParsedFile {
	preamble: string; // content before the first entry anchor (file title + intro)
	entries: Entry[];
}

type Target = "memory" | "user" | "project" | "failure";
type Category =
	| "failure"
	| "correction"
	| "insight"
	| "preference"
	| "convention"
	| "tool-quirk";

const CATEGORIES: Category[] = [
	"failure",
	"correction",
	"insight",
	"preference",
	"convention",
	"tool-quirk",
];

const MEMORY_DIR = ".pi/memory";

// target → { file, mode }
const TARGET_MAP: Record<Target, { file: string; mode: "flat" | "categorized" }> = {
	memory: { file: "MEMORY.md", mode: "flat" },
	user: { file: "USER.md", mode: "flat" },
	project: { file: "PROJECT.md", mode: "flat" },
	failure: { file: "LESSONS.md", mode: "categorized" },
};

const PREAMBLE: Record<string, string> = {
	"USER.md": "# User\n\nProfile, preferences, communication style. Managed by the `memory` tool.\n",
	"PROJECT.md":
		"# Project\n\nConventions, architecture decisions, tooling for this repo. Managed by the `memory` tool.\n",
	"MEMORY.md":
		"# Memory\n\nGeneral durable facts and learnings. Managed by the `memory` tool.\n",
	"LESSONS.md":
		"# Lessons\n\nFailures, corrections, insights, conventions, tool-quirks — grouped by category. Managed by the `memory` tool.\n",
};

// --- Paths & IO ------------------------------------------------------------

function memDir(cwd: string): string {
	return path.join(cwd, MEMORY_DIR);
}

function filePath(cwd: string, file: string): string {
	return path.join(memDir(cwd), file);
}

function ensureDir(cwd: string): void {
	fs.mkdirSync(memDir(cwd), { recursive: true });
}

function atomicWrite(file: string, content: string): void {
	const tmp = `${file}.tmp`;
	fs.writeFileSync(tmp, content);
	fs.renameSync(tmp, file);
}

function loadFile(cwd: string, file: string): string | null {
	const p = filePath(cwd, file);
	if (!fs.existsSync(p)) return null;
	try {
		return fs.readFileSync(p, "utf-8");
	} catch {
		return null;
	}
}

// --- Markdown parse / serialize --------------------------------------------

const ANCHOR_RE = /^<!-- mem:(\S+) cat:(\S+) ts:(\d+) -->$/;
const HEADING2_RE = /^## [^#]/; // category heading (LESSONS)
const HEADING1_RE = /^# [^#]/; // file title

/** Parse a markdown memory file into preamble + entries. */
function parse(content: string): ParsedFile {
	const lines = content.split("\n");
	const entries: Entry[] = [];
	let preambleEnd = lines.length; // index of first anchor
	let firstAnchor = -1;
	for (let i = 0; i < lines.length; i++) {
		if (ANCHOR_RE.test(lines[i])) {
			firstAnchor = i;
			break;
		}
	}
	const preamble =
		firstAnchor >= 0 ? lines.slice(0, firstAnchor).join("\n") : content;
	if (firstAnchor < 0) return { preamble, entries: [] };

	let i = firstAnchor;
	while (i < lines.length) {
		const m = lines[i].match(ANCHOR_RE);
		if (!m) {
			i++;
			continue;
		}
		const id = m[1];
		const category = m[2];
		const ts = parseInt(m[3], 10);
		const titleLine = lines[i + 1] ?? "";
		const tm = titleLine.match(/^### (.+)$/);
		const title = tm ? tm[1] : "";
		let j = i + 2;
		const nar: string[] = [];
		while (
			j < lines.length &&
			!ANCHOR_RE.test(lines[j]) &&
			!HEADING2_RE.test(lines[j]) &&
			!HEADING1_RE.test(lines[j])
		) {
			nar.push(lines[j]);
			j++;
		}
		entries.push({ id, category, ts, title, narrative: nar.join("\n").trim() });
		i = j;
	}
	return { preamble, entries };
}

/** Serialize entries back to markdown. categorized groups under `## <category>`. */
function serialize(preamble: string, entries: Entry[], mode: "flat" | "categorized"): string {
	const head = preamble.endsWith("\n") ? preamble : `${preamble}\n`;
	const out: string[] = [head];
	if (mode === "categorized") {
		for (const cat of CATEGORIES) {
			const group = entries.filter((e) => e.category === cat);
			if (group.length === 0) continue;
			out.push(`## ${cat}\n`);
			for (const e of group) out.push(block(e));
		}
		// any entries with a non-standard category go under a misc heading
		const misc = entries.filter((e) => !CATEGORIES.includes(e.category as Category));
		if (misc.length) {
			out.push("## other\n");
			for (const e of misc) out.push(block(e));
		}
	} else {
		for (const e of entries) out.push(block(e));
	}
	return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function block(e: Entry): string {
	return `<!-- mem:${e.id} cat:${e.category} ts:${e.ts} -->\n### ${e.title}\n${e.narrative}\n`;
}

function loadEntries(cwd: string, file: string): ParsedFile {
	const raw = loadFile(cwd, file);
	if (raw === null) return { preamble: PREAMBLE[file] ?? "", entries: [] };
	const parsed = parse(raw);
	// backfill preamble if the file exists but has none (e.g. hand-created)
	if (!parsed.preamble.trim()) parsed.preamble = PREAMBLE[file] ?? "";
	return parsed;
}

function saveEntries(cwd: string, file: string, mode: "flat" | "categorized", preamble: string, entries: Entry[]): void {
	ensureDir(cwd);
	atomicWrite(filePath(cwd, file), serialize(preamble, entries, mode));
}

function allFiles(): string[] {
	return ["USER.md", "PROJECT.md", "MEMORY.md", "LESSONS.md"];
}

/** Load all entries across all files (for search + injection). */
function loadAllEntries(cwd: string): Entry[] {
	const out: Entry[] = [];
	for (const f of allFiles()) {
		const { entries } = loadEntries(cwd, f);
		out.push(...entries);
	}
	return out;
}

// --- TF-IDF (lexical; no synonymy) — revived from in-house pi-memory v2 ----

function tokenize(s: string): string[] {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2);
}

function buildIdf(entries: Entry[]): Map<string, number> {
	const N = entries.length || 1;
	const df = new Map<string, number>();
	for (const e of entries) {
		const tokens = new Set(tokenize(`${e.title} ${e.narrative}`));
		for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1);
	}
	const idf = new Map<string, number>();
	for (const [t, d] of df) idf.set(t, Math.log(1 + N / d));
	return idf;
}

function scoreEntry(e: Entry, query: string, idf: Map<string, number>): number {
	const qTokens = tokenize(query);
	if (qTokens.length === 0) return 0;
	const doc = `${e.title} ${e.narrative}`;
	const docTokens = tokenize(doc);
	const docLen = docTokens.length || 1;
	const tf = new Map<string, number>();
	for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);
	const titleTokens = new Set(tokenize(e.title));
	let score = 0;
	for (const q of qTokens) {
		const f = tf.get(q) ?? 0;
		if (f === 0) continue;
		const w = (f / docLen) * (idf.get(q) ?? 0);
		score += titleTokens.has(q) ? w * 2 : w;
	}
	return score;
}

// --- Secret scanning (ported P0 from hermes; zero-dep) ---------------------

const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
	{ name: "PEM private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
	{ name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
	{ name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
	{ name: "GitHub PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
	{ name: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
	{ name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
	{ name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
	{ name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

function scanSecrets(text: string): string | null {
	for (const p of SECRET_PATTERNS) {
		if (p.re.test(text)) return p.name;
	}
	return null;
}

// --- Helpers ---------------------------------------------------------------

function genId(): string {
	return `mem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function findEntry(entries: Entry[], id: string | undefined, oldText: string | undefined): Entry | undefined {
	if (id) return entries.find((e) => e.id === id);
	if (oldText) {
		const needle = oldText.toLowerCase();
		return entries.find((e) =>
			`${e.title} ${e.narrative}`.toLowerCase().includes(needle),
		);
	}
	return undefined;
}

function agentRoot(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");
}

const FILE_MODE: Record<string, "flat" | "categorized"> = {
	"USER.md": "flat",
	"PROJECT.md": "flat",
	"MEMORY.md": "flat",
	"LESSONS.md": "categorized",
};

/** Append an entry to a target file (shared by the `memory` tool, correction detection, import). */
function appendEntry(
	cwd: string,
	target: Target,
	category: string,
	title: string,
	narrative: string,
): { ok: true; id: string; file: string } | { ok: false; error: string } {
	const { file, mode } = TARGET_MAP[target];
	if (scanSecrets(`${title}\n${narrative}`)) return { ok: false, error: "secret" };
	const { preamble, entries } = loadEntries(cwd, file);
	const id = genId();
	entries.push({
		id,
		category,
		ts: Date.now(),
		title: title.slice(0, 200).replace(/\n/g, " ").trim() || "(untitled)",
		narrative: narrative.trim(),
	});
	saveEntries(cwd, file, mode, preamble, entries);
	return { ok: true, id, file };
}

function extractUserText(message: { content?: unknown }): string {
	const c = message.content;
	if (typeof c === "string") return c;
	if (!Array.isArray(c)) return "";
	const parts: string[] = [];
	for (const p of c as Array<{ type?: string; text?: string }>) {
		if (p && p.type === "text" && typeof p.text === "string") parts.push(p.text);
	}
	return parts.join("\n");
}

// --- Deterministic correction detection (0 LLM) ----------------------------
const CORRECTION_STRONG = [
	/\bdon'?t do that\b/i,
	/\bnot like that\b/i,
	/\bi (said|told you)\b/i,
	/\bthat'?s not what i\b/i,
	/\bno,?\s*don'?t\b/i,
	/\bstop (doing|using|that)\b/i,
	/đừng (làm|dùng|chạy|cài|thêm|có|xóa|sửa)\b/i,
	/không phải (vậy|thế|như (vậy|thế))\b/i,
	/\bsai (rồi|nhé)\b/i,
	/\btôi (đã )?(nói|bảo)\b/i,
	/không,?\s*đừng\b/i,
];
const CORRECTION_WEAK = /^\s*(no|wrong|actually)\b[,.]?\s+\b(use|change|fix|switch|prefer|should|instead|don'?t|do not)\b/i;
const CORRECTION_NEGATIVE = [
	/\bno worries\b/i,
	/\bno problem\b/i,
	/\blooks (great|good|fine|right)\b/i,
	/\bthat'?s (right|fine|good|perfect|correct)\b/i,
	/\bit'?s (good|fine|correct|right)\b/i,
	/(đúng rồi|tốt rồi|ok rồi|tốt lắm|được rồi)/,
];
let userTurnCount = 0;
let lastCorrectionTurn = -999;

function isCorrection(text: string): boolean {
	if (CORRECTION_NEGATIVE.some((re) => re.test(text))) return false;
	if (CORRECTION_STRONG.some((re) => re.test(text))) return true;
	if (CORRECTION_WEAK.test(text)) return true;
	return false;
}

// --- Extension -------------------------------------------------------------

export default function memoryExtension(pi: ExtensionAPI) {
	// `memory` — add / replace / remove a markdown entry (hermes-compatible shape).
	pi.registerTool({
		name: "memory",
		label: "Memory",
		description: [
			"Save, update, or delete a durable memory entry in .pi/memory/*.md (markdown, repo-local).",
			"Use proactively: when the user corrects you, shares a preference, or you discover a durable fact, convention, or failure worth reusing across sessions.",
			"action=add|replace|remove; target=memory|user|project|failure; for target=failure pass category=failure|correction|insight|preference|convention|tool-quirk.",
			"Secrets are scanned and blocked. Do not save task progress or temporary state.",
		].join(" "),
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("add"),
				Type.Literal("replace"),
				Type.Literal("remove"),
			]),
			target: Type.Union([
				Type.Literal("memory"),
				Type.Literal("user"),
				Type.Literal("project"),
				Type.Literal("failure"),
			]),
			content: Type.Optional(
				Type.String({ description: "Entry narrative (required for add/replace)" }),
			),
			title: Type.Optional(Type.String({ description: "Short title (default: first 80 chars of content)" })),
			category: Type.Optional(
				Type.String({
					description: "Required for target=failure: failure|correction|insight|preference|convention|tool-quirk",
				}),
			),
			id: Type.Optional(Type.String({ description: "Entry id for replace/remove" })),
			old_text: Type.Optional(
				Type.String({ description: "Substring identifying the entry to replace/remove (alternative to id)" }),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const target = params.target as Target;
			const { file, mode } = TARGET_MAP[target];
			const { preamble, entries } = loadEntries(cwd, file);

			// --- remove ---
			if (params.action === "remove") {
				const target_entry = findEntry(entries, params.id, params.old_text);
				if (!target_entry) {
					return {
						content: [{ type: "text", text: `No matching entry to remove in ${file}.` }],
						isError: true,
					};
				}
				const next = entries.filter((e) => e.id !== target_entry.id);
				saveEntries(cwd, file, mode, preamble, next);
				return {
					content: [{ type: "text", text: `Removed ${target_entry.id} from ${file}.` }],
				};
			}

			// --- add / replace both need content ---
			if (!params.content || params.content.trim().length === 0) {
				return {
					content: [{ type: "text", text: "content is required for add/replace." }],
					isError: true,
				};
			}

			// secret scan
			const scanText = `${params.title ?? ""}\n${params.content}`;
			const secret = scanSecrets(scanText);
			if (secret) {
				return {
					content: [
						{
							type: "text",
							text: `Blocked: detected likely secret (${secret}). Memory not saved. Remove the secret first.`,
						},
					],
					isError: true,
				};
			}

			const category: string =
				target === "failure" ? (params.category ?? "failure") : target;

			// --- replace ---
			if (params.action === "replace") {
				const existing = findEntry(entries, params.id, params.old_text);
				if (!existing) {
					return {
						content: [{ type: "text", text: `No matching entry to replace in ${file}.` }],
						isError: true,
					};
				}
				existing.title = (params.title ?? params.content.slice(0, 80)).trim() || existing.title;
				existing.narrative = params.content.trim();
				if (target === "failure" && params.category) existing.category = params.category;
				saveEntries(cwd, file, mode, preamble, entries);
				return {
					content: [{ type: "text", text: `Updated ${existing.id} in ${file}.` }],
				};
			}

			// --- add ---
			const title = (params.title ?? params.content.slice(0, 80)).trim() || "(untitled)";
			const entry: Entry = {
				id: genId(),
				category,
				ts: Date.now(),
				title,
				narrative: params.content.trim(),
			};
			entries.push(entry);
			saveEntries(cwd, file, mode, preamble, entries);
			return {
				content: [
					{
						type: "text",
						text: `Saved ${entry.id} to ${file} (${category}).`,
					},
				],
			};
		},
	});

	// `memory_search` — in-process TF-IDF over the markdown files. No SQLite.
	pi.registerTool({
		name: "memory_search",
		label: "Memory Search",
		description: [
			"Search durable memory across sessions (.pi/memory/*.md) by keyword relevance.",
			"Use when you need durable, cross-session knowledge — past failures, project conventions, user preferences, tool quirks.",
			"For current-session lineage use vcc_recall instead.",
		].join(" "),
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			target: Type.Optional(
				Type.Union([
					Type.Literal("memory"),
					Type.Literal("user"),
					Type.Literal("project"),
					Type.Literal("failure"),
				]),
			),
			category: Type.Optional(Type.String({ description: "Filter by category (target=failure)" })),
			limit: Type.Optional(Type.Number({ description: "Max results (default 5)" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			let entries: Entry[];
			if (params.target) {
				entries = loadEntries(cwd, TARGET_MAP[params.target as Target].file).entries;
			} else {
				entries = loadAllEntries(cwd);
			}
			if (params.category) {
				entries = entries.filter((e) => e.category === params.category);
			}
			if (entries.length === 0) {
				return {
					content: [{ type: "text", text: `No memories found for "${params.query}".` }],
				};
			}
			const idf = buildIdf(entries);
			const scored = entries
				.map((e) => ({ e, s: scoreEntry(e, params.query, idf) }))
				.filter((x) => x.s > 0)
				.sort((a, b) => b.s - a.s)
				.slice(0, params.limit ?? 5);
			if (scored.length === 0) {
				return {
					content: [{ type: "text", text: `No memories match "${params.query}".` }],
				};
			}
			const lines = scored.map(
				(x) =>
					`## ${x.e.id} [${x.e.category}] (score ${x.s.toFixed(2)})\n**${x.e.title}**\n\n${x.e.narrative}`,
			);
			return { content: [{ type: "text", text: lines.join("\n\n---\n\n") }] };
		},
	});

	// Auto-inject a keyword-matched memory brief + compact policy at session start.
	// NOT policy-only: relevant memory surfaces automatically. (Solves
	// "memory không hiện khi cần".) Budget ~1.5k chars.
	pi.on("before_agent_start", async (event, ctx) => {
		const all = loadAllEntries(ctx.cwd);
		const policy =
			`<memory-policy>\n` +
			`Durable cross-session memory lives in .pi/memory/*.md (markdown, repo-local). ` +
			`Use memory_search for past failures, conventions, preferences, tool-quirks; ` +
			`save durable facts with the memory tool (action add/replace/remove, target memory|user|project|failure + category). ` +
			`Do not save task progress or temporary state. Secrets are blocked. ` +
			`For current-session lineage use vcc_recall.\n` +
			`</memory-policy>`;

		let brief = "";
		if (event.prompt && event.prompt.length >= 10 && all.length > 0) {
			const idf = buildIdf(all);
			const scored = all
				.map((e) => ({ e, s: scoreEntry(e, event.prompt!, idf) }))
				.filter((x) => x.s > 0)
				.sort((a, b) => b.s - a.s);
			const picked: string[] = [];
			let chars = 0;
			for (const x of scored) {
				const line = `- **[${x.e.category}] ${x.e.title}**: ${x.e.narrative.slice(0, 160)}`;
				if (chars + line.length > 1400) break;
				picked.push(line);
				chars += line.length;
				if (picked.length >= 6) break;
			}
			if (picked.length > 0) {
				brief = `\n\n## Memory Brief (auto-injected from .pi/memory/)\n\n${picked.join("\n")}\n\nUse memory_search for deeper context.`;
			}
		}

		return {
			systemPrompt: event.systemPrompt + `\n\n${policy}` + brief,
		};
	});

	// Deterministic correction detection (0 LLM). On user message_end, regex
	// strong/weak patterns → auto-save a `correction` entry. Rate-limited 1 save
	// per 3 user turns. Disable: env PI_MEMORY_NO_CORRECTION=1.
	pi.on("message_end", async (event, ctx) => {
		if (process.env.PI_MEMORY_NO_CORRECTION === "1") return;
		const m = event.message as { role?: string; content?: unknown } | undefined;
		if (!m || m.role !== "user") return;
		userTurnCount++;
		const text = extractUserText(m);
		if (!text || text.trim().length < 5) return;
		if (!isCorrection(text)) return;
		if (userTurnCount - lastCorrectionTurn < 3) return; // rate limit
		lastCorrectionTurn = userTurnCount;
		const cwd = (ctx && (ctx as { cwd?: string }).cwd) || process.cwd();
		const title = `[correction] ${text.slice(0, 80).replace(/\n/g, " ")}`;
		appendEntry(cwd, "failure", "correction", title, text.slice(0, 600));
	});

	// /memory-insights — list all entries grouped by file.
	pi.registerCommand("memory-insights", {
		description: "List all memory entries grouped by file (.pi/memory/*.md)",
		handler: async (_args, ctx) => {
			const lines: string[] = [];
			let total = 0;
			let files = 0;
			for (const f of allFiles()) {
				const { entries } = loadEntries(ctx.cwd, f);
				if (!entries.length) continue;
				files++;
				lines.push(`◆ ${f} (${entries.length})`);
				for (const e of entries) lines.push(`  [${e.category}] ${e.title}`);
				total += entries.length;
			}
			ctx.ui.notify(
				total ? `${total} entries in ${files} file(s)\n${lines.join("\n")}` : "No memory entries yet.",
				total ? "info" : "warning",
			);
		},
	});

	// /memory-consolidate — dedupe exact-duplicate entries + cap per file (archive oldest beyond 60).
	pi.registerCommand("memory-consolidate", {
		description: "Dedupe duplicate memory entries + cap per file (archive oldest beyond 60)",
		handler: async (_args, ctx) => {
			const report: string[] = [];
			for (const f of allFiles()) {
				const mode = FILE_MODE[f];
				const { preamble, entries } = loadEntries(ctx.cwd, f);
				if (!entries.length) continue;
				const seen = new Set<string>();
				const kept: Entry[] = [];
				let dupes = 0;
				for (const e of entries) {
					const key = `${e.title.trim().toLowerCase()}|${e.narrative.trim().toLowerCase()}`;
					if (seen.has(key)) {
						dupes++;
						continue;
					}
					seen.add(key);
					kept.push(e);
				}
				let archived = 0;
				const CAP = 60;
				let finalKept = kept;
				if (kept.length > CAP) {
					const byAge = [...kept].sort((a, b) => a.ts - b.ts);
					const archiveIds = new Set(byAge.slice(0, kept.length - CAP).map((e) => e.id));
					const toArchive = kept.filter((e) => archiveIds.has(e.id));
					finalKept = kept.filter((e) => !archiveIds.has(e.id));
					if (toArchive.length) {
						const archiveDir = path.join(memDir(ctx.cwd), "archive");
						fs.mkdirSync(archiveDir, { recursive: true });
						const stamp = new Date().toISOString().replace(/[:.]/g, "-");
						fs.writeFileSync(
							path.join(archiveDir, `${f}.${stamp}.md`),
							serialize(`# Archived from ${f} (consolidation ${stamp})\n`, toArchive, mode),
						);
						archived = toArchive.length;
					}
				}
				if (dupes > 0 || archived > 0) saveEntries(ctx.cwd, f, mode, preamble, finalKept);
				report.push(`${f}: ${entries.length} → ${finalKept.length} (−${dupes} dup, −${archived} archived)`);
			}
			ctx.ui.notify(`Consolidation:\n${report.join("\n")}`, "info");
		},
	});

	// /memory-import-hermes — migrate hermes markdown memory into .pi/memory/. Titles prefixed [hermes].
	pi.registerCommand("memory-import-hermes", {
		description: "Import hermes markdown (~/.pi/agent/pi-hermes-memory/{USER,MEMORY,failures}.md) into .pi/memory/. Titles prefixed [hermes].",
		handler: async (_args, ctx) => {
			const root = path.join(agentRoot(), "pi-hermes-memory");
			const sources: Array<{ file: string; target: Target; category: string }> = [
				{ file: "USER.md", target: "user", category: "user" },
				{ file: "MEMORY.md", target: "memory", category: "memory" },
				{ file: "failures.md", target: "failure", category: "failure" },
			];
			const report: string[] = [];
			for (const src of sources) {
				const p = path.join(root, src.file);
				if (!fs.existsSync(p)) {
					report.push(`${src.file}: not found, skipped`);
					continue;
				}
				const raw = fs.readFileSync(p, "utf-8");
				const blocks = raw
					.split(/^\s*§\s*$/m)
					.map((b) => b.replace(/<!--[^>]*-->/g, "").trim())
					.filter(Boolean);
				const existing = loadEntries(ctx.cwd, TARGET_MAP[src.target].file).entries;
				const seenTitles = new Set(existing.map((e) => e.title.toLowerCase()));
				let imported = 0;
				let dup = 0;
				let blocked = 0;
				for (let body of blocks) {
					let category = src.category;
					if (src.target === "failure") {
						const tm = body.match(/^\[(failure|correction|insight|preference|convention|tool-quirk)\]/i);
						if (tm) category = tm[1].toLowerCase();
						body = body.replace(/^(\[(failure|correction|insight|preference|convention|tool-quirk)\]\s*)+/i, "").trim();
					}
					if (!body) continue;
					const title = `[hermes] ${body.split("\n")[0].slice(0, 80)}`;
					if (seenTitles.has(title.toLowerCase())) {
						dup++;
						continue;
					}
					const r = appendEntry(ctx.cwd, src.target, category, title, body);
					if (r.ok) {
						imported++;
						seenTitles.add(title.toLowerCase());
					} else blocked++;
				}
				report.push(`${src.file}: imported ${imported}, skipped ${dup} dup, blocked ${blocked}`);
			}
			ctx.ui.notify(
				`Hermes import:\n${report.join("\n")}\n\nNOTE: entries prefixed [hermes]; some are hermes-specific quirks now stale — review & prune via the memory tool.`,
				"info",
			);
		},
	});
}