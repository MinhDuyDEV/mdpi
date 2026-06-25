/**
 * Skill Manage Extension — procedural-skill CRUD (replaces hermes `skill_manage`).
 *
 * Writes SKILL.md files (frontmatter + sections) and registers nothing at load
 * time beyond the tool. Zero native dep, no LLM subprocess.
 *
 * Scope → location:
 *   project → .pi/skills/<name>/SKILL.md        (repo, committed, ships with kit)
 *   global  → ~/.pi/agent/skills/<name>/SKILL.md (user-home, cross-project)
 *
 * NOTE: project-scope skills land in the shipped .pi/skills/ tree (portable +
 * loadable, since `settings.json: skills` points there). They will be committed
 * with the kit unless gitignored. Curate/prune as needed.
 *
 * Actions (hermes-compatible): create | view | patch | update | edit | delete.
 * Structured fields (when_to_use / procedure_steps / pitfalls / verification_steps)
 * render into SKILL.md sections; `content` (raw markdown) overrides for update/edit.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

function agentRoot(): string {
	return process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), ".pi", "agent");
}

function skillsRoot(scope: "project" | "global", cwd: string): string {
	return scope === "global"
		? path.join(agentRoot(), "skills")
		: path.join(cwd, ".pi", "skills");
}

function skillPath(scope: "project" | "global", cwd: string, name: string): string {
	return path.join(skillsRoot(scope, cwd), name, "SKILL.md");
}

/** Parse a skill_id like "project:foo", "global:foo", or "project:repo:foo". */
function parseSkillId(skillId: string): { scope: "project" | "global"; name: string } {
	const parts = skillId.split(":");
	if (parts.length >= 2) {
		const scope = parts[0] === "global" ? "global" : "project";
		const name = parts[parts.length - 1];
		return { scope, name };
	}
	return { scope: "project", name: skillId };
}

