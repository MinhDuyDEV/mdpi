# Changelog

All notable changes to **mdpi** are documented here.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

(no unreleased changes)

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

[Unreleased]: https://github.com/MinhDuyDEV/ockit-mapping/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.3.0
[0.2.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.2.0
[0.1.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.1.0