/**
 * mdpi doctor — .pi/ health check.
 *
 * Verifies: mdpi version match, manifest valid, settings.json valid JSON, kit
 * dirs present (skills/prompts/agents/templates/workflows/extensions), orphan
 * detection (manifest files no longer in template), and a lint summary.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import color from "picocolors";
import { loadManifest } from "../utils/manifest.js";
import { getPackageVersion, getTemplateRoot, listFilesRel } from "../utils/template.js";
import { lintSkills } from "./lint.js";

function row(ok: boolean, label: string, detail: string): void {
  console.log(`  ${ok ? color.green("✓") : color.red("✗")} ${label}: ${detail}`);
}

export async function doctorCommand(): Promise<void> {
  const quiet = process.argv.includes("--quiet");
  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi doctor ")));

  const piDir = join(process.cwd(), ".pi");
  if (!existsSync(piDir)) {
    if (!quiet) {
      p.log.error(".pi/ not found — run `mdpi init`");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const mdpiVersion = getPackageVersion();
  const installedVersion = existsSync(join(piDir, ".version"))
    ? readFileSync(join(piDir, ".version"), "utf-8").trim()
    : "(none)";
  const manifest = loadManifest(piDir);
  const manifestOk = !!manifest && typeof manifest.version === "string" && !!manifest.files;

  let settingsOk = false;
  try {
    JSON.parse(readFileSync(join(piDir, "settings.json"), "utf-8"));
    settingsOk = true;
  } catch {
    settingsOk = false;
  }

  const countMd = (sub: string) =>
    existsSync(join(piDir, sub)) ? readdirSync(join(piDir, sub)).filter((f) => f.endsWith(".md") && f !== "INDEX.md").length : 0;
  const countExt = (sub: string, ext: string) =>
    existsSync(join(piDir, sub)) ? readdirSync(join(piDir, sub)).filter((f) => f.endsWith(ext)).length : 0;
  const skillCount = existsSync(join(piDir, "skills"))
    ? readdirSync(join(piDir, "skills")).filter((n) => statSync(join(piDir, "skills", n)).isDirectory()).length
    : 0;

  // orphan detection: manifest files not in current bundled template.
  // Exclude .version (mdpi-managed, regenerated each init/upgrade — not a
  // template file, must never be a prune candidate).
  const templateRoot = getTemplateRoot();
  let orphans = 0;
  if (templateRoot && manifest) {
    const srcPi = join(templateRoot, ".pi");
    const newFiles = new Set(listFilesRel(srcPi, ["node_modules", ".git", "dist", "coverage"], [".template-manifest.json"]));
    orphans = Object.keys(manifest.files).filter((f) => !newFiles.has(f) && f !== ".version").length;
  }

  console.log(`\n${color.bold("mdpi doctor")} — .pi/ health\n`);
  row(
    true,
    "mdpi version",
    `installed ${installedVersion} · cli ${mdpiVersion}` +
      (installedVersion !== mdpiVersion ? color.yellow("  (out of date — run mdpi upgrade)") : ""),
  );
  row(
    manifestOk,
    "manifest",
    manifestOk
      ? `${Object.keys(manifest!.files).length} files tracked (v${manifest!.version})`
      : "missing or invalid .template-manifest.json",
  );
  row(settingsOk, "settings.json", settingsOk ? "valid JSON" : "INVALID JSON");
  row(skillCount > 0, "skills", `${skillCount} skill dirs`);
  row(countMd("prompts") > 0, "prompts", `${countMd("prompts")} prompts`);
  row(countMd("agents") > 0, "agents", `${countMd("agents")} agents`);
  row(countMd("templates") > 0, "templates", `${countMd("templates")} templates`);
  row(countMd("workflows") > 0, "workflows", `${countMd("workflows")} workflows`);
  row(countExt("extensions", ".ts") > 0, "extensions", `${countExt("extensions", ".ts")} extensions`);
  if (templateRoot)
    row(
      orphans === 0,
      "orphans",
      orphans === 0 ? "none (template-removed files)" : `${orphans} orphan(s) — run mdpi upgrade --prune-all`,
    );

  const lr = lintSkills(piDir);
  console.log(
    `  ${lr.ok ? color.green("✓") : color.red("✗")} lint: ${lr.stats.failed} errors · ${lr.stats.warnings} warnings (run ${color.cyan("mdpi lint")} for detail)`,
  );

  const healthy = manifestOk && settingsOk && skillCount > 0 && lr.stats.failed === 0;
  if (!quiet) p.outro(healthy ? color.green("Healthy") : color.yellow("Issues found"));
  process.exitCode = healthy ? 0 : 1;
}