/**
 * Workflows Runner Extension
 *
 * Executes DAG workflows from `.pi/workflows/*.md` using pi's subagent tool.
 * Supports sequential phases, parallel tasks, and dynamic concurrency.
 *
 * Architecture: The extension parses workflow DAG, validates args, and returns
 * an execution plan with concrete `task()` calls the LLM must execute in order.
 * Subagent dispatch is the LLM's responsibility (extensions cannot spawn subagents
 * directly in pi-coding-agent).
 *
 * Usage:
 * - Place at `.pi/extensions/workflows-runner.ts`
 * - Workflows loaded from `.pi/workflows/*.md`
 * - Invoke via `run_workflow` tool or `/workflow` command
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface WorkflowPhase {
	num: number;
	name: string;
	agent?: string;
	workflow?: string;
	concurrency: number | { rule: string };
	dependsOn: number[];
	prompt: string;
}

interface Workflow {
	name: string;
	description: string;
	args: Array<{ name: string; required: boolean; description: string }>;
	phases: WorkflowPhase[];
}

function parseWorkflow(content: string): Omit<Workflow, "name"> {
	const phases: WorkflowPhase[] = [];
	const phaseRegex = /### Phase (\d+): ([^\n]+)\n([\s\S]*?)(?=### Phase|\n## |\s*$)/g;
	let match: RegExpExecArray | null;

	while ((match = phaseRegex.exec(content)) !== null) {
		const num = parseInt(match[1], 10);
		const name = match[2].trim();
		const body = match[3];

		const agentMatch = body.match(/\*\*Agent:\*\*\s*@?(\w+)/);
		const workflowMatch = body.match(/\*\*Workflow:\*\*\s*(\S+)/);
		const concMatch = body.match(/\*\*Concurrency:\*\*\s*(\d+|Dynamic[^)]*\))/);
		const dependsMatch = body.match(/\*\*Depends on:\*\*\s*Phase\s+(\d+)/);
		const promptMatch = body.match(/\*\*Prompt:\*\*\s*\n+\s*([\s\S]*?)$/);

		let concurrency: number | { rule: string } = 1;
		if (concMatch) {
			if (concMatch[1].startsWith("Dynamic")) {
				concurrency = { rule: concMatch[1] };
			} else {
				concurrency = parseInt(concMatch[1], 10);
			}
		}

		phases.push({
			num,
			name,
			agent: agentMatch?.[1],
			workflow: workflowMatch?.[1],
			concurrency,
			dependsOn: dependsMatch ? [parseInt(dependsMatch[1], 10)] : [],
			prompt: promptMatch?.[1]?.trim() ?? "",
		});
	}

	const argsMatch = content.match(/## Args\n([\s\S]*?)(?=\n## )/);
	const args: Workflow["args"] = [];
	if (argsMatch) {
		const argRegex = /- `(\w+)` \((required|optional)\) — (.+)/g;
		let am: RegExpExecArray | null;
		while ((am = argRegex.exec(argsMatch[1])) !== null) {
			args.push({
				name: am[1],
				required: am[2] === "required",
				description: am[3],
			});
		}
	}

	const descMatch = content.match(/^# \w+\n\n([^#]+)/);
	const description = descMatch?.[1]?.trim() ?? "";

	return { description, args, phases };
}

function resolveConcurrency(
	spec: number | { rule: string },
	defaultCount: number,
): number {
	if (typeof spec === "number") return spec;
	const rule = spec.rule;
	const minMatch = rule.match(/min\s+(\d+)/);
	const maxMatch = rule.match(/max\s+(\d+)/);
	const min = minMatch ? parseInt(minMatch[1], 10) : 1;
	const max = maxMatch ? parseInt(maxMatch[1], 10) : 10;
	return Math.max(min, Math.min(max, defaultCount));
}

function loadWorkflows(workflowsDir: string): Workflow[] {
	if (!fs.existsSync(workflowsDir)) return [];
	const workflows: Workflow[] = [];
	for (const file of fs.readdirSync(workflowsDir)) {
		if (!file.endsWith(".md")) continue;
		const content = fs.readFileSync(path.join(workflowsDir, file), "utf-8");
		const name = path.basename(file, ".md");
		const parsed = parseWorkflow(content);
		workflows.push({ name, ...parsed });
	}
	return workflows;
}

/** Substitute placeholders in a prompt template. */
function substitute(
	template: string,
	args: Record<string, string>,
	phaseOutputs: Record<number, string>,
): string {
	return template
		.replace(/\{(\w+)\}/g, (_, key) => args[key] ?? `{${key}}`)
		.replace(/\{phase_(\d+)_output\}/g, (_, n) => {
			const idx = parseInt(n, 10);
			return phaseOutputs[idx] ?? `[phase ${idx} output pending]`;
		});
}

