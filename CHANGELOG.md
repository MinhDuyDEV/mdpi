# Changelog

All notable changes to **mdpi** are documented here.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`mdpi upgrade` remembers `--only` subsets** — `mdpi init --only` now
  records the chosen category subset in `.template-manifest.json` (`categories`
  field), and `mdpi upgrade` filters the bundled template down to those
  categories + always-on kit config before classification. Previously a subset
  install was indistinguishable from a full one on upgrade, so upgrade would
  re-add the categories the user intentionally excluded. Old manifests without
  `categories` keep full-template behavior (backward-compatible). New pure,
  unit-tested helper `filterToSubset()`.
- **`mdpi upgrade --merge-settings`** — opt-in flag that union-merges
  `settings.json:packages` from the new template into the user's file
  (template-first, deduped, other keys preserved), so a user-customized
  settings.json still picks up upstream-added npm packages without being
  clobbered or frozen. Best-effort (own try/catch, never fails the upgrade).
  New pure, unit-tested helpers `unionPackages()` + `previewSettingsMerge()`.

### Fixed
- `buildManifestFromDir` default `skipDirs` now includes `.next`/`.turbo`,
  matching `SKIP_DIRS` used elsewhere — avoids a theoretical orphan
  false-positive for those dirs and keeps manifest hashing consistent.

## [0.7.1] — 2026-06-23

### Fixed
- **Prompt argument injection** — six slash commands (`/close`, `/gc`,
  `/init`, `/plan`, `/ship`, `/status`) declared `argument-hint` plus a
  "Parse Arguments" table but omitted `$ARGUMENTS` in their body, so pi's
  template expander silently dropped any args typed after the command name;
  the agent only received the static body. Added `# <Title>: $ARGUMENTS` to
  each H1, matching the already-working `/audit`, `/clarify`, `/create`,
  `/fix`, `/research`, `/verify`. All 12 prompts now inject args; `vitest`
  93/93 pass.

### Changed
- `plan` and `review` agent `model` updated to `ollama-cloud/glm-5.2`.

## [0.7.0] — 2026-06-22

### Added
- **`/clarify` prompt** — deep Define-phase discussion command that orchestrates
  five sequenced skills (`interview-me` → `brainstorming`/`idea-refine` →
  `grill-me` → `doubt-driven-development` → `spec-driven-development`) to take a
  vague/underspecified/high-stakes ask and produce a hardened `spec.md` in one
  pass. Sits alongside `/create` (the fast path for clear asks) as a second
  Define-phase entry. Entry routing detects whether to start at intent
  extraction, exploration, or adversarial stress-test. Flags: `[<topic>]`,
  `--grill` (skip to adversarial), `--spec <path>` (stress-test an existing
  ADR/PRD), `--dry-run`. Prompt count: 11 → 12. Updates: `prompts/INDEX.md`
  lifecycle diagram + tables, `AGENTS.md`, `README.md`, `.pi/README.md`.

## [0.4.0] — 2026-06-19

### Added
- **`mdpi install`** — install the kit's declared npm packages in one command.
  Reads **core** from `.pi/settings.json:packages` (single source of truth) and
  **optional** from a new kit file `.pi/packages.json` (lists `@davecodes/pi-dcp`
  + `pi-guard`). Shells out to `pi install npm:<pkg>` (idempotent, re-runnable).
  Flags: `--core`, `--optional`, `--check` (dry-run + installed/missing report vs
  `~/.pi/agent/npm/node_modules`), `--yes` (skip confirm). `mdpi init` now
  suggests running `mdpi install` next. Closes the gap where `init` copied kit
  files but left the referenced packages uninstalled.
- **DCP hygiene skill** (`dcp-hygiene`) — Tier-2 skill documenting the pi-dcp
  compress protocol (range mode, fact preservation, no-op clause for portability).
