/**
 * mdpi install — install the npm packages this kit depends on.
 *
 * The kit references two kinds of external packages:
 *   - **core**: declared in `.pi/settings.json:packages` (auto-loaded by pi at
 *     startup — e.g. `@sting8k/pi-srcwalk`, `pi-hermes-memory`). Single source
 *     of truth = settings.json; this command reads it, does not duplicate it.
 *   - **optional**: declared in `.pi/packages.json` (recommended add-ons the
 *     user opts into — e.g. `@davecodes/pi-dcp`, `pi-guard`).
 *
 * `mdpi install` shells out to `pi install <id>` for each declared package.
 * `pi install` is idempotent (re-running on an already-installed package is a
 * no-op), so this command is safe to re-run.
 *
 * Flags:
 *   (default)  install core + optional
 *   --core     only settings.json:packages
 *   --optional only packages.json:optional
 *   --check    dry-run: list declared packages + report which are already
 *              installed under ~/.pi/agent/npm/node_modules (no shell-out)
 *   --yes      skip the confirmation prompt (for CI)
 *
 * Why a dedicated command instead of `mdpi init` doing it: init copies files
 * only and must work offline / without `pi` on PATH. Package installation is a
 * separate, network-dependent step the user controls explicitly. `mdpi init`
 * reminds the user to run `mdpi install` next.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import * as p from "@clack/prompts";
import color from "picocolors";

/** A declared package with its source id and a human note. */
export interface KitPackage {
  id: string; // e.g. "npm:@davecodes/pi-dcp"
  note?: string; // e.g. "Dynamic context pruning"
  source: "core" | "optional";
}

export interface InstallOptions {
  core?: boolean;
  optional?: boolean;
  check?: boolean;
  yes?: boolean;
  /** Internal: override .pi/ path (used by tests). Defaults to cwd/.pi. */
  piDir?: string;
}

/** Path to pi's global npm install dir (where `pi install npm:foo` lands). */
export function globalNpmDir(): string {
  return join(homedir(), ".pi", "agent", "npm", "node_modules");
}

/**
 * Extract the npm package name from a `npm:<name>` source id.
 * `npm:@davecodes/pi-dcp` → `@davecodes/pi-dcp`. Non-npm ids return null
 * (presence check only supports npm sources).
 */
export function npmNameFromId(id: string): string | null {
  if (!id.startsWith("npm:")) return null;
  return id.slice("npm:".length);
}

/** Is a package already installed in pi's global npm dir? */
export function isInstalled(id: string): boolean {
  const name = npmNameFromId(id);
  if (!name) return false; // git:/url sources — can't cheaply check, assume no
  return existsSync(join(globalNpmDir(), name));
}

/** Read core packages from `.pi/settings.json:packages`. */
export function readCorePackages(piDir: string): KitPackage[] {
  const path = join(piDir, "settings.json");
  if (!existsSync(path)) return [];
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
  const packages = json.packages;
  if (!Array.isArray(packages)) return [];
  return packages
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((id) => ({ id, source: "core" as const }));
}

/** Read optional packages from `.pi/packages.json:optional`. */
export function readOptionalPackages(piDir: string): KitPackage[] {
  const path = join(piDir, "packages.json");
  if (!existsSync(path)) return [];
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
  const optional = json.optional;
  if (!Array.isArray(optional)) return [];
  const out: KitPackage[] = [];
  for (const entry of optional) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Record<string, unknown>).id;
    if (typeof id !== "string" || id.length === 0) continue;
    const note = (entry as Record<string, unknown>).note;
    out.push({ id, note: typeof note === "string" ? note : undefined, source: "optional" });
  }
  return out;
}

/** Run `pi install <id>`. Resolves true on exit 0, false otherwise. */
function runPiInstall(id: string, quiet: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("pi", ["install", id], { stdio: quiet ? "ignore" : "inherit" });
    child.on("error", (err) => {
      if (!quiet)
        console.error(color.red(`  pi install ${id} failed to start: ${err.message}`));
      resolve(false);
    });
    child.on("exit", (code) => resolve(code === 0));
  });
}

