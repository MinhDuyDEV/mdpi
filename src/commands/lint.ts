/**
 * mdpi lint — governance checks for the .pi/ kit.
 *
 * Adapted from OpenCodeKit's validation/ suite to pi conventions:
 *   - skill-lint: pi frontmatter (name + description required, NOT version/tags/
 *     dependencies which pi doesn't use), H1, When to Use / NOT to Use, line
 *     limits, references/ depth, and DEAD CROSS-REF detection (the bug class
 *     fixed manually in commit 0a20e46 — skills referencing non-existent skills).
 *   - docs-drift: .pi/README.md counts + slash-command refs vs actual content.
 *
 * Usage: mdpi lint [skills|docs|all] [--json]
 * Exit code: 1 if any error-severity issue, else 0.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import color from "picocolors";

// ── Types ───────────────────────────────────────────────────────────────
interface Issue {
  scope: string;
  rule: string;
  severity: "error" | "warning";
  message: string;
  fix?: string;
}
interface Result {
  ok: boolean;
  issues: Issue[];
  stats: { total: number; passed: number; failed: number; warnings: number };
}

// ── Constants (pi-adapted) ──────────────────────────────────────────────
const REQUIRED_FRONTMATTER = ["name", "description"] as const;
const MAX_LINES = 500;
const MAX_LINES_WARNING = 400;

// pi-native commands that READMEs legitimately reference but are NOT kit prompts.
// Exempt from the 'unknown-prompt' rule so we don't false-flag pi builtins.
const KNOWN_PI_BUILTINS = new Set([
  "reload", "skill", "memory", "agent", "agents", "clear", "compact", "new",
  "help", "exit", "quit", "model", "theme", "tools", "keys", "config", "ask",
  "dcp", "vcc", "observation", "session",
]);

export function parseFrontmatter(content: string): Record<string, unknown> | null {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fields: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      const [, key, value] = kv;
      fields[key] = value.replace(/^['"]|['"]$/g, "").trim();
    }
  }
  return fields;
}

export function skillDirNames(skillsDir: string): Set<string> {
  if (!existsSync(skillsDir)) return new Set();
  return new Set(
    readdirSync(skillsDir).filter(
      (n) => statSync(join(skillsDir, n)).isDirectory() && !n.startsWith("."),
    ),
  );
}

/** Extract skill names referenced in body: `/skill:<n>`, `skill:<n>`, `` `<n>` skill ``. */
export function findCrossRefs(content: string): string[] {
  const refs = new Set<string>();
  for (const m of content.matchAll(/(?:\/skill:|skill:)([a-z0-9][a-z0-9-]*)/g)) refs.add(m[1]);
  for (const m of content.matchAll(/`([a-z0-9][a-z0-9-]*)`\s+skill\b/g)) refs.add(m[1]);
  return [...refs];
}

