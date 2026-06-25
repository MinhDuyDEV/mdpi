/**
 * mdpi upgrade — bring an installed .pi/ kit up to the bundled template version.
 *
 * Manifest-based (no patch files): for each template file, compare the user's
 * current file hash against the install-time manifest:
 *   - "unmodified" → safe to overwrite with the new template version
 *   - "modified"   → user edited it → preserve (skip) unless --force
 *   - "unknown"   → not in manifest (new template file, or no manifest) → add
 *                   (or, with no manifest, preserve unless --force)
 *
 * Orphans = files in the manifest but no longer in the new template
 * (template-removed). Listed by default; --prune-all deletes them.
 *
 * Subset installs: if the manifest records an `--only` category subset, the
 * full bundled template is filtered down to those categories + always-on kit
 * config before classification — so upgrade never re-adds excluded categories.
 * Old manifests without `categories` → full template (backward-compatible).
 *
 * Flags: --check (dry-run), --force (overwrite modified), --prune-all (delete
 * orphans), --merge-settings (union-merge settings.json `packages` from the
 * new template into the user's file; other keys preserved). --quiet → 1-line
 * machine output.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import color from "picocolors";
import {
  fileModificationStatus,
  generateManifest,
  loadManifest,
  MANIFEST_FILE,
  type TemplateManifest,
} from "../utils/manifest.js";
import { getPackageVersion, getTemplateRoot, listFilesRel } from "../utils/template.js";
import { ALWAYS_ENTRIES } from "./init.js";

export interface UpgradeOptions {
  force?: boolean;
  check?: boolean;
  pruneAll?: boolean;
  mergeSettings?: boolean;
}

const SKIP_DIRS = ["node_modules", ".git", "dist", "coverage", ".next", ".turbo"];

/**
 * Classify each template file against the install-time manifest.
 * Pure logic (no fs writes) — extracted so it can be unit-tested.
 *
 *   unmodified → toUpdate (hash matches manifest)
 *   modified   → preserved unless force (user edited it)
 *   unknown    → toAdd if a manifest exists (new template file); with no
 *               manifest, preserved unless force (can't detect edits)
 */
export function classifyFiles(
  newFiles: string[],
  piDir: string,
  manifest: TemplateManifest | null,
  force: boolean,
): { toUpdate: string[]; toAdd: string[]; preserved: string[] } {
  const toUpdate: string[] = [];
  const toAdd: string[] = [];
  const preserved: string[] = [];
  for (const rel of newFiles) {
    const dest = join(piDir, rel);
    const status = fileModificationStatus(dest, rel, manifest);
    if (status === "unmodified") {
      toUpdate.push(rel);
    } else if (status === "modified") {
      if (force) toUpdate.push(rel);
      else preserved.push(rel);
    } else {
      // unknown: new template file (if manifest exists) or no-manifest case
      if (manifest) toAdd.push(rel);
      else if (force) toAdd.push(rel);
      else preserved.push(rel);
    }
  }
  return { toUpdate, toAdd, preserved };
}

/**
 * Orphans: files in the manifest but no longer in the new template
 * (template-removed since install). Excludes `.version` — it is mdpi-managed
 * (regenerated each init/upgrade), not a template file, so it must never be a
 * prune candidate. Returns [] when there is no manifest.
 */
export function findOrphans(
  installedFiles: string[],
  newFiles: string[],
  manifest: TemplateManifest | null,
): string[] {
  if (!manifest) return [];
  const newSet = new Set(newFiles);
  return installedFiles.filter(
    (f) => !newSet.has(f) && f in manifest.files && f !== ".version",
  );
}

/** Filter the full bundled template file list down to an `--only` subset.
 *
 *  If the install-time manifest recorded a category subset (`categories`),
 *  upgrade must only consider files in those category dirs PLUS the always-on
 *  kit config/docs — otherwise it would re-add the categories the user
 *  intentionally excluded at `mdpi init --only`. null/empty → full install →
 *  return the list unchanged (backward-compatible with old manifests). */
export function filterToSubset(
  files: string[],
  categories: string[] | null | undefined,
): string[] {
  if (!categories || categories.length === 0) return files;
  const catSet = new Set(categories);
  return files.filter((rel) => {
    const top = rel.split("/")[0];
    if (catSet.has(top)) return true;
    for (const e of ALWAYS_ENTRIES) {
      if (rel === e || rel.startsWith(e + "/")) return true;
    }
    return false;
  });
}

/** Union-merge two `packages` arrays (template-first, user-only appended, deduped).
 *
 *  Used by `--merge-settings` to bring upstream-added npm packages into a
 *  user-customized settings.json without clobbering the user's other keys.
 *  Non-array inputs are treated as empty. Note: a package the user intentionally
 *  removed will be re-added — this is the opt-in tradeoff of `--merge-settings`. */
export function unionPackages(user: unknown, template: unknown): string[] {
  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const t = toArr(template);
  const u = toArr(user);
  const out = [...t];
  for (const p of u) if (!out.includes(p)) out.push(p);
  return out;
}

/** Best-effort preview of the settings.json packages merge (no write).
 *  Returns the merged array + how many new packages would be added, or null
 *  if either file is missing or unparseable. */
