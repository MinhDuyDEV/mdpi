import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { destPath, skeleton, titleCase, validName, newCommand, type NewKind } from "../src/commands/new.js";
import { lintSkills } from "../src/commands/lint.js";

let dir: string;
let origArgv: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-new-"));
  origArgv = process.argv;
  process.exitCode = 0;
});

afterEach(() => {
  process.argv = origArgv;
  process.chdir(join(tmpdir())); // leave the temp dir before rmSync
  rmSync(dir, { recursive: true, force: true });
});

describe("validName", () => {
  it("accepts kebab-case names", () => {
    for (const n of ["foo", "my-skill", "a-b-c", "skill1", "abc123"]) expect(validName(n)).toBe(true);
  });
  it("rejects non-kebab names", () => {
    for (const n of ["Bad", "bad-", "-bad", "bad--name", "", "1bad", "with_underscore", "UPPER"]) {
      expect(validName(n)).toBe(false);
    }
  });
});

describe("titleCase", () => {
  it("converts kebab to Title Case", () => {
    expect(titleCase("my-skill")).toBe("My Skill");
    expect(titleCase("foo")).toBe("Foo");
    expect(titleCase("root-cause-tracing")).toBe("Root Cause Tracing");
  });
});

describe("destPath", () => {
  it("routes each kind to the right path", () => {
    const pi = "/repo/.pi";
    expect(destPath(pi, "skill", "foo")).toBe(join(pi, "skills", "foo", "SKILL.md"));
    expect(destPath(pi, "prompt", "foo")).toBe(join(pi, "prompts", "foo.md"));
    expect(destPath(pi, "agent", "foo")).toBe(join(pi, "agents", "foo.md"));
    expect(destPath(pi, "workflow", "foo")).toBe(join(pi, "workflows", "foo.md"));
    expect(destPath(pi, "template", "foo")).toBe(join(pi, "templates", "foo.md"));
  });
});

describe("skeleton", () => {
  it("skill: passes lint-shaped frontmatter + sections", () => {
    const s = skeleton("skill", "my-skill", "demo desc");
    expect(s).toContain("name: my-skill");
    expect(s).toContain("description: demo desc");
    expect(s).toContain("# My Skill");
    expect(s).toContain("## When to Use");
    expect(s).toContain("## When NOT to Use");
  });

  it("prompt: has $ARGUMENTS + argument-hint + table", () => {
    const s = skeleton("prompt", "fix-thing", "fix a thing");
    expect(s).toContain("description: fix a thing");
    expect(s).toContain("argument-hint:");
    expect(s).toContain("# Fix Thing: $ARGUMENTS");
    expect(s).toContain("## Parse Arguments");
  });

  it("agent: has name + tools + model frontmatter", () => {
    const s = skeleton("agent", "my-agent", "demo");
    expect(s).toContain("name: my-agent");
    expect(s).toContain("tools:");
    expect(s).toContain("model:");
    expect(s).toContain("# My Agent");
  });

  it("workflow: has Phases + Phase 1 DAG block", () => {
    const s = skeleton("workflow", "my-workflow", "demo");
    expect(s).toContain("description: demo");
    expect(s).toContain("# my-workflow");
    expect(s).toContain("## Phases");
    expect(s).toContain("### Phase 1");
    expect(s).toContain("**Agent:**");
    expect(s).toContain("**Depends on:**");
  });

  it("template: has Template header + instructions", () => {
    const s = skeleton("template", "prd", "demo");
    expect(s).toContain("# Prd Template");
    expect(s).toContain("Template Instructions");
  });

  it("falls back to a TODO description when none provided", () => {
    expect(skeleton("skill", "x", "")).toContain("TODO: when to use this skill");
    expect(skeleton("prompt", "x", "")).toContain("TODO: when to use this prompt");
  });
});

/** Build a minimal .pi/ so newCommand's `.pi/ not found` guard passes. */
function minimalPi(root: string): string {
  mkdirSync(join(root, ".pi"), { recursive: true });
  writeFileSync(join(root, ".pi", "settings.json"), "{}");
  return join(root, ".pi");
}

describe("newCommand (integration via chdir)", () => {
  it("scaffolds a skill that immediately passes lint", async () => {
    minimalPi(dir);
    process.chdir(dir);
    process.argv = ["node", "mdpi", "new", "skill", "demo-skill", "--quiet"];
    await newCommand("skill", "demo-skill", { description: "demo" });
    const skillPath = join(dir, ".pi", "skills", "demo-skill", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);
    const r = lintSkills(join(dir, ".pi"));
    expect(r.stats.failed).toBe(0);
    // name-match + frontmatter + H1 + When to Use/NOT all present → no error-severity issues
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("refuses to overwrite without --force; overwrites with --force", async () => {
    minimalPi(dir);
    process.chdir(dir);
    process.argv = ["node", "mdpi", "new", "prompt", "p", "--quiet"];
    await newCommand("prompt", "p");
    const dest = join(dir, ".pi", "prompts", "p.md");
    const first = readFileSync(dest, "utf-8");
    // second call without --force is a no-op (preserves original)
    await newCommand("prompt", "p");
    expect(readFileSync(dest, "utf-8")).toBe(first);
    // --force overwrites
    await newCommand("prompt", "p", { force: true, description: "changed" });
    const after = readFileSync(dest, "utf-8");
    expect(after).not.toBe(first);
    expect(after).toContain("changed");
  });

  it("rejects an invalid kind (exitCode 1)", async () => {
    minimalPi(dir);
    process.chdir(dir);
    process.argv = ["node", "mdpi", "new", "widget", "x", "--quiet"];
    await newCommand("widget", "x");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid name (exitCode 1)", async () => {
    minimalPi(dir);
    process.chdir(dir);
    process.argv = ["node", "mdpi", "new", "skill", "Bad_Name", "--quiet"];
    await newCommand("skill", "Bad_Name");
    expect(process.exitCode).toBe(1);
  });

  it("errors when .pi/ is missing (exitCode 1)", async () => {
    process.chdir(dir); // no .pi here
    process.argv = ["node", "mdpi", "new", "skill", "x", "--quiet"];
    await newCommand("skill", "x");
    expect(process.exitCode).toBe(1);
  });
});