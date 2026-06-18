import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { adaptSettingsJson, parseOnly, CATEGORIES } from "../src/commands/init.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-init-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("parseOnly", () => {
  it("returns null when --only is undefined (full install)", () => {
    expect(parseOnly(undefined)).toBeNull();
  });

  it("parses a comma-separated category list into a Set", () => {
    const s = parseOnly("skills,templates");
    expect(s).not.toBeNull();
    expect([...s!].sort()).toEqual(["skills", "templates"]);
  });

  it("trims whitespace around categories", () => {
    const s = parseOnly(" skills , templates , agents ");
    expect([...s!].sort()).toEqual(["agents", "skills", "templates"]);
  });

  it("throws on an unknown category", () => {
    expect(() => parseOnly("widgets")).toThrow(/unknown --only category 'widgets'/);
    expect(() => parseOnly("skills,oops")).toThrow(/unknown --only category 'oops'/);
  });

  it("accepts every documented category", () => {
    const s = parseOnly(CATEGORIES.join(","));
    expect(s!.size).toBe(CATEGORIES.length);
  });

  it("treats an empty string as no filter (full install)", () => {
    expect(parseOnly("")).toBeNull();
  });
});

describe("adaptSettingsJson", () => {
  function writeSettings(json: string): string {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    writeFileSync(join(dir, ".pi", "settings.json"), json);
    return join(dir, ".pi");
  }

  const FULL = JSON.stringify({
    $schema: "https://pi.dev/schema/settings.json",
    packages: ["npm:pi-srcwalk"],
    skills: ["./skills"],
    prompts: ["./prompts"],
    extensions: ["./extensions/x.ts"],
    enableSkillCommands: true,
  });

  it("removes skills/prompts/extensions keys for excluded categories", () => {
    const piDir = writeSettings(FULL);
    const only = new Set(["agents"] as const); // none of skills/prompts/extensions
    const changed = adaptSettingsJson(piDir, only as Set<"skills">);
    expect(changed).toBe(true);
    const after = JSON.parse(existsSync(join(piDir, "settings.json")) ? readFile(piDir) : "{}");
    expect(after.skills).toBeUndefined();
    expect(after.prompts).toBeUndefined();
    expect(after.extensions).toBeUndefined();
    // packages + enableSkillCommands preserved
    expect(after.packages).toEqual(["npm:pi-srcwalk"]);
    expect(after.enableSkillCommands).toBe(true);
  });

  it("keeps a key when its category is included", () => {
    const piDir = writeSettings(FULL);
    const only = new Set(["skills", "extensions"] as const) as Set<"skills">;
    adaptSettingsJson(piDir, only);
    const after = JSON.parse(readFile(piDir));
    expect(after.skills).toEqual(["./skills"]); // kept
    expect(after.extensions).toEqual(["./extensions/x.ts"]); // kept
    expect(after.prompts).toBeUndefined(); // prompts excluded
  });

  it("is a no-op (returns false) when all three categories are included", () => {
    const piDir = writeSettings(FULL);
    const only = new Set(["skills", "prompts", "extensions"] as const) as Set<"skills">;
    const before = readFile(piDir);
    expect(adaptSettingsJson(piDir, only)).toBe(false);
    expect(readFile(piDir)).toBe(before);
  });

  it("returns false when settings.json is missing", () => {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    expect(adaptSettingsJson(join(dir, ".pi"), new Set())).toBe(false);
  });

  it("returns false on invalid JSON (leaves the file untouched)", () => {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    const path = join(dir, ".pi", "settings.json");
    writeFileSync(path, "{not json");
    expect(adaptSettingsJson(join(dir, ".pi"), new Set(["agents"] as const) as Set<"skills">)).toBe(false);
    // file still contains the invalid JSON (not overwritten)
    expect(existsSync(path)).toBe(true);
  });
});

/** Read settings.json from a kit dir. */
function readFile(piDir: string): string {
  return readFileSync(join(piDir, "settings.json"), "utf-8");
}