export function previewSettingsMerge(
  piDir: string,
  srcPi: string,
): { merged: string[]; added: number } | null {
  const userPath = join(piDir, "settings.json");
  const tmplPath = join(srcPi, "settings.json");
  if (!existsSync(userPath) || !existsSync(tmplPath)) return null;
  try {
    const user = JSON.parse(readFileSync(userPath, "utf-8")) as Record<string, unknown>;
    const tmpl = JSON.parse(readFileSync(tmplPath, "utf-8")) as Record<string, unknown>;
    const before = Array.isArray(user.packages)
      ? (user.packages as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const merged = unionPackages(user.packages, tmpl.packages);
    return { merged, added: merged.length - before.length };
  } catch {
    return null;
  }
}

export async function upgradeCommand(options: UpgradeOptions = {}): Promise<void> {
  const quiet = process.argv.includes("--quiet");
  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi upgrade ")));

  const piDir = join(process.cwd(), ".pi");
  if (!existsSync(piDir)) {
    if (!quiet) {
      p.log.error(".pi/ not found — run `mdpi init` first");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const templateRoot = getTemplateRoot();
  if (!templateRoot) {
    if (!quiet) {
      p.log.error("Template not found. Reinstall mdpi.");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }
  const srcPi = join(templateRoot, ".pi");

  const currentVersion = existsSync(join(piDir, ".version"))
    ? readFileSync(join(piDir, ".version"), "utf-8").trim()
    : "unknown";
  const targetVersion = getPackageVersion();
  const manifest = loadManifest(piDir);
  // Respect a remembered `--only` subset so upgrade won't re-add excluded
  // categories. null/absent categories → full template (backward-compatible).
  const newFiles = filterToSubset(listFilesRel(srcPi, SKIP_DIRS, [MANIFEST_FILE]), manifest?.categories);
  const installedFiles = listFilesRel(piDir, SKIP_DIRS, [MANIFEST_FILE]);

  // Classify each template file + find orphans (pure helpers, unit-tested).
  const { toUpdate, toAdd, preserved } = classifyFiles(newFiles, piDir, manifest, !!options.force);
  const orphans = findOrphans(installedFiles, newFiles, manifest);
  // Best-effort preview of the settings.json packages merge (--merge-settings).
  const settingsMerge = options.mergeSettings ? previewSettingsMerge(piDir, srcPi) : null;

  if (!quiet) {
    p.log.info(`v${currentVersion} → v${targetVersion}`);
    if (manifest?.categories?.length)
      p.log.info(`subset install: ${manifest.categories.join(", ")} (excluded categories won't be added)`);
    if (settingsMerge && settingsMerge.added > 0)
      p.log.info(`settings.json: ${settingsMerge.added} new package(s) would be merged (--merge-settings)`);
    p.log.info(
      `update ${toUpdate.length} · add ${toAdd.length} · preserve ${preserved.length} (user-modified) · orphans ${orphans.length}`,
    );
    if (preserved.length)
      p.log.warn(`preserved: ${preserved.slice(0, 5).join(", ")}${preserved.length > 5 ? " …" : ""}`);
    if (orphans.length && !options.pruneAll)
      p.log.warn(
        `orphans kept: ${orphans.slice(0, 5).join(", ")}${orphans.length > 5 ? " …" : ""} — use --prune-all to delete`,
      );
  }

  const hasSettingsMerge = !!(settingsMerge && settingsMerge.added > 0);
  const upToDate =
    currentVersion === targetVersion && toUpdate.length === 0 && toAdd.length === 0;
  if (upToDate && !options.force && !hasSettingsMerge) {
    if (!quiet) p.outro(color.green("Already up to date"));
    return;
  }

  if (options.check) {
    if (!quiet) p.outro("dry-run (--check), no changes written");
    return;
  }

  if (!manifest && !options.force) {
    if (!quiet) {
      p.log.error("no manifest — cannot safely detect user modifications. Use --force to overwrite everything.");
      p.outro(color.red("Aborted"));
    }
    process.exitCode = 1;
    return;
  }

  // Apply: copy update + add (ensure parent dirs), optionally prune orphans.
  const spinner = quiet ? null : p.spinner();
  spinner?.start("Applying upgrade");
  try {
    for (const rel of [...toUpdate, ...toAdd]) {
      const dest = join(piDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(join(srcPi, rel), dest);
    }
    if (options.pruneAll) {
      for (const rel of orphans) rmSync(join(piDir, rel));
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

  // --merge-settings: union-merge settings.json packages (best-effort, never
  // fails the upgrade). Runs BEFORE manifest regen so the new manifest hashes
  // the merged file. Only writes when new packages are actually added.
  let settingsMerged = 0;
  if (hasSettingsMerge) {
    const userPath = join(piDir, "settings.json");
    try {
      const user = JSON.parse(readFileSync(userPath, "utf-8")) as Record<string, unknown>;
      user.packages = settingsMerge!.merged;
      writeFileSync(userPath, JSON.stringify(user, null, 2) + "\n");
      settingsMerged = settingsMerge!.added;
    } catch {
      if (!quiet) p.log.warn("settings.json merge skipped (parse/write error)");
    }
  }

  writeFileSync(join(piDir, ".version"), targetVersion);
  const newManifest = generateManifest(piDir, targetVersion);
  const total = Object.keys(newManifest.files).length;
  const prunedNote = options.pruneAll ? ` · pruned ${orphans.length}` : "";
  const mergeNote = settingsMerged > 0 ? ` · merged ${settingsMerged} pkg` : "";

  if (quiet) {
    console.log(
      `mdpi: upgraded v${currentVersion}→v${targetVersion} (${toUpdate.length} updated, ${toAdd.length} added${prunedNote}${mergeNote}, ${total} tracked)`,
    );
  } else {
    p.note(
      `Upgraded v${currentVersion} → v${targetVersion}\n\n` +
        `${toUpdate.length} updated · ${toAdd.length} added · ${preserved.length} preserved${prunedNote}${mergeNote}\n` +
        `${total} files now tracked.`,
      "Upgrade complete",
    );
    p.outro(color.green("Ready!"));
  }
}