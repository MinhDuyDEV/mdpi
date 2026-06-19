---
description: Maker/checker review for a loop — spawns a verifier subagent that runs the gate and inspects the diff, then emits ACCEPT/REJECT with evidence
argument-hint: "<loop-name> [--help]"
---

# Loop Review: $ARGUMENTS

Run the maker/checker gate for `<loop-name>`: dispatch an independent **verifier subagent** that runs the `## Gate` command from the loop's `VISION.md` via bash and reads the exit code, inspect the working-tree diff for scope creep and forbidden touches, then emit exactly `DECISION: ACCEPT|REJECT` plus `EVIDENCE:`. The maker never self-approves — default to **REJECT** on any uncertainty.

## When to Use

- After a loop's maker (the `pi -p` capability-deprived agent) reports its work done and before the orchestrator ships.
- Interactive `/loop-review <loop-name>` to manually gate a loop cycle.
- Whenever you need an independent, computational gate decision — never trust the maker's self-report.
- Do **not** use for the orchestrator's own gate run (FR7); this prompt is the interactive maker/checker wrapper around the same gate-parse contract.

## The Verifier Subagent

Dispatch a **verifier** as an independent subagent so the maker cannot influence or self-approve the decision. The verifier's sole job: run the gate, read the exit code, collect diff findings, return raw evidence.

### Dispatch

Use the `subagent` tool with **type `review`**. Pass a prompt that instructs the verifier to:

1. Read `.pi/loops/<loop-name>/VISION.md` (or wherever the loop's VISION lives for this run) from disk — do not trust context-supplied copies.
2. Extract the gate command using the **exact gate-parse contract** below.
3. Run the gate via bash and capture the **exit code** (the computational signal — never an opinion).
4. Inspect the working-tree/staged diff for scope creep and forbidden paths (see The Diff Check).
5. Return raw evidence only: exit code, gate command run, diff findings (paths touched, any forbidden hits). **No verdict** — the maker (this agent) issues the verdict.

### Gate-parse contract (must match T2 exactly)

Extract the gate command from `VISION.md` as: **the SINGLE fenced ```bash block located directly under the `## Gate` heading** — require **EXACTLY ONE** such block directly under `## Gate` (zero or more-than-one → REJECT / hard fail). Take that single block's content, strip trailing whitespace, run it via `bash -c "<command>"`, and read the exit code.

- `exit 0`   → PASS → ship (orchestrator pushes `loop/<name>/<ts>` + opens PR)
- non-zero   → FAIL → no ship; record failure in `STATE.json.failures[]`; cleanup worktree

The gate decision is **computational (exit code), never an LLM's opinion**. If `## Gate` is missing, the fenced block is empty, or the block count under `## Gate` is not exactly one (zero or more-than-one), treat that as a hard fail: emit `DECISION: REJECT` with `EVIDENCE: gate not parseable` and do not run anything.

### Evidence to collect from the verifier

- The exact gate command extracted (verbatim, after whitespace strip).
- The bash exit code (integer).
- stdout/stderr tail (last ~20 lines) — enough to cite a concrete failure.
- List of paths touched in the diff (added/modified/deleted).
- Any forbidden-path hits (see The Diff Check).

## The Diff Check

Independently of the verifier (or have the verifier report and you confirm), inspect the diff against the loop's declared boundaries.

### Scope creep

Compare every path in the diff to `## Scope` and `## Out-of-scope` in `VISION.md`. Any touched path that is not clearly inside `## Scope` is scope creep → REJECT. When a path is ambiguous (not explicitly listed in either section), treat it as out-of-scope and escalate, do not approve.

### Forbidden touches (always REJECT)

Regardless of scope wording, REJECT immediately if the diff touches any of:

- `VISION.md` (the loop contract itself — protected path).
- The gate command / gate script referenced by `## Gate`.
- `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or any lockfile.
- Any path under `## Out-of-scope` in `VISION.md`.
- Auth, payments, or architectural-decision files (per `## Human-approval-required`).

Cite the offending path verbatim in `EVIDENCE:`.

## Output Contract

Emit exactly two lines (no prose around them, no extra fields):

```
DECISION: ACCEPT|REJECT
EVIDENCE: <exit code + diff findings>
```

- `DECISION: ACCEPT` only when the verifier reports **exit code 0** AND the diff has zero scope-creep and zero forbidden-touch findings.
- `DECISION: REJECT` otherwise. `EVIDENCE:` must cite the concrete signal — e.g. `gate exit 1: npm test failed (see stderr tail)` or `forbidden touch: package.json` or `scope creep: src/auth/* not in VISION.md Scope`.
- The orchestrator consumes these two lines machine-readably; do not decorate them with markdown, prefixes, or commentary.

## Default-Reject Rule

**The maker never self-approves.** The verdict is issued here (the maker/checker prompt), but the *evidence* comes from the independent verifier subagent — never from the maker's own self-report. On any uncertainty — gate not parseable, exit code unreadable, diff not inspectable, scope ambiguous, verifier subagent failed to return — emit:

```
DECISION: REJECT
EVIDENCE: <what was uncertain — e.g. "verifier did not return exit code" / "scope ambiguous for src/foo.ts">
```

Default-reject is the safe state; the orchestrator records it and retries or escalates. Never substitute opinion for the computational exit-code signal.