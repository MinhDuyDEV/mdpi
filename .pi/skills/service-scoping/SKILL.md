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

## Verification

- `git rev-parse --show-toplevel` succeeds → the walk was bounded by a real worktree.
- The discovered `AGENTS.md` path is **at or above** `dirname(target)` and **at or below** `root`: `[ "${real_agents#"$root"}" != "$real_agents" ]`.
- The service manifest's directory contains the target file (target is under `servicePath`).
- If no `AGENTS.md` found within the worktree, explicitly report "no scoped AGENTS.md — using project root rules" rather than silently loading nothing.