/** Build a concrete execution plan the LLM can execute step-by-step. */
function buildExecutionPlan(
	wf: Workflow,
	providedArgs: Record<string, string>,
): string {
	// Topological sort
	const sorted: WorkflowPhase[] = [];
	const visited = new Set<number>();
	const visit = (phase: WorkflowPhase) => {
		if (visited.has(phase.num)) return;
		visited.add(phase.num);
		for (const dep of phase.dependsOn) {
			const depPhase = wf.phases.find((p) => p.num === dep);
			if (depPhase) visit(depPhase);
		}
		sorted.push(phase);
	};
	for (const phase of wf.phases) visit(phase);

	const lines: string[] = [];
	lines.push(`# Workflow: \`${wf.name}\``);
	lines.push("");
	lines.push(wf.description);
	lines.push("");
	lines.push("## Execution Plan");
	lines.push("");
	lines.push("**Instructions for the assistant:** Execute each phase in order. For each phase with an `Agent` and concurrency ≥ 1, call the `task()` tool (or `subagent` tool if available) with the listed arguments. Collect outputs and substitute into subsequent phases via `{phase_N_output}`.");
	lines.push("");

	const phaseOutputs: Record<number, string> = {};

	for (const phase of sorted) {
		lines.push(`### Phase ${phase.num}: ${phase.name}`);
		lines.push("");

		if (phase.workflow) {
			lines.push(`- **Type:** Sub-workflow composition (\`${phase.workflow}\`)`);
			lines.push(`- **Action:** Invoke \`run_workflow\` tool with \`name: "${phase.workflow}\`, passing current \`{arg}\` values.`);
			lines.push(`- **Output placeholder:** \`{phase_${phase.num}_output}\``);
			lines.push("");
			continue;
		}

		if (!phase.agent) {
			lines.push(`- **Type:** Skip (no agent defined)`);
			lines.push(`- **Action:** None.`);
			lines.push("");
			continue;
		}

		const concurrency =
			typeof phase.concurrency === "number"
				? phase.concurrency
				: resolveConcurrency(phase.concurrency, 1);

		const substitutedPrompt = substitute(phase.prompt, providedArgs, phaseOutputs);

		lines.push(`- **Agent:** \`${phase.agent}\``);
		lines.push(`- **Concurrency:** ${concurrency} (${concurrency === 1 ? "sequential" : "parallel"})`);
		if (phase.dependsOn.length > 0) {
			lines.push(`- **Depends on:** Phase ${phase.dependsOn.join(", ")}`);
		}
		lines.push(`- **Output placeholder:** \`{phase_${phase.num}_output}\``);
		lines.push("");
		lines.push("**Prompt to send:**");
		lines.push("```");
		lines.push(substitutedPrompt);
		lines.push("```");
		lines.push("");
		lines.push(`**Tool call (${concurrency}× in ${concurrency === 1 ? "sequence" : "parallel"}):**`);
		if (concurrency === 1) {
			lines.push("```");
			lines.push(`task({`);
			lines.push(`  subagent_type: "${phase.agent}",`);
			lines.push(`  prompt: <the prompt above>`);
			lines.push(`})`);
			lines.push("```");
		} else {
			lines.push("```");
			lines.push(`Promise.all([`);
			for (let i = 0; i < concurrency; i++) {
				const variant = phase.prompt.includes("{variant}")
					? phase.prompt.replace(/\{variant\}/g, `variant ${i + 1}`)
					: phase.prompt;
				const subPrompt = substitute(variant, providedArgs, phaseOutputs);
				lines.push(`  task({ subagent_type: "${phase.agent}", prompt: \`${subPrompt.replace(/`/g, "\\`")}\` }),`);
			}
			lines.push(`])`);
			lines.push("```");
		}
		lines.push("");
		lines.push("---");
		lines.push("");
	}

	lines.push("## Final Synthesis");
	lines.push("");
	lines.push("After all phases complete, synthesize outputs from `{phase_N_output}` placeholders into a final report. The synthesis rules (if any) are defined in the workflow markdown under `## Final Synthesis (Main Agent)`.");

	return lines.join("\n");
}

export default function workflowsRunner(pi: ExtensionAPI) {
	const workflowsDir = path.join(process.cwd(), ".pi", "workflows");
	const workflows = loadWorkflows(workflowsDir);

	if (workflows.length === 0) return;

	pi.registerTool({
		name: "run_workflow",
		label: "Run Workflow",
		description: [
			"Execute a DAG workflow from .pi/workflows/.",
			`Available: ${workflows.map((w) => w.name).join(", ")}`,
			"Returns an execution plan with concrete task() calls for the assistant to execute.",
		].join(" "),
		parameters: Type.Object({
			name: Type.String({ description: "Workflow name" }),
			args: Type.Optional(Type.Record(Type.String(), Type.String())),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const wf = workflows.find((w) => w.name === params.name);
			if (!wf) {
				return {
					content: [
						{
							type: "text",
							text: `Unknown workflow: ${params.name}. Available: ${workflows.map((w) => w.name).join(", ")}`,
						},
					],
					isError: true,
				};
			}

			// Validate required args
			const providedArgs = (params.args ?? {}) as Record<string, string>;
			const missing = wf.args.filter((a) => a.required && !(a.name in providedArgs));
			if (missing.length > 0) {
				const missingNames = missing.map((m) => m.name).join(", ");
				return {
					content: [
						{
							type: "text",
							text: `Missing required args: ${missingNames}. Provide them as run_workflow name="${params.name}" args={${JSON.stringify(Object.fromEntries(missing.map((m) => [m.name, "<value>"])))}}.`,
						},
					],
					isError: true,
				};
			}

			const plan = buildExecutionPlan(wf, providedArgs);

			return {
				content: [{ type: "text", text: plan }],
			};
		},
	});

	pi.registerCommand("workflows", {
		description: "List available workflows",
		handler: async (_args, ctx) => {
			const items = workflows.map((w) => `${w.name} — ${w.description.slice(0, 80)}`);
			await ctx.ui.select("Available Workflows", items);
		},
	});
}