/** Check whether `pi` is on PATH. */
function hasPi(): boolean {
  try {
    return spawnSync("pi", ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

export async function installCommand(options: InstallOptions = {}): Promise<void> {
  const quiet = process.argv.includes("--quiet");

  if (!quiet) p.intro(color.bgCyan(color.black(" mdpi install ")));

  const piDir = options.piDir || join(process.cwd(), ".pi");
  if (!existsSync(piDir)) {
    if (!quiet) {
      p.log.error(".pi/ not found — run `mdpi init` first");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const core = readCorePackages(piDir);
  const optional = readOptionalPackages(piDir);

  // Scope selection: default = all; --core / --optional narrow it.
  const wantCore = options.core || (!options.core && !options.optional);
  const wantOptional = options.optional || (!options.core && !options.optional);
  const selected: KitPackage[] = [
    ...(wantCore ? core : []),
    ...(wantOptional ? optional : []),
  ];

  if (selected.length === 0) {
    if (!quiet) {
      p.log.warn("No packages declared (settings.json:packages empty and packages.json:optional empty)");
      p.outro("Nothing to do");
    }
    return;
  }

  // ── --check: dry-run report, no shell-out ──────────────────────────────
  if (options.check) {
    console.log(`\n${color.bold("mdpi install --check")} — declared packages\n`);
    const installed = selected.filter((pkg) => isInstalled(pkg.id));
    const missing = selected.filter((pkg) => !isInstalled(pkg.id));
    for (const pkg of selected) {
      const mark = isInstalled(pkg.id) ? color.green("✓ installed") : color.yellow("✗ missing");
      const note = pkg.note ? color.gray(` — ${pkg.note}`) : "";
      console.log(`  ${mark}  ${color.cyan(pkg.id)}${note}`);
    }
    console.log(
      `\n  ${color.green(`${installed.length}`)} installed · ${color.yellow(`${missing.length}`)} missing · ${selected.length} total`,
    );
    if (missing.length > 0) {
      console.log(`\n  Run ${color.cyan("mdpi install")} to install the missing ${missing.length} package(s).`);
    }
    if (!quiet) p.outro(missing.length === 0 ? color.green("All installed") : color.yellow("Some missing"));
    process.exitCode = missing.length === 0 ? 0 : 1;
    return;
  }

  // ── real install ───────────────────────────────────────────────────────
  if (!hasPi()) {
    if (!quiet) {
      p.log.error("`pi` not found on PATH — install pi first (npm i -g @earendil-works/pi-coding-agent)");
      p.outro(color.red("Failed"));
    }
    process.exitCode = 1;
    return;
  }

  const missing = selected.filter((pkg) => !isInstalled(pkg.id));
  const alreadyOk = selected.length - missing.length;

  if (!quiet && !options.yes) {
    const scope =
      wantCore && wantOptional ? "core + optional" : wantCore ? "core" : "optional";
    const confirm = await p.confirm({
      message: `Install ${missing.length} missing package(s) [${scope}]?${alreadyOk > 0 ? ` (${alreadyOk} already installed, skipped)` : ""}`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.outro("Cancelled");
      return;
    }
  }

  if (quiet) {
    console.log(`mdpi: installing ${missing.length}/${selected.length} packages (core=${wantCore} optional=${wantOptional})`);
  } else {
    p.log.info(`Installing ${missing.length} missing package(s) of ${selected.length} declared`);
  }

  let ok = 0;
  let fail = 0;
  for (const pkg of missing) {
    if (!quiet) p.log.step(`${color.cyan(pkg.id)}${pkg.note ? color.gray(` — ${pkg.note}`) : ""}`);
    const success = await runPiInstall(pkg.id, quiet);
    if (success) ok++;
    else fail++;
  }

  if (quiet) {
    console.log(`mdpi: done — ${ok} installed, ${fail} failed, ${alreadyOk} already present`);
  } else {
    p.note(
      `${ok} installed · ${fail} failed · ${alreadyOk} already present\n\n` +
        (fail > 0
          ? `${color.red("Some installs failed — check pi output above.")}\n`
          : `${color.green("All declared packages are now installed.")}\n`) +
        `Re-run anytime: ${color.cyan("mdpi install")} (idempotent).`,
      "Install complete",
    );
    p.outro(fail === 0 ? color.green("Ready!") : color.red("Partial failure"));
  }
  process.exitCode = fail === 0 ? 0 : 1;
}