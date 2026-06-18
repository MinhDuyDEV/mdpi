#!/usr/bin/env node
/**
 * Bundle the curated .pi/ kit into dist/template/.pi/ for `mdpi init`.
 *
 * Only the curated kit deliverable is shipped. Runtime/derived dirs that have
 * accumulated in the dev .pi/ (npm/, memory/, state/, tasks/, artifacts/) are
 * NEVER bundled — they are pi runtime state, not part of the distributable kit.
 *
 * Run via: npm run build (after tsdown).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcPi = join(root, ".pi");
const destPi = join(root, "dist", "template", ".pi");

// ── Curated kit deliverable (the distributable set) ────────────────────
// dirs: the kit's content categories; files: top-level kit config/docs.
// Anything NOT in this list under .pi/ is treated as runtime/derived and skipped.
const INCLUDES = [
  "agents",
  "prompts",
  "skills",
  "templates",
  "workflows",
  "context",
  "extensions",
  "scripts",
  "settings.json",
  "AGENTS.md",
  "README.md",
  "QUALITY.md",
  "VERSION",
  ".env.example",
  "guard.example.json",
  "subagents.json",
];

if (!existsSync(srcPi)) {
  console.error(`bundle-template: source .pi/ not found at ${srcPi}`);
  process.exit(1);
}

rmSync(destPi, { recursive: true, force: true });
mkdirSync(destPi, { recursive: true });

let copied = 0;
let missing = 0;
for (const entry of INCLUDES) {
  const from = join(srcPi, entry);
  if (!existsSync(from)) {
    console.warn(`bundle-template: SKIP missing entry: ${entry}`);
    missing++;
    continue;
  }
  cpSync(from, join(destPi, entry), { recursive: true });
  copied++;
}

console.log(
  `bundle-template: copied ${copied}/${INCLUDES.length} entries → dist/template/.pi/` +
    (missing ? ` (${missing} missing)` : ""),
);

// Sanity: refuse to ship if the big four kit dirs are absent.
for (const required of ["agents", "prompts", "skills", "settings.json"]) {
  if (!existsSync(join(destPi, required))) {
    console.error(`bundle-template: FATAL — required entry missing from bundle: ${required}`);
    process.exit(1);
  }
}