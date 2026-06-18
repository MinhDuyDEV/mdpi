/**
 * Pi Memory Extension
 *
 * 4-tier Long-Term Memory (LTM) system inspired by opencodekit's memory plugin.
 * Captures observations, distills sessions, curates patterns, injects relevant knowledge.
 *
 * Systems:
 * 1. Capture — session events → temporal_messages
 * 2. Distillation — session.idle → compressed summaries
 * 3. Curator — pattern-matched observation creation
 * 4. LTM Injection — system.transform → relevance-scored knowledge
 *
 * Tools: observation, memory-search, memory-admin
 *
 * Note: This is a minimal implementation using JSON files. For production
 * use with thousands of observations, migrate to SQLite + FTS5.
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
	fs.writeFileSync(getMemoryFile(cwd), JSON.stringify(state, null, 2));
}

function generateId(): string {
	return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function scoreObservation(obs: Observation, query: string): number {
	const q = query.toLowerCase();
	const tokens = q.split(/\s+/).filter((t) => t.length > 2);
	if (tokens.length === 0) return 0;

	let score = 0;
	const titleLower = obs.title.toLowerCase();
	const narrativeLower = obs.narrative.toLowerCase();
	const conceptsLower = obs.concepts.map((c) => c.toLowerCase()).join(" ");

	for (const token of tokens) {
		if (titleLower.includes(token)) score += 3;
		if (narrativeLower.includes(token)) score += 1;
		if (conceptsLower.includes(token)) score += 2;
	}

	// Boost by feedback and recency
	score *= 1 + obs.feedbackScore * 0.1;
	const ageDays = (Date.now() - obs.createdAt) / (1000 * 60 * 60 * 24);
	if (ageDays < 7) score *= 1.2;

	return score;
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

			const scored = candidates
				.map((o) => ({ obs: o, score: scoreObservation(o, params.query) }))
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

		const scored = state.observations
			.filter((o) => !o.archivedAt)
			.map((o) => ({ obs: o, score: scoreObservation(o, event.prompt) }))
			.filter((s) => s.score > 2)
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
}
