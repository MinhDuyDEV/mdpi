#!/usr/bin/env node
/**
 * mdpi — CLI to scaffold and manage a Pi coding-agent kit (.pi/) in any repo.
 *
 * Command surface (v0.2.0):
 *   mdpi init      Scaffold curated .pi/ kit into cwd + write manifest
 *   mdpi upgrade   Bring .pi/ up to bundled template version (manifest-based)
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
import { lintAll } from "./commands/lint.js";
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
  .action(async (options) => {
    await initCommand(options);
  });

// ── upgrade ─────────────────────────────────────────────────────────────
cli
  .command("upgrade", "Bring .pi/ up to the bundled template version")
  .option("--force", "Overwrite user-modified files (default: preserve them)")
  .option("--check", "Dry-run: report what would change without writing")
  .option("--prune-all", "Delete orphan files (template-removed since install)")
  .action(async (options) => {
    await upgradeCommand(options);
  });

// ── lint ─────────────────────────────────────────────────────────────────
cli
  .command("lint [target]", "Governance checks (skills|docs|all)")
  .option("--json", "Output machine-readable JSON")
  .action(async (target: "skills" | "docs" | "all" | undefined, options) => {
    lintAll(join(process.cwd(), ".pi"), { target: target ?? "all", json: options?.json });
  });

// ── doctor ───────────────────────────────────────────────────────────────
cli.command("doctor", "Check .pi/ health").action(async () => {
  await doctorCommand();
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