function lintSkill(skillsDir: string, name: string, valid: Set<string>): Issue[] {
  const issues: Issue[] = [];
  const skillPath = join(skillsDir, name, "SKILL.md");
  if (!existsSync(skillPath)) {
    issues.push({
      scope: name,
      rule: "file-exists",
      severity: "error",
      message: "Missing SKILL.md",
      fix: "Create SKILL.md with name + description frontmatter",
    });
    return issues;
  }
  const content = readFileSync(skillPath, "utf-8");
  const lineCount = content.split("\n").length;

  if (lineCount > MAX_LINES)
    issues.push({
      scope: name,
      rule: "max-lines",
      severity: "error",
      message: `${lineCount} lines (max ${MAX_LINES}); move detail to references/`,
      fix: "Extract examples/patterns to references/",
    });
  else if (lineCount > MAX_LINES_WARNING)
    issues.push({
      scope: name,
      rule: "max-lines-warn",
      severity: "warning",
      message: `${lineCount} lines (warn ${MAX_LINES_WARNING})`,
    });

  const fm = parseFrontmatter(content);
  if (!fm)
    issues.push({
      scope: name,
      rule: "frontmatter",
      severity: "error",
      message: "Missing YAML frontmatter (--- … ---)",
      fix: "Add frontmatter with name + description",
    });
  else {
    for (const f of REQUIRED_FRONTMATTER)
      if (!(f in fm) || !fm[f])
        issues.push({
          scope: name,
          rule: `frontmatter-${f}`,
          severity: "error",
          message: `Missing frontmatter field: ${f}`,
          fix: `Add '${f}:'`,
        });
    const nm = fm.name;
    if (typeof nm === "string" && nm !== name)
      issues.push({
        scope: name,
        rule: "name-match",
        severity: "warning",
        message: `frontmatter name '${nm}' ≠ directory '${name}'`,
      });
  }

  if (!/^#\s+\S/m.test(content))
    issues.push({
      scope: name,
      rule: "h1",
      severity: "error",
      message: "Missing H1 title",
      fix: "Add '# Title' after frontmatter",
    });
  if (!/^##\s+When\s+to\s+Use/im.test(content))
    issues.push({
      scope: name,
      rule: "when-to-use",
      severity: "warning",
      message: "Missing '## When to Use'",
    });
  if (!/^##\s+When\s+NOT\s+to\s+Use/im.test(content))
    issues.push({
      scope: name,
      rule: "when-not-to-use",
      severity: "warning",
      message: "Missing '## When NOT to Use'",
    });

  // dead cross-refs — the high-value pi-specific rule
  for (const ref of findCrossRefs(content)) {
    if (!valid.has(ref))
      issues.push({
        scope: name,
        rule: "dead-cross-ref",
        severity: "error",
        message: `references skill '${ref}' which does not exist in .pi/skills/`,
        fix: `Remove the reference or add skill '${ref}'`,
      });
  }

  // references/ depth (prefer flat)
  const refsDir = join(skillsDir, name, "references");
  if (existsSync(refsDir)) {
    const nested = readdirSync(refsDir).filter((e) => statSync(join(refsDir, e)).isDirectory());
    if (nested.length)
      issues.push({
        scope: name,
        rule: "refs-depth",
        severity: "warning",
        message: `${nested.length} nested dir(s) in references/ — prefer flat`,
        fix: "Flatten references/ to one level",
      });
  }

  return issues;
}

export function lintSkills(piDir: string): Result {
  const skillsDir = join(piDir, "skills");
  if (!existsSync(skillsDir))
    return {
      ok: false,
      issues: [
        {
          scope: "(root)",
          rule: "skills-dir",
          severity: "error",
          message: `skills/ not found: ${skillsDir}`,
        },
      ],
      stats: { total: 0, passed: 0, failed: 0, warnings: 0 },
    };
  const valid = skillDirNames(skillsDir);
  const names = [...valid].sort();
  const issues: Issue[] = [];
  let failed = 0;
  let warns = 0;
  for (const n of names) {
    const si = lintSkill(skillsDir, n, valid);
    issues.push(...si);
    if (si.some((i) => i.severity === "error")) failed++;
    warns += si.filter((i) => i.severity === "warning").length;
  }
  return {
    ok: failed === 0,
    issues,
    stats: { total: names.length, passed: names.length - failed, failed, warnings: warns },
  };
}

export function lintDocs(piDir: string): Result {
  const readmePath = join(piDir, "README.md");
  if (!existsSync(readmePath))
    return { ok: true, issues: [], stats: { total: 0, passed: 0, failed: 0, warnings: 0 } };
  const readme = readFileSync(readmePath, "utf-8");
  const issues: Issue[] = [];

  const list = (sub: string) =>
    existsSync(join(piDir, sub))
      ? readdirSync(join(piDir, sub)).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [];
  const actualPrompts = list("prompts").filter((n) => n !== "INDEX").sort();
  const actualAgents = list("agents").filter((n) => n !== "INDEX").length;
  const actualSkills = existsSync(join(piDir, "skills"))
    ? readdirSync(join(piDir, "skills")).filter((n) => statSync(join(piDir, "skills", n)).isDirectory())
        .length
    : 0;
  const actualWorkflows = list("workflows").filter((n) => n !== "INDEX").length;
  const actualTemplates = list("templates").filter((n) => n !== "INDEX").length;

  // slash-command refs in README vs actual prompts
  const documented = new Set<string>();
  for (const m of readme.matchAll(/`\/([a-z0-9-]+)`/g)) documented.add(m[1]);
  for (const cmd of actualPrompts)
    if (!documented.has(cmd))
      issues.push({
        scope: "README",
        rule: "readme-missing-prompt",
        severity: "warning",
        message: `README missing '/${cmd}' (prompt exists)`,
      });
  for (const cmd of documented)
    if (!actualPrompts.includes(cmd) && !KNOWN_PI_BUILTINS.has(cmd))
      issues.push({
        scope: "README",
        rule: "readme-unknown-prompt",
        severity: "warning",
        message: `README references unknown '/${cmd}'`,
      });

  // count claims vs reality
  // Match the README kit-summary format: `label/` (N) or `label/` (N + INDEX).
  // Allows any non-(/non-newline chars between label and the count paren,
  // so backtick-wrapped paths like `agents/` (7) are matched. Captures the
  // first integer inside the parens (ignoring " + INDEX" suffixes).
  const countCheck = (label: string, actual: number) => {
    const m = readme.match(new RegExp(`\\b${label}s?[^\\(\\n]*\\((\\d+)[^)]*\\)`));
    if (m) {
      const doc = Number.parseInt(m[1], 10);
      if (doc !== actual)
        issues.push({
          scope: "README",
          rule: `count-${label}`,
          severity: "warning",
          message: `${label} count (${doc}) ≠ actual (${actual})`,
          fix: `Update README ${label} count to ${actual}`,
        });
    }
  };
  countCheck("skill", actualSkills);
  countCheck("prompt", actualPrompts.length);
  countCheck("agent", actualAgents);
  countCheck("workflow", actualWorkflows);
  countCheck("template", actualTemplates);

  return {
    ok: issues.length === 0,
    issues,
    stats: { total: 1, passed: issues.length === 0 ? 1 : 0, failed: 0, warnings: issues.length },
  };
}

export interface LintOptions {
  target?: "skills" | "docs" | "all";
  json?: boolean;
}

export function lintAll(piDir: string, opts: LintOptions = {}): void {
  const target = opts.target ?? "all";
  const results: { name: string; r: Result }[] = [];
  if (target === "skills" || target === "all") results.push({ name: "skills", r: lintSkills(piDir) });
  if (target === "docs" || target === "all") results.push({ name: "docs", r: lintDocs(piDir) });

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
    const anyFail = results.some(({ r }) => !r.ok);
    process.exitCode = anyFail ? 1 : 0;
    return;
  }

  for (const { name, r } of results) {
    console.log(
      `\n${color.bold(color.cyan(name))}: ${r.stats.total} total · ${r.stats.passed} passed · ${r.stats.failed} failed · ${r.stats.warnings} warnings`,
    );
    const byScope = new Map<string, Issue[]>();
    for (const i of r.issues) {
      const a = byScope.get(i.scope) ?? [];
      a.push(i);
      byScope.set(i.scope, a);
    }
    for (const [scope, iss] of byScope) {
      const hasErr = iss.some((i) => i.severity === "error");
      console.log(`  ${hasErr ? color.red("✗") : color.yellow("⚠")} ${scope}`);
      for (const i of iss) {
        console.log(
          `    ${i.severity === "error" ? color.red("ERR ") : color.yellow("WARN")} [${i.rule}] ${i.message}`,
        );
        if (i.fix) console.log(`         fix: ${i.fix}`);
      }
    }
  }
  const anyFail = results.some(({ r }) => !r.ok);
  process.exitCode = anyFail ? 1 : 0;
}