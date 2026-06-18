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
 * --quiet suppresses the @clack UI but still performs the install (emits one
 * machine-readable line). --force overwrites template files but preserves any
 * extra user-created files under .pi/ (safe, non-destructive to custom work).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import color from "picocolors";
import { generateManifest } from "../utils/manifest.js";

const EXCLUDED_DIRS = ["node_modules", ".git", "dist", ".DS_Store", "coverage", ".next", ".turbo"];
const EXCLUDED_FILES = ["bun.lock", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

/** Resolve the bundled template root: dist/template (published) or repo root (dev tsx). */
function getTemplateRoot(): string | null {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(__dirname, "template"), join(__dirname, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, ".pi"))) return candidate;
  }
  return null;
}

/** Resolve the mdpi package version (inlined by tsdown from package.json at build). */
function getPackageVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPaths = [
    join(__dirname, "..", "..", "package.json"),
    join(__dirname, "..", "package.json"),
  ];
  for (const pkgPath of pkgPaths) {
    if (!existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      return pkg.version ?? "unknown";
    } catch {
      continue;
    }
  }
  return "unknown";
}

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

export interface InitOptions {
  force?: boolean;
  yes?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const quiet = process.argv.includes("--quiet");

  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi ")));

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
  spinner?.start("Copying kit to .pi/");
  try {
    await copyDir(srcPi, piDir);
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
  const manifest = generateManifest(piDir, version);
  const fileCount = Object.keys(manifest.files).length;

  if (quiet) {
    console.log(`mdpi: installed ${fileCount} files to ${piDir} (v${version})`);
  } else {
    p.note(
      `Pi kit installed at:\n${piDir}\n\n` +
        `${fileCount} template files tracked via manifest.\n\n` +
        `Provides agents, prompts, skills, templates, workflows,\n` +
        `extensions + settings.json for this project.\n\n` +
        `Next: open pi in this repo to use the kit.`,
      "Installation complete",
    );
    p.outro(color.green("Ready!"));
  }
}