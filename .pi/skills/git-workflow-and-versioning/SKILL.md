---
name: git-workflow-and-versioning
description: "Use when making code changes that need safe git hygiene, atomic commits, branch strategy, versioning, changelog entries, or release preparation. Covers trunk-based development, commit-as-save-point discipline, and avoiding accidental unrelated changes."
---

# Git Workflow and Versioning

## Overview

Git is your safety net. Treat commits as save points, branches as sandboxes, and history as documentation. With AI agents generating code at high speed, disciplined version control is the mechanism that keeps changes manageable, reviewable, and reversible.

Git workflow keeps changes reviewable, reversible, and shippable. Treat commits as verified save points, not dumping grounds. A clean history lets you bisect regressions, revert bad deploys, and hand off context to the next agent or reviewer without confusion.

## When to Use

- Always. Every code change flows through git.
- Any meaningful code change that may be committed, reviewed, or shipped.
- Creating or finishing a feature branch.
- Preparing release notes, version bumps, or changelog entries.
- Splitting a large diff into safe review units.
- Working in a dirty worktree where unrelated user changes may exist.

## When NOT to Use

- Read-only investigation with no file changes.
- Throwaway local experiments that will be discarded before reporting.

## Core Principles

### 1. Commit Early, Commit Often

Each successful increment gets its own commit. Don't accumulate large uncommitted changes. If you can explain what changed and why in one sentence, it is probably commit-ready.

### 2. Atomic Commits

Each commit does one logical thing. Good: `feat: add task creation endpoint with validation`. Bad: `Add task feature, fix sidebar, update deps`. Atomic commits make review, bisect, revert, and cherry-pick possible.

### 3. Descriptive Messages

Format: `type: short summary`. Keep the summary imperative and specific. Types:

- `feat` — new behavior or capability
- `fix` — bug correction
- `refactor` — code change that preserves behavior
- `test` — test additions or corrections
- `docs` — documentation-only changes
- `chore` — tooling, deps, or maintenance

Add a body when the why or trade-off isn't obvious from the summary.

### 4. Keep Concerns Separate

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Don't mix dependency updates with domain logic. Each concern deserves its own commit and, when shared, its own PR.

### 5. Size Your Changes

Target ~100 lines per commit/PR. Changes over ~1000 lines should be split. Small changes are easier to review, safer to deploy, and simpler to roll back.

## Trunk-Based Development

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1-3 days.

- Integrate frequently. Long-lived branches diverge, accumulate conflict debt, and hide risk.
- Protect `main` with required reviews, CI checks, and branch rules when available.
- Avoid long-running release branches; prefer tags and feature flags for in-progress work.

## Atomic Commits

An atomic commit:

1. Addresses exactly one intent (feature slice, fix, refactor, docs update, or dependency bump).
2. Passes its own verification (tests, lint, typecheck) before being committed.
3. Leaves the codebase in a working state.
4. Has a message that explains the why, not only the what.

If you find yourself writing `and` or `also` in a commit message, split the commit.

## Descriptive Messages

A good commit message answers three questions:

- What changed?
- Why did it change?
- What should a reviewer or future maintainer watch for?

Examples:

```
feat: add email validation to task creation endpoint

Reject empty or malformed addresses before persistence.
Returns 422 with a structured error body.
```

```
fix: prevent duplicate tasks when form is double-submitted

Uses a client-side submission lock and idempotency key.
```

Avoid messages like `fix`, `update`, `misc`, `wip`, or `asdf`.

## Change Sizing

| Size | Guidance |
| --- | --- |
| < 100 lines | Ideal. Easy to review, test, and revert. |
| 100–500 lines | Acceptable for a single logical change with clear boundaries. |
| 500–1000 lines | Should be split unless it is purely mechanical (e.g., generated types, renames). |
| > 1000 lines | Must be split. Large changes are harder to review, riskier to deploy, and harder to revert. |

## Branching Strategy

- Branch from `main`.
- Keep branches short-lived (merge within 1-3 days).
- Delete branches after merge.
- Branch naming: `feature/`, `fix/`, `chore/`, `refactor/`.

