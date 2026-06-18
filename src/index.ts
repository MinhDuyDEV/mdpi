#!/usr/bin/env node
/**
 * mdpi — CLI to scaffold and manage a Pi coding-agent kit (.pi/) in any repo.
 *
 * v0.1 surface:
 *   mdpi init    Scaffold curated .pi/ kit into cwd + write manifest
 *   mdpi --version / -v
 *   mdpi --help / -h
 *
 * No license gate, no --global (project-local only).
 */
import * as p from "@clack/prompts";
import { cac } from "cac";
import packageInfo from "../package.json" with { type: "json" };
import { initCommand } from "./commands/init.js";
import { logger, setLogLevel } from "./utils/logger.js";

// Ensure UTF-8 output (matches reference).
if (process.stdout.setEncoding) process.stdout.setEncoding("utf8");
if (process.stderr.setEncoding) process.stderr.setEncoding("utf8");

const packageVersion = packageInfo.version;

const cli = cac("mdpi");

// Global options
cli.option("--verbose", "Enable verbose (debug) logging");
cli.option("--quiet", "Suppress all output");

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

// ── default (no args) → help ─────────────────────────────────────────────
cli.command("", "Show help").action(() => {
  cli.outputHelp();
});

// ── parse ───────────────────────────────────────────────────────────────
try {
  // honor global flags before parse side-effects
  const argv = process.argv.slice(2);
  if (argv.includes("--verbose")) setLogLevel("debug");
  if (argv.includes("--quiet")) setLogLevel("error");
  cli.parse(process.argv);
} catch (error) {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

export { cli };