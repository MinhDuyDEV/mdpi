/**
 * Pi Memory Extension — Long-Term Memory (LTM) for observations.
 *
 * Memory-type model (after Addy Osmani, "Lesson 5: memory and context"):
 *   short-term   — current session context window (pi-vcc compaction)
 *   episodic     — on-disk session anchor, survives across sessions
 *                  (pi-session-summary → .pi/state/session-summary.*)
 *   long-term    — this extension: observations persisted across sessions
 *                  (.pi/memory/observations.json), retrieved on demand
 *   procedural   — Agent Skills (.pi/skills/*) — separate system
 *   declarative  — templates/context + semantic_* and websearch (RAG) — separate
 *
 * What this extension actually implements (the long-term layer):
 *   1. Capture      — manual via the `observation` tool.
 *   2. Promoter     — distills session decisions into LTM observations at
 *                     session_shutdown / session_compact (source:"auto-distill"),
 *                     guarded by a lastPromotedDecisionTs watermark. This is the
 *                     "memory-update layer" (extract durable knowledge after a session).
 *   3. Retrieval    — `memory_search` with TF-IDF scoring (lexical; no synonymy).
 *   4. Injection    — `before_agent_start` injects the top relevant observations,
 *                     skipping auto-distilled decisions already in the session summary.
 *
 * Tools: observation, memory_search, memory_admin.
 *
 * Retrieval is lexical (TF-IDF). Semantic synonymy ("deploy" ≈ "ship to production")
 * needs embeddings and is deferred. FTS5/SQLite storage is deferred until the
 * observation count grows and substring search is measured failing.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface Observation {
	id: string;
	type: "decision" | "bugfix" | "feature" | "discovery" | "warning" | "learning";
	title: string;
	narrative: string;
	concepts: string[];
	confidence: "high" | "medium" | "low";
	feedbackScore: number;
	retrievalCount: number;
	source: "manual" | "auto-curator" | "auto-distill";
	sessionId?: string;
	createdAt: number;
	updatedAt: number;
	archivedAt?: number;
}

interface MemoryState {
	observations: Observation[];
	// Watermark: highest decision ts already promoted to LTM. Prevents re-promoting
	// decisions from a session-summary that persists across sessions.
	lastPromotedDecisionTs?: number;
}

const MEMORY_DIR = ".pi/memory";
const MEMORY_FILE = "observations.json";

function getMemoryDir(cwd: string): string {
	return path.join(cwd, MEMORY_DIR);
}

function getMemoryFile(cwd: string): string {
	return path.join(getMemoryDir(cwd), MEMORY_FILE);
}

function loadMemory(cwd: string): MemoryState {
	const file = getMemoryFile(cwd);
	if (!fs.existsSync(file)) {
		return { observations: [] };
	}
	try {
		return JSON.parse(fs.readFileSync(file, "utf-8"));
	} catch {
		return { observations: [] };
	}
}

function saveMemory(cwd: string, state: MemoryState): void {
	const dir = getMemoryDir(cwd);
	fs.mkdirSync(dir, { recursive: true });
	// Atomic write: temp file + rename to avoid half-written JSON on interrupt.
	const finalPath = getMemoryFile(cwd);
	const tmpPath = `${finalPath}.tmp`;
	fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
	fs.renameSync(tmpPath, finalPath);
}

function generateId(): string {
	return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function tokenize(s: string): string[] {
	return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
}

function buildIdf(obsList: Observation[]): Map<string, number> {
	const N = obsList.length || 1;
	const df = new Map<string, number>();
	for (const o of obsList) {
		const tokens = new Set(tokenize(`${o.title} ${o.narrative} ${o.concepts.join(" ")}`));
		for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1);
	}
	const idf = new Map<string, number>();
	for (const [t, d] of df) idf.set(t, Math.log(1 + N / d));
	return idf;
}

function scoreObservation(obs: Observation, query: string, idf: Map<string, number>): number {
	const qTokens = tokenize(query);
	if (qTokens.length === 0) return 0;
	const docTokens = tokenize(`${obs.title} ${obs.narrative} ${obs.concepts.join(" ")}`);
	const docLen = docTokens.length || 1;
	const tf = new Map<string, number>();
	for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);
	const titleTokens = new Set(tokenize(obs.title));
	let score = 0;
	for (const q of qTokens) {
		const f = tf.get(q) ?? 0;
		if (f === 0) continue;
		const w = (f / docLen) * (idf.get(q) ?? 0);
		score += titleTokens.has(q) ? w * 2 : w;
	}
	// Boost by feedback and recency
	score *= 1 + obs.feedbackScore * 0.1;
	const ageDays = (Date.now() - obs.createdAt) / (1000 * 60 * 60 * 24);
	if (ageDays < 7) score *= 1.2;
	return score;
}

function getSessionSummaryDecisions(cwd: string): Array<{ ts: number; text: string }> {
	const file = path.join(cwd, ".pi", "state", "session-summary.json");
	if (!fs.existsSync(file)) return [];
	try {
		const j = JSON.parse(fs.readFileSync(file, "utf-8"));
		return Array.isArray(j.decisions) ? j.decisions : [];
	} catch {
		return [];
	}
}

function promoteDecisions(cwd: string): number {
	const state = loadMemory(cwd);
	const decisions = getSessionSummaryDecisions(cwd);
	const watermark = state.lastPromotedDecisionTs ?? 0;
	const toPromote = decisions.filter((d) => d && typeof d.ts === "number" && d.ts > watermark);
	if (toPromote.length === 0) return 0;
	for (const d of toPromote) {
		const text = String(d.text ?? "");
		state.observations.push({
			id: generateId(),
			type: "decision",
			title: text.slice(0, 80) || "(decision)",
			narrative: text,
			concepts: [],
			confidence: "low",
			feedbackScore: 0,
			retrievalCount: 0,
			source: "auto-distill",
			createdAt: d.ts,
			updatedAt: Date.now(),
		});
	}
	state.lastPromotedDecisionTs = Math.max(...toPromote.map((d) => d.ts));
	saveMemory(cwd, state);
	return toPromote.length;
}

export default function piMemory(pi: ExtensionAPI) {
	pi.registerTool({
		name: "observation",
		label: "Observation",
		description: [
			"Create a long-term observation OR give feedback on an existing one.",
			"Use this to persist important decisions, learnings, or patterns across sessions.",
		].join(" "),
		parameters: Type.Object({
			id: Type.Optional(Type.String({ description: "Existing observation ID for feedback" })),
			type: Type.Optional(
				Type.Union([
					Type.Literal("decision"),
					Type.Literal("bugfix"),
					Type.Literal("feature"),
					Type.Literal("discovery"),
					Type.Literal("warning"),
					Type.Literal("learning"),
				]),
			),
			title: Type.Optional(Type.String({ description: "Title (required for new observations)" })),
			narrative: Type.Optional(Type.String({ description: "Detailed narrative (required for new)" })),
			concepts: Type.Optional(Type.String({ description: "Comma-separated tags" })),
			confidence: Type.Optional(
				Type.Union([Type.Literal("high"), Type.Literal("medium"), Type.Literal("low")]),
			),
			feedback: Type.Optional(
				Type.Union([Type.Literal("helpful"), Type.Literal("unhelpful")]),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const state = loadMemory(cwd);

			// Feedback mode
			if (params.id && params.feedback) {
				const obs = state.observations.find((o) => o.id === params.id);
				if (!obs) {
					return {
						content: [{ type: "text", text: `Observation not found: ${params.id}` }],
						isError: true,
					};
				}
				obs.feedbackScore += params.feedback === "helpful" ? 1 : -1;
				obs.updatedAt = Date.now();
				saveMemory(cwd, state);
				return {
					content: [
						{
							type: "text",
							text: `Feedback recorded: ${params.feedback} for ${params.id}. New score: ${obs.feedbackScore}`,
						},
					],
				};
			}

			// Create mode
			if (!params.title || !params.narrative) {
				return {
					content: [{ type: "text", text: "title and narrative are required for new observations" }],
					isError: true,
				};
			}

			const obs: Observation = {
				id: params.id ?? generateId(),
				type: params.type ?? "discovery",
				title: params.title,
				narrative: params.narrative,
				concepts: (params.concepts ?? "").split(",").map((c) => c.trim()).filter(Boolean),
				confidence: params.confidence ?? "medium",
				feedbackScore: 0,
				retrievalCount: 0,
				source: "manual",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			state.observations.push(obs);
			saveMemory(cwd, state);
			return {
				content: [
					{
						type: "text",
						text: `Observation created: ${obs.id}\nType: ${obs.type}\nTitle: ${obs.title}`,
					},
				],
			};
		},
	});

	pi.registerTool({
		name: "memory_search",
		label: "Memory Search",
		description: "Search long-term memory observations by relevance.",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			limit: Type.Optional(Type.Number({ description: "Max results (default: 5)" })),
			type: Type.Optional(Type.String({ description: "Filter by type" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const state = loadMemory(cwd);
			let candidates = state.observations.filter((o) => !o.archivedAt);

			if (params.type) {
				candidates = candidates.filter((o) => o.type === params.type);
			}

			const idf = buildIdf(state.observations.filter((o) => !o.archivedAt));
			const scored = candidates
				.map((o) => ({ obs: o, score: scoreObservation(o, params.query, idf) }))
				.filter((s) => s.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, params.limit ?? 5);

			// Update retrieval counts
			for (const s of scored) {
				s.obs.retrievalCount++;
				s.obs.updatedAt = Date.now();
			}
			saveMemory(cwd, state);

			if (scored.length === 0) {
				return {
					content: [
						{ type: "text", text: `No observations found matching "${params.query}".` },
					],
				};
			}

			const lines = scored.map(
				(s) =>
					`## ${s.obs.id} [${s.obs.type}] (score: ${s.score.toFixed(1)})\n` +
					`**${s.obs.title}**\n` +
					`Confidence: ${s.obs.confidence} | Retrieved: ${s.obs.retrievalCount}x | Feedback: ${s.obs.feedbackScore}\n\n` +
					`${s.obs.narrative}\n` +
					(s.obs.concepts.length ? `\nConcepts: ${s.obs.concepts.join(", ")}` : ""),
			);

			return {
				content: [{ type: "text", text: lines.join("\n\n---\n\n") }],
			};
		},
	});

	pi.registerTool({
		name: "memory_admin",
		label: "Memory Admin",
		description: "Admin operations: list, archive, restore, stats.",
		parameters: Type.Object({
			operation: Type.Union([
				Type.Literal("list"),
				Type.Literal("archive"),
				Type.Literal("restore"),
				Type.Literal("stats"),
			]),
			id: Type.Optional(Type.String()),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const state = loadMemory(cwd);

			switch (params.operation) {
				case "list": {
					const items = state.observations
						.filter((o) => !o.archivedAt)
						.map(
							(o) =>
								`${o.id} [${o.type}] ${o.title} (feedback:${o.feedbackScore}, retrieved:${o.retrievalCount})`,
						);
					return {
						content: [
							{
								type: "text",
								text: items.length > 0 ? items.join("\n") : "No observations.",
							},
						],
					};
				}
				case "stats": {
					const total = state.observations.length;
					const active = state.observations.filter((o) => !o.archivedAt).length;
					const byType: Record<string, number> = {};
					for (const o of state.observations) {
						byType[o.type] = (byType[o.type] ?? 0) + 1;
					}
					return {
						content: [
							{
								type: "text",
								text: `Total: ${total} | Active: ${active} | Archived: ${total - active}\n\nBy type:\n${Object.entries(
									byType,
								)
									.map(([k, v]) => `  ${k}: ${v}`)
									.join("\n")}`,
							},
						],
					};
				}
				case "archive": {
					if (!params.id) {
						return {
							content: [{ type: "text", text: "id required for archive" }],
							isError: true,
						};
					}
					const obs = state.observations.find((o) => o.id === params.id);
					if (!obs) {
						return {
							content: [{ type: "text", text: `Not found: ${params.id}` }],
							isError: true,
						};
					}
					obs.archivedAt = Date.now();
					saveMemory(cwd, state);
					return {
						content: [{ type: "text", text: `Archived: ${params.id}` }],
					};
				}
				case "restore": {
					if (!params.id) {
						return {
							content: [{ type: "text", text: "id required for restore" }],
							isError: true,
						};
					}
					const obs = state.observations.find((o) => o.id === params.id);
					if (!obs) {
						return {
							content: [{ type: "text", text: `Not found: ${params.id}` }],
							isError: true,
						};
					}
					delete obs.archivedAt;
					saveMemory(cwd, state);
					return {
						content: [{ type: "text", text: `Restored: ${params.id}` }],
					};
				}
			}
		},
	});

	// Auto-inject relevant observations into system prompt
	pi.on("before_agent_start", async (event, ctx) => {
		if (!event.prompt || event.prompt.length < 10) return;
		const state = loadMemory(ctx.cwd);
		if (state.observations.length === 0) return;

		// Injection dedup: skip auto-distilled decisions already present in the
		// current session summary (injected there as summary text) to avoid
		// surfacing the same decision twice.
		const summaryTitles = new Set(
			getSessionSummaryDecisions(ctx.cwd).map((d) => String(d.text ?? "").slice(0, 80)),
		);
		const idf = buildIdf(state.observations.filter((o) => !o.archivedAt));

		const scored = state.observations
			.filter((o) => !o.archivedAt)
			.filter((o) => !(o.source === "auto-distill" && summaryTitles.has(o.title)))
			.map((o) => ({ obs: o, score: scoreObservation(o, event.prompt, idf) }))
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 3);

		if (scored.length === 0) return;

		const relevant = scored
			.map(
				(s) =>
					`- **${s.obs.title}** [${s.obs.type}]: ${s.obs.narrative.slice(0, 200)}${s.obs.narrative.length > 200 ? "..." : ""}`,
			)
			.join("\n");

		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n## Relevant Past Observations\n\nThe following long-term observations may be relevant to this task:\n\n${relevant}\n\nUse memory_search tool for deeper context.`,
		};
	});

	// Memory-update layer: distill session decisions into LTM.
	// Fires at session_shutdown (runtime teardown: quit/reload/new/resume/fork) and
	// session_compact (mid-session, crash-safety). The state.lastPromotedDecisionTs
	// watermark prevents re-promoting decisions from a session-summary that persists
	// across sessions. NOTE: session_end/session_idle are not in the ExtensionAPI
	// event surface — session_shutdown + session_compact are the real hooks.
	pi.on("session_shutdown", (_event, ctx) => {
		promoteDecisions(ctx.cwd);
	});
	pi.on("session_compact", (_event, ctx) => {
		promoteDecisions(ctx.cwd);
	});
}