- **DCP closure triggers** (Layer 2) — 8 single-agent prompts now include a
  `dcp-hygiene` Load Skills row + a DCP hygiene trigger at their Report/closure
  phase (fix, verify, ship, gc, audit, research, plan, init). All triggers are
  conditional ("if compress available, skip if unavailable") so the kit stays
  portable without DCP installed.
- **DCP mid-command triggers** (Layer 3) — `ship` (Phase 2/3→4), `fix` (Phase
  3→4), and `quality-loop` (Phase 6→7) compress closed work-streams mid-command
  to keep context bounded during long operations.
- **Memory-system skill** (`memory-system`) — Tier-2 skill documenting the
  pi-hermes-memory auto-flywheel: background review (every ~10 turns), correction
  detection (real-time user corrections → `target:'failure' category:'correction'`),
  tools (`memory`, `memory_search`, `session_search`), commands, and best practices.
- **memory_search in Guard phases** — `fix`, `ship`, `create`, and `plan` now
  search both `vcc_recall` (session lineage) and `memory_search` (durable
  cross-session) in their Guard phases for dual recall coverage.
- **Failure-write triggers** — 5 Failure Handling tables (`fix`, `ship`, `verify`,
  `plan`, `audit`) now save failed approaches to `memory(action: "add", target:
  "failure", category: "failure")` on 2x verification failure, wiring the
  self-learning loop into the kit's failure paths.

### Changed
- DCP `pruneNotification` default flipped from `"off"` to `"minimal"` so the
  footer chip ("DCP: idle" / "DCP: ~X saved") is visible.

### Fixed
- Optimized prompt phase consistency — all triggers use conditional wording
  ("if available … skip if unavailable") for portability.

## [0.4.1] — 2026-06-20

### Fixed
- **quality-loop workflow** — corrected `ask_user` → `ask_user_question` in the
  verdict JSON schema to match the actual Pi tool name.
- **pi-hermes-memory database recovery** — resolved `database disk image is
  malformed` error caused by SQLite WAL corruption. Recovered data via
  `.recover`, rebuilt FTS5 indexes, documented recovery procedure and
  recommended `PRAGMA integrity_check` gate in `DatabaseManager.open()`.

## [0.6.0] — 2026-06-21

### Added
- **Fallow wired into the `/verify` lifecycle** — new Phase 2b runs a
  non-blocking `fallow audit --base <base> --gate new-only` after the hard
  gates pass, surfacing dead code, complexity, and duplication introduced
  by the change as an ADVISORY row. Never blocks `/ship` (pre-existing
  issues are logged only); escalates to the user on >5 new issues or any
  new circular dependency / architecture boundary violation. `/ship`
  inherits the gate via its Phase 4 delegation to `/verify`.
- **`mdpi init` Fallow hint** — the post-scaffold `Installation complete`
  note now tells users the Fallow skill is included and to run `/init` in a
  pi session to generate `.fallowrc.json` for JS/TS projects. Shown only
  when the `skills` category is installed (hidden for `--only` subsets
  that exclude skills).
- **INDEX.md keyword trigger for Fallow** — `dead code`, `duplication`,
  `circular dependency`, `unused exports`, `unused dependencies`,
  `complexity hotspot`, `codebase health`, `fallow` now route to the
  `fallow` skill (previously only the Tools table and Quick Routing
  referenced it).

### Changed
- **`/gc` Fallow invocation hardened** — `npx fallow --format json --quiet`
  now appends `|| true` per the skill's Agent Rule 2 (exit 1 = issues
  found, not a runtime error; only exit 2 is a real failure).

### Removed
- **Stale `.pi/context/fallow.md`** — deleted. It documented obsolete
  flags (`--circular`, `--unused-dependencies`) and a wrong config path
  (`.fallow/config.yaml`), and was missing `--changed-workspaces`,
  `audit --base`, MCP tools, runtime coverage, `security`, and `flags`
  commands. The canonical Fallow reference is now the `fallow` skill
  (`SKILL.md` + `references/cli-reference.md` + `gotchas.md` +
  `patterns.md`). Updated refs in `AGENTS.md`, `.pi/AGENTS.md`, and
  `.pi/README.md`.

