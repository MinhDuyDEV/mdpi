/**
 * Templates Injector Extension
 *
 * Auto-injects project context templates (.pi/templates/*.md) into system prompt.
 * Mimics opencodekit's `instructions[]` mechanism via pi's before_agent_start hook.
 *
 * Templates auto-injected:
 * - project.md (always, if exists)
 * - tech-stack.md (always, if exists)
 * - state.md (always, if exists)
 *
 * User can opt-in to inject more via /inject-template command.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ALWAYS_INJECT = ["project.md", "tech-stack.md", "state.md"];

function readTemplate(cwd: string, name: string): string | null {
	const filePath = path.join(cwd, ".pi", "templates", name);
	if (!fs.existsSync(filePath)) return null;
	const content = fs.readFileSync(filePath, "utf-8");
	// Strip frontmatter for injection
	const fmMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
	return (fmMatch ? fmMatch[1] : content).trim();
}

export default function templatesInjector(pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, ctx) => {
		const injected: string[] = [];

		for (const name of ALWAYS_INJECT) {
			const content = readTemplate(ctx.cwd, name);
			if (content && content.length > 0) {
				injected.push(`### ${name}\n\n${content}`);
			}
		}

		if (injected.length === 0) return;

		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n## Project Context (auto-injected from .pi/templates/)\n\n${injected.join("\n\n---\n\n")}`,
		};
	});

	pi.registerCommand("inject-template", {
		description: "Inject a template into current context",
		handler: async (args, ctx) => {
			const name = args.trim() || (await ctx.ui.select("Choose template", fs.readdirSync(path.join(ctx.cwd, ".pi", "templates")).filter((f) => f.endsWith(".md"))));
			if (!name) return;

			const content = readTemplate(ctx.cwd, name);
			if (!content) {
				ctx.ui.notify(`Template not found: ${name}`, "warning");
				return;
			}

			// Inject via sendUserMessage as a context message
			pi.sendUserMessage(`[Template: ${name}]\n\n${content}`, { deliverAs: "followUp" });
			ctx.ui.notify(`Injected template: ${name}`, "info");
		},
	});
}
