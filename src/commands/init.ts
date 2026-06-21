/**
 * mdpi init — scaffold a Pi coding-agent kit (.pi/) into the current repo.
 *
 * Mirrors OpenCodeKit's `ock init` but pi-native:
 *   - No license gate (open MIT).
 *   - No --global (pi global dir ~/.pi/agent/ is pi's own config; installing the
 *     full kit there is a footgun). Project-local only.
 *   - Bundled template is the CURATED kit (runtime dirs already stripped at
 *     build time by scripts/bundle-template.mjs).
 *
 * After copy, writes .pi/.version and generates .pi/.template-manifest.json
 * (SHA-256 map) so a future `mdpi upgrade` can detect user modifications.
 *
 * --only <cats> installs only the listed category dirs (plus the always-on kit
 * config/docs) and rewrites settings.json to drop references to the excluded
 * `skills`/`prompts`/`extensions` dirs so pi doesn't resolve dangling paths.
 * Caveat: `mdpi upgrade` always compares against the FULL template — a subset
 * install is not remembered as partial, so upgrade will offer the missing
 * categories (use `--check` first, or re-run `init` without `--only`).
 *
 * --quiet suppresses the @clack UI but still performs the install (emits one
 * machine-readable line). --force overwrites template files but preserves any
 * extra user-created files under .pi/ (safe, non-destructive to custom work).
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import color from "picocolors";
import { generateManifest } from "../utils/manifest.js";
import { getPackageVersion, getTemplateRoot } from "../utils/template.js";

const EXCLUDED_DIRS = ["node_modules", ".git", "dist", ".DS_Store", "coverage", ".next", ".turbo"];
const EXCLUDED_FILES = ["bun.lock", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

/** Selectable kit categories for `--only`. */
export const CATEGORIES = [
  "agents",
  "prompts",
  "skills",
  "templates",
  "workflows",
  "context",
  "extensions",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Kit infrastructure always installed (not selectable via --only). */
const ALWAYS_ENTRIES = [
  "scripts",
  "artifacts/example",
  "settings.json",
  "packages.json",
  "AGENTS.md",
  "README.md",
  "QUALITY.md",
  "VERSION",
  ".env.example",
  "guard.example.json",
  "subagents.json",
];

/** Recursively copy a directory, skipping runtime/lockfile noise. */
async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.includes(entry.name)) continue;
    if (!entry.isDirectory() && EXCLUDED_FILES.includes(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isSymbolicLink()) continue; // skip symlinks
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath, "utf-8"));
    }
  }
}

/** Copy one template entry (dir or file) into the kit, creating parent dirs. */
async function copyEntry(srcPi: string, piDir: string, rel: string): Promise<void> {
  const from = join(srcPi, rel);
  if (!existsSync(from)) return;
  const to = join(piDir, rel);
  if (statSync(from).isDirectory()) {
    await copyDir(from, to);
  } else {
    await mkdir(join(to, ".."), { recursive: true });
    writeFileSync(to, readFileSync(from, "utf-8"));
  }
}

/** Parse `--only cats` into a Set. Throws on an unknown category. */
export function parseOnly(only: string | undefined): Set<Category> | null {
  if (!only) return null;
  const cats = new Set<Category>();
  for (const raw of only.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!(CATEGORIES as readonly string[]).includes(raw)) {
      throw new Error(`unknown --only category '${raw}'. Valid: ${CATEGORIES.join(", ")}`);
    }
    cats.add(raw as Category);
  }
  return cats;
}

/**
 * Drop settings.json keys that reference excluded category dirs so pi doesn't
 * resolve dangling `./skills`, `./prompts`, `./extensions` paths. `packages`
 * (general pi runtime deps) is left untouched — agents/skills may still use
 * those tools even when a category dir is absent.
 */
export function adaptSettingsJson(piDir: string, only: Set<Category>): boolean {
  const path = join(piDir, "settings.json");
  if (!existsSync(path)) return false;
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
  let changed = false;
  for (const key of ["skills", "prompts", "extensions"] as const) {
    if (!only.has(key) && key in json) {
      delete json[key];
      changed = true;
    }
  }
  if (changed) writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  return changed;
}

export interface InitOptions {
  force?: boolean;
  yes?: boolean;
  only?: string;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const quiet = process.argv.includes("--quiet");

  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi ")));

  // Parse --only up front so an invalid category fails before any file writes.
  let only: Set<Category> | null = null;
  if (options.only) {
    try {
      only = parseOnly(options.only);
    } catch (error) {
      if (!quiet) {
        p.log.error(error instanceof Error ? error.message : String(error));
        p.outro(color.red("Failed"));
      }
      process.exitCode = 1;
      return;
    }
  }

  const targetDir = process.cwd();
  const piDir = join(targetDir, ".pi");
  if (!quiet) p.log.info(`Installing Pi kit to: ${color.cyan(piDir)}`);

  // Idempotency: bail if .pi/ already exists unless --force.
  if (existsSync(piDir) && !options.force) {
    if (!quiet) {
      p.log.warn(".pi/ already exists in this project");
      p.log.info(`Use ${color.cyan("--force")} to overwrite template files (preserves extra user files)`);
      p.outro("Nothing to do");
    }
    return;
  }

  const templateRoot = getTemplateRoot();
  if (!templateRoot) {
    if (!quiet) {
      p.log.error("Template not found. Please reinstall mdpi.");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const srcPi = join(templateRoot, ".pi");
  if (!existsSync(srcPi)) {
    if (!quiet) {
      p.log.error("Template .pi/ not found");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const spinner = quiet ? null : p.spinner();
  spinner?.start(only ? `Copying subset (${[...only].join(",")}) to .pi/` : "Copying kit to .pi/");
  try {
    if (only) {
      for (const entry of ALWAYS_ENTRIES) await copyEntry(srcPi, piDir, entry);
      for (const cat of CATEGORIES) if (only.has(cat)) await copyEntry(srcPi, piDir, cat);
    } else {
      await copyDir(srcPi, piDir);
    }
  } catch (error) {
    spinner?.stop("Failed");
    if (!quiet) {
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }
  spinner?.stop("Done");

  const version = getPackageVersion();
  writeFileSync(join(piDir, ".version"), version);
  if (only) adaptSettingsJson(piDir, only);
  const manifest = generateManifest(piDir, version);
  const fileCount = Object.keys(manifest.files).length;
  const hasSkills = !only || only.has("skills");

  if (quiet) {
    const subset = only ? ` subset=[${[...only].join(",")}]` : "";
    console.log(`mdpi: installed ${fileCount} files to ${piDir} (v${version})${subset}`);
  } else {
    const subsetNote = only
      ? `Subset: ${[...only].join(", ")} (+ always-on config).\n\n` +
        `settings.json trimmed to drop references to excluded\nskills/prompts/extensions dirs.\n\n` +
        `Note: mdpi upgrade compares against the FULL template —\nrun \`mdpi upgrade --check\` before applying.\n\n`
      : "";
    const fallowHint = hasSkills
      ? `Fallow skill included (codebase intelligence: dead code,\n` +
        `duplication, complexity). For JS/TS projects, run \`/init\`\n` +
        `in a pi session to generate \`.fallowrc.json\`; other stacks skip it.\n\n`
      : "";
    p.note(
      `Pi kit installed at:\n${piDir}\n\n` +
        `${fileCount} template files tracked via manifest.\n\n` +
        subsetNote +
        fallowHint +
        `Next: run ${color.cyan("mdpi install")} to install the kit's npm packages,\n` +
        `then open pi in this repo to use the kit.`,
      "Installation complete",
    );
    p.outro(color.green("Ready!"));
  }
}