function titleCase(name: string): string {
	return name
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize a field value into a string[] (arrays, JSON-string arrays, single strings). */
function toList(val: unknown): string[] | null {
	if (val == null) return null;
	if (Array.isArray(val)) return val.map((x) => String(x));
	if (typeof val === "string") {
		const t = val.trim();
		if (t.startsWith("[")) {
			try {
				const p = JSON.parse(t);
				if (Array.isArray(p)) return p.map((x) => String(x));
			} catch {
				/* fall through */
			}
		}
		return t ? [t] : null;
	}
	return null;
}

function asBullets(arr: unknown): string {
	const list = toList(arr);
	if (!list) return "";
	return list.map((x) => `- ${x}`).join("\n");
}

function asNumbered(arr: unknown): string {
	const list = toList(arr);
	if (!list) return "";
	return list.map((x, i) => `${i + 1}. ${x}`).join("\n");
}

function asChecklist(arr: unknown): string {
	const list = toList(arr);
	if (!list) return "";
	return list.map((x) => `- [ ] ${x}`).join("\n");
}

/** Render a SKILL.md from structured fields, or use raw content. */
function renderSkill(
	name: string,
	description: string,
	fields: {
		when_to_use?: string[] | string;
		procedure_steps?: string[] | string;
		pitfalls?: string[] | string;
		verification_steps?: string[] | string;
	},
	content?: string,
): string {
	if (content && content.trim().length > 0) {
		const body = content.trim();
		// ensure frontmatter if the raw content lacks it
		if (/^---\n/.test(body)) return body.endsWith("\n") ? body : `${body}\n`;
		return `---\nname: ${name}\ndescription: "${description.replace(/"/g, "'")}"\n---\n\n${body}\n`;
	}
	const sections: string[] = [`# ${titleCase(name)}\n`];
	if (fields.when_to_use) sections.push(`## When to Use\n\n${asBullets(fields.when_to_use)}\n`);
	if (fields.procedure_steps) sections.push(`## Procedure\n\n${asNumbered(fields.procedure_steps)}\n`);
	if (fields.pitfalls) sections.push(`## Pitfalls\n\n${asBullets(fields.pitfalls)}\n`);
	if (fields.verification_steps)
		sections.push(`## Verification\n\n${asChecklist(fields.verification_steps)}\n`);
	return (
		`---\nname: ${name}\ndescription: "${description.replace(/"/g, "'")}"\n---\n\n` +
		sections.join("\n")
	);
}

/** Patch a single `## <Section>` in an existing SKILL.md body with new content. */
function patchSection(body: string, section: string, content: string): string {
	const re = new RegExp(`(## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\n)([\\s\\S]*?)(?=\\n## |$)`);
	if (re.test(body)) {
		return body.replace(re, `$1${content.trim()}\n`);
	}
	// section not present → append
	return `${body.trimEnd()}\n\n## ${section}\n\n${content.trim()}\n`;
}

export default function skillManage(pi: ExtensionAPI) {
	pi.registerTool({
		name: "skill_manage",
		label: "Skill Manage",
		description: [
			"Create, view, patch, update, edit, or delete a procedural skill (SKILL.md).",
			"scope=project writes to .pi/skills/<name>/ (repo, ships with kit); scope=global writes to ~/.pi/agent/skills/.",
			"Prefer structured fields (when_to_use, procedure_steps, pitfalls, verification_steps) — they render valid SKILL.md sections. Use `content` for raw markdown (update/edit). Use `section`+`content` for patch.",
		].join(" "),
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("create"),
				Type.Literal("view"),
				Type.Literal("patch"),
				Type.Literal("update"),
				Type.Literal("edit"),
				Type.Literal("delete"),
				Type.Literal("list"),
			]),
			name: Type.Optional(Type.String({ description: "Skill name (for create)" })),
			skill_id: Type.Optional(
				Type.String({ description: "Skill id for view/patch/update/edit/delete, e.g. 'project:foo' or 'global:foo'" }),
			),
			scope: Type.Optional(
				Type.Union([Type.Literal("project"), Type.Literal("global")]),
			),
			description: Type.Optional(Type.String({ description: "One-line description (required for create)" })),
			when_to_use: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
			procedure_steps: Type.Optional(Type.Array(Type.String())),
			pitfalls: Type.Optional(Type.Array(Type.String())),
			verification_steps: Type.Optional(Type.Array(Type.String())),
			content: Type.Optional(Type.String({ description: "Raw markdown body (update/edit) or section content (patch)" })),
			section: Type.Optional(Type.String({ description: "Section header to patch (e.g. 'Procedure', 'Pitfalls')" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;
			const action = params.action;

			// --- list ---
			if (action === "list") {
				const scope = (params.scope ?? "project") as "project" | "global";
				const root = skillsRoot(scope, cwd);
				if (!fs.existsSync(root)) {
					return { content: [{ type: "text", text: `No skills in ${scope} scope.` }] };
				}
				const names = fs
					.readdirSync(root, { withFileTypes: true })
					.filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, "SKILL.md")))
					.map((d) => `${scope}:${d.name}`);
				return {
					content: [
						{ type: "text", text: names.length ? names.join("\n") : `No skills in ${scope} scope.` },
					],
				};
			}

			// Resolve target skill (scope + name) for view/patch/update/edit/delete.
			let scope: "project" | "global";
			let name: string;
			if (params.skill_id) {
				const parsed = parseSkillId(params.skill_id);
				scope = parsed.scope;
				name = parsed.name;
			} else if (params.name) {
				scope = (params.scope ?? "project") as "project" | "global";
				name = params.name;
			} else {
				return {
					content: [{ type: "text", text: "Provide name (create) or skill_id (view/patch/update/edit/delete)." }],
					isError: true,
				};
			}

			const file = skillPath(scope, cwd, name);

			// --- view ---
			if (action === "view") {
				if (!fs.existsSync(file)) {
					return { content: [{ type: "text", text: `Skill not found: ${scope}:${name}` }], isError: true };
				}
				return { content: [{ type: "text", text: fs.readFileSync(file, "utf-8") }] };
			}

			// --- delete ---
			if (action === "delete") {
				const dir = path.dirname(file);
				if (!fs.existsSync(file)) {
					return { content: [{ type: "text", text: `Skill not found: ${scope}:${name}` }], isError: true };
				}
				fs.rmSync(dir, { recursive: true, force: true });
				return { content: [{ type: "text", text: `Deleted skill ${scope}:${name}.` }] };
			}

			// --- create ---
			if (action === "create") {
				if (!params.description) {
					return {
						content: [{ type: "text", text: "description is required to create a skill." }],
						isError: true,
					};
				}
				if (fs.existsSync(file)) {
					return { content: [{ type: "text", text: `Skill already exists: ${scope}:${name}. Use update/edit.` }], isError: true };
				}
				const body = renderSkill(
					name,
					params.description,
					{
						when_to_use: params.when_to_use as string[] | string | undefined,
						procedure_steps: params.procedure_steps as string[] | string | undefined,
						pitfalls: params.pitfalls as string[] | string | undefined,
						verification_steps: params.verification_steps as string[] | string | undefined,
					},
					params.content,
				);
				fs.mkdirSync(path.dirname(file), { recursive: true });
				fs.writeFileSync(file, body);
				return { content: [{ type: "text", text: `Created skill ${scope}:${name} at ${file}.` }] };
			}

			// --- patch (single section) ---
			if (action === "patch") {
				if (!fs.existsSync(file)) {
					return { content: [{ type: "text", text: `Skill not found: ${scope}:${name}` }], isError: true };
				}
				if (!params.section || !params.content) {
					return {
						content: [{ type: "text", text: "patch requires section and content." }],
						isError: true,
					};
				}
				const next = patchSection(fs.readFileSync(file, "utf-8"), params.section, params.content);
				fs.writeFileSync(file, next);
				return { content: [{ type: "text", text: `Patched section '${params.section}' in ${scope}:${name}.` }] };
			}

			// --- update / edit (full body) ---
			if (action === "update" || action === "edit") {
				if (!fs.existsSync(file)) {
					return { content: [{ type: "text", text: `Skill not found: ${scope}:${name}. Use create first.` }], isError: true };
				}
				const desc = params.description ?? "";
				const body = renderSkill(
					name,
					desc || "(updated)",
					{
						when_to_use: params.when_to_use as string[] | string | undefined,
						procedure_steps: params.procedure_steps as string[] | string | undefined,
						pitfalls: params.pitfalls as string[] | string | undefined,
						verification_steps: params.verification_steps as string[] | string | undefined,
					},
					params.content,
				);
				fs.writeFileSync(file, body);
				return { content: [{ type: "text", text: `Updated skill ${scope}:${name}.` }] };
			}

			return { content: [{ type: "text", text: `Unknown action: ${action}` }], isError: true };
		},
	});
}