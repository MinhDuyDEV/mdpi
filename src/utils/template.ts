/** Shared template + version helpers used by init / upgrade / doctor. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SKIP_DIRS = ["node_modules", ".git", "dist", "coverage", ".next", ".turbo"];

/** Resolve the bundled template root: dist/template (published) or repo root (dev tsx). */
export function getTemplateRoot(): string | null {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(__dirname, "template"), join(__dirname, "..", "..")];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, ".pi"))) return candidate;
  }
  return null;
}

/** Resolve the mdpi package version (inlined by tsdown from package.json at build). */
export function getPackageVersion(): string {
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

/** Walk a directory recursively → relative file paths (excludes skipDirs + skipFiles). */
export function listFilesRel(
  dir: string,
  skipDirs: string[] = DEFAULT_SKIP_DIRS,
  skipFiles: string[] = [],
): string[] {
  const out: string[] = [];
  function walk(d: string): void {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (skipDirs.includes(e.name)) continue;
        walk(join(d, e.name));
      } else if (e.isFile()) {
        if (skipFiles.includes(e.name)) continue;
        out.push(relative(dir, join(d, e.name)));
      }
    }
  }
  walk(dir);
  return out;
}