---
name: service-scoping
description: "Use before editing a file in a monorepo, nested package, or subtree — walks up from the target file to find the nearest scoped context (AGENTS.md, service manifest, .pi/tech-stack.md) bounded by the git worktree root, so you load only the context relevant to the file's service. Prevents importing unrelated AGENTS.md or cross-project context."
---

# Service Scoping — Nearest-Context Discovery

**Purpose**: Before editing a file, determine **which service it belongs to** and **which scoped context to load** — by walking up from the target file to the nearest `AGENTS.md`, nearest service manifest, and nearest `.pi/tech-stack.md`. Never cross the git worktree root; never import context from other projects or skill directories.

This generalizes the old "Scoped Context Discovery" (AGENTS.md-only walk) to also resolve the owning service and its tech stack.

## When to Use

- About to edit a file in a **monorepo**, **nested package**, or any non-root subtree.
- You need to answer "which service does this file belong to?" structurally rather than guessing from context.
- Before loading context, to avoid pulling in a root `AGENTS.md` when a nearer one exists, or pulling in a sibling service's `AGENTS.md`.

Skip for: single-package repos where the root `AGENTS.md` is the only context, or trivial edits at the repo root.

## Procedure

1. **Bound the walk** to the worktree root: `root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"`. Never walk above it.
2. **Nearest `AGENTS.md`**: walk up from `dirname(target)`; read the first `AGENTS.md` found (stop at `root`). This is the scoped rule file for the file's region.
3. **Nearest service manifest**: walk up again; the first of `package.json` (with a `name`), `pyproject.toml`, `Cargo.toml`, `go.mod`, `Dockerfile` identifies the owning service. A `package.json` **without** `name` is usually a workspace root, not a service — keep walking past it.
4. **Nearest `.pi/tech-stack.md`**: walk up for the first per-service stack file; load it as the service's tech context.
5. **Read only** the discovered scoped files (AGENTS.md + tech-stack + the service manifest's name/deps). Do **not** read `AGENTS.md`/`tech-stack.md` from sibling services, other projects, or `.pi/skills/` directories.
6. **Report** `{ servicePath, serviceName, stack }` to the caller so downstream work is scoped.

### Snippet

```sh
target="<target-file>"
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
d="$(cd "$(dirname "$target")" && pwd)"

# 1. Nearest AGENTS.md (stop at worktree root)
p="$d"
while [ "$p" != "/" ]; do
  [ -f "$p/AGENTS.md" ] && { echo "agents: $p/AGENTS.md"; break; }
  [ "$p" = "$root" ] && break
  p="$(dirname "$p")"
done

# 2. Nearest service manifest (nearest wins; skip workspace-root package.json w/o name)
p="$d"
while [ "$p" != "/" ]; do
  for m in package.json pyproject.toml Cargo.toml go.mod Dockerfile; do
    [ -f "$p/$m" ] || continue
    [ "$m" = "package.json" ] && [ -z "$(node -p 'require("./package.json").name||""' 2>/dev/null)" ] && continue
    echo "manifest: $p/$m"; break 2
  done
  [ "$p" = "$root" ] && break
  p="$(dirname "$p")"
done

# 3. Nearest .pi/tech-stack.md (stop at worktree root)
p="$d"
while [ "$p" != "/" ]; do
  [ -f "$p/.pi/tech-stack.md" ] && { echo "tech-stack: $p/.pi/tech-stack.md"; break; }
  [ "$p" = "$root" ] && break
  p="$(dirname "$p")"
done
```

## Pitfalls

- **Don't cross the worktree root.** A worktree may share a parent with the main checkout; walking past `git rev-parse --show-toplevel` can import the main repo's `AGENTS.md` into an isolated worktree — exactly what isolation is meant to prevent.
- **Workspace root vs service.** A root `package.json` (or `pnpm-workspace.yaml`) often has no `name` and is a workspace shell, not a service. Skip it to find the real owning service manifest.
- **Don't read sibling context.** Finding `packages/web/AGENTS.md` does not authorize reading `packages/api/AGENTS.md`. Read only the nearest one for the target file's path.
- **Skill directories are not project context.** Never treat `.pi/skills/<name>/` files as scoped project context — they are kit content, not the running project's rules.
- **No git worktree** (e.g., bare directory): fall back to `pwd` as the root bound; state that the bound is uncertain.

## Common Rationalizations

| Rationalization | Reality |
|---------------|--------|
| "I'll just read the root `AGENTS.md` — it's the project's rules anyway." | The root file is the *coarsest* context. A nested service often has its own `AGENTS.md` that overrides, narrows, or contradicts root rules (different framework, different conventions). Loading root first silently drowns the service-specific rules in generic noise. |
| "Loading the whole monorepo context is safer — more information is better." | More *unrelated* information is noise, not safety. Pulling sibling services' conventions creates training-distribution output: code that "works" in some repo but violates the owning service's conventions. Scoped context is the safety; breadth is the hazard. |
| "Scoping wastes time — I know which service this file is in." | The walk is one shell snippet (sub-second) and prevents the *expensive* failure: editing a file against the wrong conventions, then debugging the mismatch downstream. Skipping it trades a millisecond for a multi-hour mistake. |
| "The root `package.json` is the service manifest — I'll use that." | A root `package.json` with no `name` is a workspace shell, not a service. Using it as the owning service misidentifies the target and imports workspace-level deps as if they were the service's. Keep walking to the real service. |
| "Sibling services share the monorepo, so their `AGENTS.md` is relevant too." | Relevance is a property of the *target file's path*, not the repo topology. Sibling context applies only to sibling files. Importing it invites cross-service contamination (e.g., applying the API service's error shape to the web service). |
| "There's no `AGENTS.md` near the file, so I'll load whatever `AGENTS.md` I can find." | No nearer `AGENTS.md` means use the **project root rules**, explicitly reported as "no scoped AGENTS.md" — not the nearest `AGENTS.md` from a different subtree. "Something is better than nothing" is wrong when the something is from the wrong service. |

## Red Flags

- **Editing a nested package but loading the root `AGENTS.md`** without first walking up from the target to check for a nearer one.
- **Context includes another service's conventions** (e.g., the API service's error shape or the web service's component rules) while editing a file in a different service.
- **No nearest-scope lookup was performed** — the agent jumped straight from "edit this file" to reading context without running the walk-up.
- **The walk crossed `git rev-parse --show-toplevel`** — context from a parent checkout or sibling worktree leaked into an isolated worktree.
- **A workspace-root `package.json` (no `name`) was reported as the owning service** instead of skipping to the real service manifest.
- **`.pi/skills/<name>/` files were loaded as scoped project context** — skill directories are kit content, never the running project's rules.
- **`{ servicePath, serviceName, stack }` was never reported to the caller** — downstream work has no scoping boundary and may drift into sibling-service territory.
- **No `AGENTS.md` was found, and the agent silently loaded nothing** instead of explicitly reporting "no scoped AGENTS.md — using project root rules."

## Verification

- `git rev-parse --show-toplevel` succeeds → the walk was bounded by a real worktree.
- The discovered `AGENTS.md` path is **at or above** `dirname(target)` and **at or below** `root`: `[ "${real_agents#"$root"}" != "$real_agents" ]`.
- The service manifest's directory contains the target file (target is under `servicePath`).
- If no `AGENTS.md` found within the worktree, explicitly report "no scoped AGENTS.md — using project root rules" rather than silently loading nothing.