## [0.5.0] — 2026-06-21

### Added
- **11 new skills** — v0, shadcn-ui, react-server-actions, nextjs-app-router,
  nextjs-cache, react-compiler, tanstack-query, zustand, react-hook-form
  (scaffolded from the ui-skills.com ecosystem) plus updated references
  for shadcn/ui v4.11, Motion rebrand, and React 19 patterns in
  `frontend-design/` and `react-best-practices/`.
- **First-message token optimization** (~3.5k reduction, 29.5k→26k) —
  templates-injector skips placeholder-heavy seed templates in
  `before_agent_start`; AGENTS.md deduplicates byte-identical Behavioral
  Kernel items 1-4/Drift Signals/Recovery Move; INDEX.md documents
  DESIGN.md on-demand loading via `/inject-template DESIGN.md`.

### Removed
- **loop-engineering harness** (reverted) — 13 files removed: 3 prompts
  (`loop-*`), 3 skills (`loop-*`), 7 templates (`loop-*`). Loop references
  cleaned from `INDEX.md` and `dcp-hygiene/SKILL.md`. Artifacts kept at
  `.pi/artifacts/loop-engineering-harness/` for history.

## [0.3.0] — 2026-06-19

### Added
- **Test suite** (Vitest): unit tests for `manifest.ts` (hashing, manifest round-trip,
  `fileModificationStatus` 4 states, deleted-file edge), `upgrade` classification
  (`classifyFiles` / `findOrphans` — all branches incl. no-manifest + force), and
  `lint` helpers (`parseFrontmatter`, `findCrossRefs`, `skillDirNames`, `lintDocs`
  countCheck + prompt-drift). 43 tests, `npm test`.
- **CI** (`.github/workflows/ci.yml`): typecheck + tests + build + CLI smoke test +
  bundle integrity check, on Node 20 & 22, for push/PR to `main`.
- `mdpi lint docs` now verifies **template counts** too (`countCheck("template", …)`),
  closing a gap where the README `templates/` (N) claim was never checked.
- `mdpi lint --fix` — auto-applies the safely-fixable rules: `name-match` rewrites
  the skill frontmatter `name:` to match the directory, and `count-*` rewrites the
  README kit-summary counts to match reality (preserving ` + INDEX` suffixes). All
  fixes are applied in a single pass (no clobbering); non-fixable rules are still
  reported.
- `mdpi doctor --fix` — regenerates a missing/invalid `.template-manifest.json`
  so `mdpi upgrade` can detect user edits again.
- `mdpi new <kind> [name]` — scaffold a new kit component
  (`skill|prompt|agent|workflow|template`) from a lint-passing skeleton. `-d <text>`
  sets the description; `--force` overwrites. The skill skeleton ships with
  frontmatter + When to Use/NOT so it passes `mdpi lint` immediately.
- `mdpi init --only <cats>` — install only the listed category dirs
  (comma-sep: `agents,prompts,skills,templates,workflows,context,extensions`)
  plus the always-on kit config/docs. settings.json is trimmed to drop references
  to excluded `skills`/`prompts`/`extensions` dirs so pi doesn't resolve dangling
  paths. Caveat: `mdpi upgrade` compares against the FULL template — a subset
  install isn't remembered as partial (use `--check` first).
- `CHANGELOG.md` (this file).

