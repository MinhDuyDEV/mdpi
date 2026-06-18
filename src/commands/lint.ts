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
 * Usage: mdpi lint [skills|docs|all] [--json] [--fix]
 *   --fix auto-applies the safely-fixable rules:
 *     - name-match   → set frontmatter `name:` to the skill directory name
 *     - count-*      → rewrite the README kit-summary counts to match reality
 *   Non-fixable rules (dead-cross-ref, missing H1/frontmatter, missing/unknown
 *   prompt refs, max-lines, refs-depth) are still reported.
 * Exit code: 1 if any error-severity issue remains, else 0.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
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
  stats: { total: number; passed: number; failed: number; warnings: number; fixed: number };
}

// ── Constants (pi-adapted) ──────────────────────────────────────────────
const REQUIRED_FRONTMATTER = ["name", "description"] as const;
const MAX_LINES = 500;
const MAX_LINES_WARNING = 400;

/** Kit categories whose README "(N)" counts are verified + auto-fixable. */
const COUNT_LABELS = ["skill", "prompt", "agent", "workflow", "template"] as const;

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

/** Lint one skill. With `fix=true`, rewrites the frontmatter `name:` to match the dir. */
function lintSkill(skillsDir: string, name: string, valid: Set<string>, fix: boolean): {
  issues: Issue[];
  fixed: number;
} {
  const issues: Issue[] = [];
  let fixed = 0;
  const skillPath = join(skillsDir, name, "SKILL.md");
  if (!existsSync(skillPath)) {
    issues.push({
      scope: name,
      rule: "file-exists",
      severity: "error",
      message: "Missing SKILL.md",
      fix: "Create SKILL.md with name + description frontmatter",
    });
    return { issues, fixed };
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
    if (typeof nm === "string" && nm !== name) {
      if (fix) {
        // Rewrite the `name:` line inside the frontmatter block only.
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const fmBody = fmMatch[1].replace(/^(\s*name:\s*).*$/m, `$1${name}`);
          if (fmBody !== fmMatch[1]) {
            writeFileSync(skillPath, content.replace(fmMatch[0], `---\n${fmBody}\n---`));
            fixed++;
          }
        }
      } else {
        issues.push({
          scope: name,
          rule: "name-match",
          severity: "warning",
          message: `frontmatter name '${nm}' ≠ directory '${name}'`,
          fix: `Set frontmatter name: ${name} (or run: mdpi lint --fix)`,
        });
      }
    }
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

  return { issues, fixed };
}

export function lintSkills(piDir: string, fix = false): Result {
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
      stats: { total: 0, passed: 0, failed: 0, warnings: 0, fixed: 0 },
    };
  const valid = skillDirNames(skillsDir);
  const names = [...valid].sort();
  const issues: Issue[] = [];
  let failed = 0;
  let warns = 0;
  let fixed = 0;
  for (const n of names) {
    const si = lintSkill(skillsDir, n, valid, fix);
    issues.push(...si.issues);
    if (si.issues.some((i) => i.severity === "error")) failed++;
    warns += si.issues.filter((i) => i.severity === "warning").length;
    fixed += si.fixed;
  }
  return {
    ok: failed === 0,
    issues,
    stats: { total: names.length, passed: names.length - failed, failed, warnings: warns, fixed },
  };
}

/**
 * Rewrite the README kit-summary counts to match reality. For each label, finds
 * the first `` `label/` (N…) `` form and replaces N with the actual count,
 * preserving any suffix (e.g. ` + INDEX`). Only matches the backtick-wrapped
 * kit-summary form — leaves prose mentions of counts untouched.
 */
export function fixReadmeCounts(readme: string, counts: Record<string, number>): string {
  let out = readme;
  for (const [label, actual] of Object.entries(counts)) {
    const re = new RegExp("(`" + label + "s?/?`\\s*\\()(\\d+)([^)]*\\))");
    out = out.replace(re, (_m, pre: string, _n: string, suf: string) => `${pre}${actual}${suf}`);
  }
  return out;
}

export function lintDocs(piDir: string, fix = false): Result {
  const readmePath = join(piDir, "README.md");
  if (!existsSync(readmePath))
    return {
      ok: true,
      issues: [],
      stats: { total: 0, passed: 0, failed: 0, warnings: 0, fixed: 0 },
    };
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

  const counts: Record<string, number> = {
    skill: actualSkills,
    prompt: actualPrompts.length,
    agent: actualAgents,
    workflow: actualWorkflows,
    template: actualTemplates,
  };

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
  // Detect drifted counts per label, then apply ALL fixes in a single pass.
  // (fixReadmeCounts rewrites every label at once, so we must not write once
  // per label — earlier writes would be clobbered by later ones.)
  const drift = (label: string): { doc: number; actual: number } | null => {
    const actual = counts[label];
    const m = readme.match(new RegExp(`\\b${label}s?[^\\(\\n]*\\((\\d+)[^)]*\\)`));
    if (!m) return null;
    const doc = Number.parseInt(m[1], 10);
    return doc === actual ? null : { doc, actual };
  };
  const driftedLabeled = COUNT_LABELS
    .map((label) => ({ label, d: drift(label) }))
    .filter((x) => x.d) as { label: string; d: { doc: number; actual: number } }[];

  let fixed = 0;
  if (fix) {
    if (driftedLabeled.length) {
      const fixedReadme = fixReadmeCounts(readme, counts);
      if (fixedReadme !== readme) {
        writeFileSync(readmePath, fixedReadme);
        fixed = driftedLabeled.length;
      }
    }
  } else {
    for (const { label, d } of driftedLabeled) {
      issues.push({
        scope: "README",
        rule: `count-${label}`,
        severity: "warning",
        message: `${label} count (${d.doc}) ≠ actual (${d.actual})`,
        fix: `Update README ${label} count to ${d.actual} (or run: mdpi lint --fix)`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: { total: 1, passed: issues.length === 0 ? 1 : 0, failed: 0, warnings: issues.length, fixed },
  };
}

export interface LintOptions {
  target?: "skills" | "docs" | "all";
  json?: boolean;
  fix?: boolean;
}

export function lintAll(piDir: string, opts: LintOptions = {}): void {
  const target = opts.target ?? "all";
  const fix = opts.fix ?? false;
  const results: { name: string; r: Result }[] = [];
  if (target === "skills" || target === "all") results.push({ name: "skills", r: lintSkills(piDir, fix) });
  if (target === "docs" || target === "all") results.push({ name: "docs", r: lintDocs(piDir, fix) });

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
    const anyFail = results.some(({ r }) => !r.ok);
    process.exitCode = anyFail ? 1 : 0;
    return;
  }

  const totalFixed = results.reduce((s, { r }) => s + r.stats.fixed, 0);
  for (const { name, r } of results) {
    const fixedNote = r.stats.fixed ? color.green(` · ${r.stats.fixed} fixed`) : "";
    console.log(
      `\n${color.bold(color.cyan(name))}: ${r.stats.total} total · ${r.stats.passed} passed · ${r.stats.failed} failed · ${r.stats.warnings} warnings${fixedNote}`,
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
  if (totalFixed) console.log(`\n${color.green("✓")} auto-fixed ${totalFixed} issue(s)`);
  const anyFail = results.some(({ r }) => !r.ok);
  process.exitCode = anyFail ? 1 : 0;
}