Name branches after the intent, not the ticket number alone. Good: `feature/task-creation-validation`. Bad: `feature/TICKET-123`.

## The Save Point Pattern

Use commits as verified checkpoints during agent work:

```
Agent starts work
  → Makes a focused change
  → Runs verification (tests, lint, typecheck)
  → Passes? → Commit
  → Continues to next increment
  → Fails? → Revert to last good commit → Investigate
```

Partial or exploratory work should be committed only after clearly labeling it (e.g., `chore: WIP — spike on pagination approach`) or kept on a separate branch.

## Change Summaries

After any modification, provide a structured summary:

- **CHANGES MADE** — what files changed and what behavior was added, removed, or fixed.
- **THINGS I DIDN'T TOUCH** — adjacent code, unrelated worktree files, or out-of-scope concerns deliberately left alone.
- **POTENTIAL CONCERNS** — edge cases, manual steps, rollback considerations, or follow-up work.

## Pre-Commit Hygiene

Before every commit:

1. `git status --short` — know what is staged and unstaged.
2. `git diff --staged` — review the exact diff you are about to commit.
3. Check for secrets, tokens, or credentials in the diff.
4. Run tests, lint, and type checks for the affected scope.
5. Confirm `.gitignore` excludes generated files, dependencies, and build artifacts.

## Process

1. Inspect worktree state before editing: `git status --short`.
2. Identify unrelated changes and leave them untouched.
3. Keep each change atomic: one intent, one reviewable diff, one verification story.
4. Prefer trunk-based flow: short-lived branches, small PRs, frequent integration.
5. Use commits as save points only after verification passes or after clearly labeling partial work.
6. Scope staging to your files only; never use `git add .` in a mixed worktree.
7. For versioning, update the smallest required surface: package version, changelog, migration note, release tag, or docs.
8. Before shipping, confirm status, diff summary, verification evidence, and rollback path.

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "I'll commit when the feature is done." | One giant commit is impossible to review, debug, or revert. Commit each slice. |
| "The message doesn't matter." | Messages are documentation. Future you will need to understand what changed and why. |
| "I'll squash it all later." | Squashing destroys the development narrative and makes bisecting harder. |
| "Branches add overhead." | Short-lived branches are free and prevent conflicting work. |
| "Large PRs are fine." | Large changes are harder to review, riskier to deploy, and harder to revert. |
| "I'll clean up the commit later." | Later cleanup often loses intent. Keep the diff clean while it is fresh. |
| "This unrelated formatting is harmless." | It increases review noise and can hide real regressions. |
| "One big commit is faster." | Small verified commits are easier to review, revert, bisect, and ship. |
| "The worktree was already dirty." | Dirty worktrees require more discipline, not less. |

## Red Flags

- Large uncommitted changes accumulating.
- Commit messages like `fix`, `update`, `misc`, `wip`, or `asdf`.
- Formatting changes mixed with behavior changes.
- No `.gitignore` in the project.
- Committing `node_modules/`, `.env`, or build artifacts.
- Staging broad paths without reviewing the diff.
- Mixing feature work, refactors, formatting, and dependency updates in one commit.
- Committing generated or cache files unintentionally.
- Version bump without changelog or release rationale.
- Claiming clean worktree without checking status.

## Verification

Before declaring git workflow complete, confirm:

- [ ] Commit does one logical thing.
- [ ] Message explains the why and follows type conventions.
- [ ] Tests pass before committing.
- [ ] No secrets in the diff.
- [ ] No formatting-only changes mixed with behavior changes.
- [ ] `.gitignore` covers standard exclusions.
- [ ] `git status --short` summary is provided.
- [ ] Diff or staged-file summary for touched files is provided.
- [ ] Verification commands and outcomes are recorded.
- [ ] Commit/version/changelog action taken, or explicit reason none was needed.

## Skill Result Contract

```xml
<skill_result>
  <skill>git-workflow-and-versioning</skill>
  <status>completed|blocked|skipped</status>
  <artifacts>Branch, commit, changelog, version file, or none</artifacts>
  <evidence>git status/diff summary and verification commands</evidence>
  <risks>Unrelated worktree changes, uncommitted files, release risk, or none</risks>
</skill_result>
```
