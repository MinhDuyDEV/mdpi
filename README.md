# mdpi — Pi Coding-Agent Kit CLI

> Scaffold a curated `.pi/` kit (agents, prompts, skills, templates, workflows, extensions) into any repo with one command.

## Install

> ⚠️ The npm page auto-shows `npm i @minhduydev/mdpi` — that installs **locally** and does **not** put `mdpi` on your PATH. Use one of the commands below instead.

**One-off (no install, recommended for first try):**

```bash
npx @minhduydev/mdpi init
```

**Global (gives you the `mdpi` command everywhere):**

```bash
npm install -g @minhduydev/mdpi
mdpi init
```

<details>
<summary>I already ran <code>npm i @minhduydev/mdpi</code> and got <code>command not found</code></summary>

You installed it locally. Either install it globally with `npm install -g @minhduydev/mdpi`, or run it without installing:

```bash
npx @minhduydev/mdpi init      # no install needed
# or, using the local copy you just installed:
npx mdpi init
./node_modules/.bin/mdpi init
```

</details>

## Commands

| Command | What it does |
|---------|--------------|
| `mdpi init` | Scaffold the curated `.pi/` kit into the current repo + write `.version` + `.template-manifest.json` (SHA-256 file map). Idempotent; `--force` overwrites template files (preserves user files), `--quiet` for CI. `--only <cats>` installs only the listed category dirs (`agents,prompts,skills,templates,workflows,context,extensions`) and trims settings.json to match. |
| `mdpi install` | Install the kit's declared npm packages — core (`.pi/settings.json:packages`) + optional (`.pi/packages.json`). Shells out to `pi install npm:<pkg>` (idempotent, safe to re-run). `--core` / `--optional` scope; `--check` dry-runs and reports installed/missing; `--yes` skips the confirm prompt. |
| `mdpi upgrade` | Bring `.pi/` up to the bundled template version. Manifest-based: overwrites only user-unmodified files, preserves user edits, lists orphans. `--check` dry-run, `--force` overwrite modified, `--prune-all` delete orphans. |
| `mdpi new <kind> [name]` | Scaffold a new kit component (`skill\|prompt\|agent\|workflow\|template`) from a lint-passing skeleton. `-d <text>` sets the description; `--force` overwrites. The skill skeleton comes with frontmatter + When to Use/NOT so it passes `mdpi lint` immediately. |
| `mdpi lint [skills\|docs\|all]` | Governance: SKILL.md frontmatter (pi `name`+`description`), H1, When to Use/NOT, line limits, references/ depth, **dead cross-ref detection** (skills referencing non-existent skills), + README count/slash-command drift. `--json` for machine output. |
| `mdpi doctor` | `.pi/` health: version match, manifest valid, settings.json valid, kit dir counts, orphan detection, lint summary. |
| `mdpi --version` / `mdpi --help` | — |

## How it works

- `.pi/` in this repo is the **curated kit** (the template payload). `pnpm run build` = `tsdown` (bundles `src/index.ts` → `dist/index.js`, inlines the package version) + `scripts/bundle-template.mjs` (copies an explicit INCLUDE list `.pi/` → `dist/template/.pi/`, stripping runtime dirs `npm/memory/state/tasks`).
- The published package ships only `dist/` (CLI + bundled template) + this README — `files: [dist, README.md]`.
- `mdpi init` copies `dist/template/.pi/` → `./.pi/`, writes `.version` + `.template-manifest.json` (SHA-256 map) so `mdpi upgrade` can later detect user modifications.
- No license gate, no `--global` (the pi global dir `~/.pi/agent/` is pi's own config — installing the full kit there is a footgun). Project-local only.

## What's in the kit

`agents/` (7) · `prompts/` (12) · `skills/` (67 + INDEX) · `templates/` (11) · `workflows/` (6) · `context/` (2) · `extensions/` (2 TS) · `settings.json` · `packages.json` · `AGENTS.md` · `README.md` · `QUALITY.md` · `.env.example` · `guard.example.json` · `subagents.json` · `artifacts/example/` (template examples).