### Changed
- `mdpi lint docs` countCheck regex now matches the real README kit-summary format
  `` `label/` (N) `` and `` `label/` (N + INDEX) ``. The old `\b${label}s?\s*\((\d+)\)`
  never matched because of the `` /` `` between the label and the paren, so drifted
  counts silently passed (`mdpi lint docs` gave false "ok"). Captures the first integer
  inside the parens, ignoring ` + INDEX` suffixes.
- `mdpi lint docs` and `mdpi doctor` now agree on category counts: both exclude
  `INDEX.md` from `agents/`, `prompts/`, `workflows/` counts. Previously `doctor`
  counted `INDEX.md` (e.g. prompts=12) while `lint` excluded it (prompts=11).
- `mdpi upgrade` classification refactored into pure, exported, unit-tested helpers
  `classifyFiles()` and `findOrphans()` — behavior unchanged.
- Exported `parseFrontmatter`, `findCrossRefs`, `skillDirNames` from `lint.ts` for
  testability (no behavior change).
- README "What's in the kit" counts synced to reality: prompts 9→11, workflows 5→6,
  templates 10→11 (agents 7, skills 67 unchanged).

### Removed
- 11 port-planning analysis docs (`00-overview.md` … `07-port-recommendations.md`,
  `appendix-A/B`, `ANALYSIS.md`) — port complete; README Background section trimmed.
- `.ignore` (only whitelisted the now-removed `.opencode/` and `.beads/`).
- `.gitignore` entries for `.opencode/*`, `.opencode.*`, `.beads/*`, `.bv/`.

## [0.2.0] — 2026-06-18

### Added
- `mdpi upgrade` — manifest-based kit updater. For each template file, compares the
  user's current hash vs the install-time manifest: `unmodified` → safe overwrite,
  `modified` → preserve unless `--force`, `unknown` → add. Orphans (manifest files no
  longer in the template) listed by default; `--prune-all` deletes them. `--check`
  dry-run. `.version` excluded from orphan detection (mdpi-managed).
- `mdpi lint [skills|docs|all]` — governance. Skill lint adapted to pi frontmatter
  (`name` + `description` required — NOT version/tags/dependencies), H1, When to Use /
  NOT, line limits (500/400), `references/` depth, and **dead cross-ref detection**
  (`/skill:<name>`, `skill:<name>`, `` `<name>` skill `` → flags refs to non-existent
  skills). Docs-drift: `.pi/README.md` counts + slash-command refs vs actual content.
  `--json` machine output.
- `mdpi doctor` — `.pi/` health: version match, manifest validity, `settings.json`
  JSON validity, kit dir counts, orphan detection, lint summary.

## [0.1.0] — 2026-06-17

### Added
- **mdpi** CLI (`bin: mdpi`) — mirrors OpenCodeKit's `ock init` but pi-native.
  `mdpi init` scaffolds the curated `.pi/` kit (agents/prompts/skills/templates/
  workflows/context/extensions + `settings.json`) into any repo and writes
  `.pi/.version` + `.pi/.template-manifest.json` (SHA-256 file map) so a future
  `mdpi upgrade` can detect user modifications.
- `scripts/bundle-template.mjs` — copies an explicit curated INCLUDE list
  `.pi/` → `dist/template/.pi/`, stripping runtime dirs (`npm/memory/state/tasks/
  artifacts`) so they never ship.
- `src/commands/init.ts` — scaffold with idempotency (`--force` preserves user files),
  `--quiet` for CI.
- `src/utils/manifest.ts` — SHA-256 manifest (paradigm-agnostic, ported from
  OpenCodeKit `utils/manifest.ts`).
- `tsdown` build (`src/index.ts` → `dist/index.js`, inlines package version).
- No license gate, no `--global` (pi global dir `~/.pi/agent/` is pi's own config —
  installing the full kit there is a footgun). Project-local only.

[Unreleased]: https://github.com/MinhDuyDEV/mdpi/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/MinhDuyDEV/mdpi/releases/tag/v0.5.0
[0.4.1]: https://github.com/MinhDuyDEV/mdpi/releases/tag/v0.4.1
[0.4.0]: https://github.com/MinhDuyDEV/mdpi/releases/tag/v0.4.0
[0.3.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.3.0
[0.2.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.2.0
[0.1.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.1.0