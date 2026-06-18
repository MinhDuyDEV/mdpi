/**
 * mdpi new — scaffold a new kit component from a lint-passing skeleton.
 *
 *   mdpi new <kind> <name> [--description <text>] [--force]
 *
 * Kinds + destinations:
 *   skill      → .pi/skills/<name>/SKILL.md
 *   prompt     → .pi/prompts/<name>.md
 *   agent      → .pi/agents/<name>.md
 *   workflow   → .pi/workflows/<name>.md
 *   template   → .pi/templates/<name>.md
 *
 * Skeletons are pre-shaped to pass `mdpi lint` immediately (skills get
 * frontmatter + H1 + When to Use / NOT; workflows get the DAG phase format;
 * prompts get the $ARGUMENTS + argument table). Idempotent: refuses to
 * overwrite an existing file unless --force.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import color from "picocolors";

export type NewKind = "skill" | "prompt" | "agent" | "workflow" | "template";
const KINDS: NewKind[] = ["skill", "prompt", "agent", "workflow", "template"];

export interface NewOptions {
  force?: boolean;
  description?: string;
}

/** Title-case a kebab name for H1s: "my-skill" → "My Skill". */
export function titleCase(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Validate a kebab-case file/dir name (lowercase letters, digits, hyphens). */
export function validName(name: string): boolean {
  return /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(name) && !name.includes("--");
}

/** Build the skeleton body for a kind, substituting name + description. */
export function skeleton(kind: NewKind, name: string, desc: string): string {
  const title = titleCase(name);
  const description = desc || `TODO: when to use this ${kind}`;
  switch (kind) {
    case "skill":
      return `---
name: ${name}
description: ${description}
---

# ${title}

TODO: what this skill does and when to reach for it.

## When to Use

- TODO: trigger conditions and boundaries

## When NOT to Use

- TODO: when to avoid this skill (overlapping skills, anti-patterns)

## Procedure

1. TODO: first concrete step
2. TODO: second step

## Pitfalls

- TODO: common mistake / caveat

## Verification

- TODO: how to confirm success
`;
    case "prompt":
      return `---
description: ${description}
argument-hint: "[<args>] [--help]"
---

# ${title}: $ARGUMENTS

TODO: what this slash command does.

## Parse Arguments

| Argument     | Default  | Description                |
| ------------ | -------- | -------------------------- |
| \`<args>\`    | required | TODO: what the user passes |
| \`--help\`   | false    | Show this usage             |

## Phase 1: TODO

TODO: first step.
`;
    case "agent":
      return `---
name: ${name}
description: ${description}
tools: read, grep, find, ls, bash, edit, write
model: ollama-cloud/glm-5.2
---

You are a Pi subagent.

# ${title}

**Purpose**: TODO — one line on what this agent is for.

## When to dispatch

TODO: trigger conditions.

## Constraints

- TODO: scope boundaries (files touched, tools allowed)
`;
    case "workflow":
      return `---
description: ${description}
---

# ${name}

TODO: what this workflow does. Use when ...

## Args

- \`arg1\` (required) — TODO: what the caller passes

## Phases

### Phase 1: TODO

- **Agent:** general
- **Concurrency:** 1
- **Depends on:** —
- **Tool:** \`subagent\`

**Prompt:**

\`\`\`
TODO: prompt for phase 1.
\`\`\`
`;
    case "template":
      return `# ${title} Template

> **Template Instructions:**
>
> - Replace ALL bracketed placeholders with real content
> - If you cannot fill a section, use \`[NEEDS CLARIFICATION: reason]\` instead of guessing

## Section 1

TODO: content.
`;
  }
}

/** Resolve the destination path for a kind + name. */
export function destPath(piDir: string, kind: NewKind, name: string): string {
  switch (kind) {
    case "skill":
      return join(piDir, "skills", name, "SKILL.md");
    case "prompt":
      return join(piDir, "prompts", `${name}.md`);
    case "agent":
      return join(piDir, "agents", `${name}.md`);
    case "workflow":
      return join(piDir, "workflows", `${name}.md`);
    case "template":
      return join(piDir, "templates", `${name}.md`);
  }
}

export async function newCommand(kindArg: string, name: string | undefined, options: NewOptions = {}): Promise<void> {
  const quiet = process.argv.includes("--quiet");
  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi new ")));

  if (!KINDS.includes(kindArg as NewKind)) {
    if (!quiet) {
      p.log.error(`unknown kind '${kindArg}'. Valid: ${KINDS.join(", ")}`);
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }
  const kind = kindArg as NewKind;

  if (!name || !validName(name)) {
    if (!quiet) {
      p.log.error(`invalid name '${name ?? ""}'. Use kebab-case (lowercase letters, digits, hyphens; no leading/trailing/double hyphen).`);
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const piDir = join(process.cwd(), ".pi");
  if (!existsSync(piDir)) {
    if (!quiet) {
      p.log.error(".pi/ not found — run `mdpi init` first");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const dest = destPath(piDir, kind, name);
  if (existsSync(dest) && !options.force) {
    if (!quiet) {
      p.log.warn(`${dest} already exists`);
      p.log.info(`Use ${color.cyan("--force")} to overwrite`);
      p.outro("Nothing to do");
    }
    return;
  }

  mkdirSync(join(dest, ".."), { recursive: true });
  writeFileSync(dest, skeleton(kind, name, options.description ?? ""));

  if (quiet) {
    console.log(`mdpi: created ${kind} '${name}' → ${dest}`);
  } else {
    p.note(`Created: ${color.cyan(dest)}\n\nEdit the skeleton, then run ${color.cyan("mdpi lint")} to verify.`, "Scaffolded");
    p.outro(color.green("Ready!"));
  }
}