import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findCrossRefs, lintDocs, parseFrontmatter, skillDirNames } from "../src/commands/lint.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-lint-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("parseFrontmatter", () => {
  it("parses name + description fields", () => {
    const fm = parseFrontmatter("---\nname: foo\ndescription: bar\n---\n# Title");
    expect(fm).toEqual({ name: "foo", description: "bar" });
  });

  it("strips surrounding quotes from values", () => {
    const fm = parseFrontmatter('---\nname: "foo"\ndescription: \'bar baz\'\n---\n');
    expect(fm).toEqual({ name: "foo", description: "bar baz" });
  });

  it("returns null when there is no frontmatter block", () => {
    expect(parseFrontmatter("# just a title\nbody")).toBeNull();
  });

  it("returns {} for an empty frontmatter block (blank line between fences)", () => {
    expect(parseFrontmatter("---\n\n---\nbody")).toEqual({});
  });

  it("returns null when the closing fence is not on its own line", () => {
    expect(parseFrontmatter("---\n---\nbody")).toBeNull();
  });
});

describe("findCrossRefs", () => {
  it("extracts /skill:<name> references", () => {
    expect(findCrossRefs("use /skill:foo and /skill:bar-baz")).toEqual(
      expect.arrayContaining(["foo", "bar-baz"]),
    );
  });

  it("extracts skill:<name> references", () => {
    expect(findCrossRefs("load skill:qux here")).toEqual(["qux"]);
  });

  it("extracts `<name>` skill references", () => {
    expect(findCrossRefs("the `tdd` skill is required")).toEqual(["tdd"]);
  });

  it("returns empty array when there are no references", () => {
    expect(findCrossRefs("no skills mentioned here")).toEqual([]);
  });

  it("deduplicates references", () => {
    const refs = findCrossRefs("/skill:foo and /skill:foo and skill:foo");
    expect(refs).toEqual(["foo"]);
  });
});

describe("skillDirNames", () => {
  it("returns skill directory names", () => {
    mkdirSync(join(dir, "skills", "foo"), { recursive: true });
    mkdirSync(join(dir, "skills", "bar"), { recursive: true });
    writeFileSync(join(dir, "skills", "loose.md"), "x"); // a file, not a dir
    const names = skillDirNames(join(dir, "skills"));
    expect([...names].sort()).toEqual(["bar", "foo"]);
  });

  it("excludes dotfile directories", () => {
    mkdirSync(join(dir, "skills", ".hidden"), { recursive: true });
    mkdirSync(join(dir, "skills", "visible"), { recursive: true });
    const names = skillDirNames(join(dir, "skills"));
    expect([...names]).toEqual(["visible"]);
  });

  it("returns empty set for a missing dir", () => {
    expect(skillDirNames(join(dir, "nope")).size).toBe(0);
  });
});

/** Build a minimal .pi/ with the given README + category counts for lintDocs. */
function buildKit(opts: {
  readme: string;
  agents?: string[];
  prompts?: string[];
  workflows?: string[];
  templates?: string[];
  skills?: string[];
}): string {
  mkdirSync(join(dir, ".pi"), { recursive: true });
  writeFileSync(join(dir, ".pi", "README.md"), opts.readme);
  for (const [cat, files] of Object.entries({
    agents: opts.agents,
    prompts: opts.prompts,
    workflows: opts.workflows,
    templates: opts.templates,
    skills: opts.skills,
  })) {
    if (!files) continue;
    mkdirSync(join(dir, ".pi", cat), { recursive: true });
    for (const f of files) {
      if (cat === "skills") {
        mkdirSync(join(dir, ".pi", cat, f), { recursive: true });
        writeFileSync(join(dir, ".pi", cat, f, "SKILL.md"), `---\nname: ${f}\ndescription: x\n---\n# ${f}`);
      } else {
        writeFileSync(join(dir, ".pi", cat, `${f}.md`), `# ${f}`);
      }
    }
  }
  return join(dir, ".pi");
}

describe("lintDocs — countCheck (the drift bug fix)", () => {
  it("passes when README counts match actual (backtick-wrapped `label/` (N) format)", () => {
    const piDir = buildKit({
      readme:
        "## What's in the kit\n`agents/` (2) · `prompts/` (3) · `skills/` (2) · `templates/` (1) · `workflows/` (2)\n\n## Commands\n`/p1` `/p2` `/p3`\n",
      agents: ["a", "b"],
      prompts: ["p1", "p2", "p3"],
      skills: ["s1", "s2"],
      templates: ["t"],
      workflows: ["w1", "w2"],
    });
    const r = lintDocs(piDir);
    // countCheck is what we're verifying: no count-* issues when counts match.
    expect(r.issues.filter((i) => i.rule.startsWith("count-"))).toEqual([]);
    // and no missing/unknown-prompt issues either (README documents all prompts).
    expect(r.issues.filter((i) => i.rule.startsWith("readme-"))).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("flags drifted counts (the bug the old regex silently missed)", () => {
    // README claims counts that all differ from actual.
    const piDir = buildKit({
      readme:
        "## What's in the kit\n`agents/` (7) · `prompts/` (9) · `skills/` (67) · `templates/` (10) · `workflows/` (5)\n\n## Commands\n`/p1` `/p2`\n",
      agents: ["a"],
      prompts: ["p1", "p2"], // actual 2, README claims 9
      skills: ["s1"], // actual 1, README claims 67
      templates: ["t"], // actual 1, README claims 10
      workflows: ["w1"], // actual 1, README claims 5
    });
    const r = lintDocs(piDir);
    const countRules = r.issues.filter((i) => i.rule.startsWith("count-")).map((i) => i.rule);
    // every drifted count is flagged (the old regex matched none of these).
    expect(countRules).toEqual(
      expect.arrayContaining([
        "count-agent",
        "count-prompt",
        "count-skill",
        "count-template",
        "count-workflow",
      ]),
    );
  });

  it("parses the `skills/` (67 + INDEX) form — captures the leading integer", () => {
    const piDir = buildKit({
      readme: "## What's in the kit\n`skills/` (2 + INDEX)\n",
      skills: ["s1", "s2"],
    });
    const r = lintDocs(piDir);
    expect(r.issues.filter((i) => i.rule === "count-skill")).toEqual([]);
  });
});

describe("lintDocs — prompt reference drift", () => {
  it("warns when a prompt exists but README doesn't document `/prompt`", () => {
    const piDir = buildKit({
      readme: "## Commands\nno slash commands listed\n",
      prompts: ["fix", "init"],
    });
    const r = lintDocs(piDir);
    const missing = r.issues.filter((i) => i.rule === "readme-missing-prompt");
    expect(missing.map((i) => i.message).sort()).toEqual([
      "README missing '/fix' (prompt exists)",
      "README missing '/init' (prompt exists)",
    ]);
  });

  it("does NOT flag pi builtins referenced in README (reload, skill, memory, …)", () => {
    const piDir = buildKit({
      readme: "Commands: `/reload` `/skill` `/memory` `/compact`\n",
      prompts: [],
    });
    const r = lintDocs(piDir);
    const unknown = r.issues.filter((i) => i.rule === "readme-unknown-prompt");
    expect(unknown).toEqual([]);
  });
});