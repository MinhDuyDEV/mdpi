# Changelog

All notable changes to **mdpi** are documented here.
The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/MinhDuyDEV/ockit-mapping/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.2.0
[0.1.0]: https://github.com/MinhDuyDEV/ockit-mapping/releases/tag/v0.1.0