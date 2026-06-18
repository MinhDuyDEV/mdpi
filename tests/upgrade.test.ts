import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateManifest, type TemplateManifest } from "../src/utils/manifest.js";
import { classifyFiles, findOrphans } from "../src/commands/upgrade.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-up-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Build an installed kit snapshot: write files + generate a manifest at version v. */
function snapshot(files: Record<string, string>, v = "1.0.0"): TemplateManifest {
  for (const [rel, content] of Object.entries(files)) write(rel, content);
  return generateManifest(dir, v);
}

/** Write a file under the temp kit dir, creating parent dirs as needed. */
function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

describe("classifyFiles — with a manifest", () => {
  it("unmodified files → toUpdate", () => {
    const m = snapshot({ "agents/a.md": "orig", "skills/s/SKILL.md": "# s" });
    const { toUpdate, toAdd, preserved } = classifyFiles(
      ["agents/a.md", "skills/s/SKILL.md"],
      dir,
      m,
      false,
    );
    expect(toUpdate).toEqual(expect.arrayContaining(["agents/a.md", "skills/s/SKILL.md"]));
    expect(toAdd).toEqual([]);
    expect(preserved).toEqual([]);
  });

  it("modified files → preserved (no force); → toUpdate (force)", () => {
    const m = snapshot({ "agents/a.md": "orig" });
    // user edits the file after install
    writeFileSync(join(dir, "agents/a.md"), "EDITED");
    expect(m.files["agents/a.md"]).not.toBe(undefined); // sanity: tracked in manifest

    const keep = classifyFiles(["agents/a.md"], dir, m, false);
    expect(keep.toUpdate).toEqual([]);
    expect(keep.preserved).toEqual(["agents/a.md"]);

    const force = classifyFiles(["agents/a.md"], dir, m, true);
    expect(force.toUpdate).toEqual(["agents/a.md"]);
    expect(force.preserved).toEqual([]);
  });

  it("unknown files (in template, not in manifest) → toAdd", () => {
    const m = snapshot({ "agents/a.md": "orig" }); // only a.md tracked
    // a NEW template file the manifest doesn't know about
    write("prompts/new.md", "new");
    const { toAdd, toUpdate, preserved } = classifyFiles(
      ["agents/a.md", "prompts/new.md"],
      dir,
      m,
      false,
    );
    expect(toAdd).toEqual(["prompts/new.md"]);
    expect(toUpdate).toEqual(["agents/a.md"]); // a.md unmodified
    expect(preserved).toEqual([]);
  });
});

describe("classifyFiles — no manifest", () => {
  it("preserves everything by default (can't detect user edits)", () => {
    write("agents/a.md", "x");
    const { toUpdate, toAdd, preserved } = classifyFiles(["agents/a.md"], dir, null, false);
    expect(toUpdate).toEqual([]);
    expect(toAdd).toEqual([]);
    expect(preserved).toEqual(["agents/a.md"]);
  });

  it("force overwrites everything when there is no manifest", () => {
    write("agents/a.md", "x");
    const { toUpdate, toAdd, preserved } = classifyFiles(["agents/a.md"], dir, null, true);
    // force + no manifest routes to toAdd (the "unknown + force" branch)
    expect(toAdd).toEqual(["agents/a.md"]);
    expect(toUpdate).toEqual([]);
    expect(preserved).toEqual([]);
  });
});

describe("classifyFiles — deleted file edge", () => {
  it("a tracked file that was deleted counts as unmodified → toUpdate (re-create)", () => {
    const m = snapshot({ "agents/a.md": "orig" });
    // delete the file (user removed it). fileModificationStatus treats deleted as unmodified.
    rmSync(join(dir, "agents/a.md"));
    const { toUpdate } = classifyFiles(["agents/a.md"], dir, m, false);
    expect(toUpdate).toEqual(["agents/a.md"]);
  });
});

describe("findOrphans", () => {
  it("returns [] when there is no manifest", () => {
    expect(findOrphans(["a.md"], ["b.md"], null)).toEqual([]);
  });

  it("flags manifest-tracked files absent from the new template (template-removed)", () => {
    const m = snapshot({ "skills/old/SKILL.md": "x", "skills/keep/SKILL.md": "y" });
    // new template dropped skills/old but keeps skills/keep
    const orphans = findOrphans(
      ["skills/old/SKILL.md", "skills/keep/SKILL.md"],
      ["skills/keep/SKILL.md"],
      m,
    );
    expect(orphans).toEqual(["skills/old/SKILL.md"]);
  });

  it("never flags .version (mdpi-managed, regenerated each upgrade)", () => {
    const m = snapshot({ "agents/a.md": "x" });
    // pretend .version was tracked in manifest + is installed but not in new template
    m.files[".version"] = "deadbeef";
    write(".version", "1.0.0");
    const orphans = findOrphans(["agents/a.md", ".version"], ["agents/a.md"], m);
    expect(orphans).toEqual([]);
  });

  it("ignores installed files that were never tracked in the manifest (user-added)", () => {
    const m = snapshot({ "agents/a.md": "x" });
    // user added skills/myown/SKILL.md (not in manifest), and new template lacks it
    write("skills/myown/SKILL.md", "mine");
    const orphans = findOrphans(
      ["agents/a.md", "skills/myown/SKILL.md"],
      ["agents/a.md"],
      m,
    );
    expect(orphans).toEqual([]); // user-added, not a template orphan
  });
});