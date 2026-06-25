#!/usr/bin/env node
/**
 * mdpi — CLI to scaffold and manage a Pi coding-agent kit (.pi/) in any repo.
 *
 * Command surface (v0.3.0):
 *   mdpi init      Scaffold curated .pi/ kit into cwd + write manifest
 *   mdpi install   Install the kit's declared npm packages (core + optional)
 *   mdpi upgrade   Bring .pi/ up to bundled template version (manifest-based)
 *   mdpi new       Scaffold a new kit component (skill|prompt|agent|workflow|template)
 *   mdpi lint      Governance checks (skills frontmatter + dead cross-refs, docs drift)
 *   mdpi doctor    .pi/ health check (version/manifest/counts/orphans/lint)
 *   mdpi --version / -v
 *   mdpi --help / -h
 *
 * No license gate, no --global (project-local only).
 */
import * as p from "@clack/prompts";
import { cac } from "cac";
import { join } from "node:path";
import packageInfo from "../package.json" with { type: "json" };
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { lintAll } from "./commands/lint.js";
import { newCommand } from "./commands/new.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { logger, setLogLevel } from "./utils/logger.js";

if (process.stdout.setEncoding) process.stdout.setEncoding("utf8");
if (process.stderr.setEncoding) process.stderr.setEncoding("utf8");

const packageVersion = packageInfo.version;

const cli = cac("mdpi");

cli.option("--verbose", "Enable verbose (debug) logging");
cli.option("--quiet", "Suppress UI output");

cli.version(`${packageVersion}`);
cli.help();

// ── init ────────────────────────────────────────────────────────────────
cli
  .command("init", "Scaffold a Pi coding-agent kit (.pi/) into the current repo")
  .option("--force", "Overwrite existing .pi/ template files (preserves extra user files)")
  .option("-y, --yes", "Skip prompts, use defaults (for CI)")
  .option("--only <cats>", "Install only these categories (comma-sep: agents,prompts,skills,templates,workflows,context,extensions)")
  .action(async (options) => {
    await initCommand(options);
  });

// ── upgrade ─────────────────────────────────────────────────────────────
cli
  .command("install", "Install the kit's declared npm packages (core from settings.json + optional from packages.json)")
  .option("--core", "Only install core packages (settings.json:packages)")
  .option("--optional", "Only install optional packages (packages.json:optional)")
  .option("--check", "Dry-run: list declared packages + report installed/missing")
  .option("-y, --yes", "Skip confirmation prompt (for CI)")
  .action(async (options) => {
    await installCommand(options);
  });

// ── upgrade ─────────────────────────────────────────────────────────────
cli
  .command("upgrade", "Bring .pi/ up to the bundled template version")
  .option("--force", "Overwrite user-modified files (default: preserve them)")
  .option("--check", "Dry-run: report what would change without writing")
  .option("--prune-all", "Delete orphan files (template-removed since install)")
  .option("--merge-settings", "Union-merge settings.json packages (upstream + user); other keys preserved")
  .action(async (options) => {
    await upgradeCommand(options);
  });

// ── new ─────────────────────────────────────────────────────────────────
cli
  .command("new <kind> [name]", "Scaffold a new kit component (skill|prompt|agent|workflow|template)")
  .option("-d, --description <text>", "Set the frontmatter description (default: TODO placeholder)")
  .option("--force", "Overwrite an existing file at the destination")
  .action(async (kind: string, name: string | undefined, options) => {
    await newCommand(kind, name, { force: options?.force, description: options?.description });
  });

// ── lint ─────────────────────────────────────────────────────────────────
cli
  .command("lint [target]", "Governance checks (skills|docs|all)")
  .option("--json", "Output machine-readable JSON")
  .option("--fix", "Auto-fix fixable issues (name-match, README counts)")
  .action(async (target: "skills" | "docs" | "all" | undefined, options) => {
    lintAll(join(process.cwd(), ".pi"), { target: target ?? "all", json: options?.json, fix: options?.fix });
  });

// ── doctor ───────────────────────────────────────────────────────────────
cli
  .command("doctor", "Check .pi/ health")
  .option("--fix", "Auto-fix: regenerate manifest if missing/invalid")
  .action(async (options) => {
    await doctorCommand({ fix: options?.fix });
  });

// ── default (no args) → help ─────────────────────────────────────────────
cli.command("", "Show help").action(() => {
  cli.outputHelp();
});

// ── parse ────────────────────────────────────────────────────────────────
try {
  const argv = process.argv.slice(2);
  if (argv.includes("--verbose")) setLogLevel("debug");
  if (argv.includes("--quiet")) setLogLevel("error");
  cli.parse(process.argv);
} catch (error) {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

export { cli };