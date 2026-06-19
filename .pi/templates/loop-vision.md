---
purpose: Anti goal-drift contract for a loop — reread at the start of every run; the loop must not act outside this file
updated: <auto — last modified>
---

# Loop Vision

<!--
  This file is the immutable contract for one loop. The orchestrator (and any
  interactive run) MUST reread this file at the start of every cycle and treat
  its boundaries as authoritative. If context summarization drops a constraint
  mid-run, this file restores it (boundaries are re-derived from disk, not
  from context).

  Fill the bracketed placeholders via `/loop-init <name>`, then edit by hand.
  Never let a run edit this file during a cycle (protected path — see
  loop-guard.ts).
-->

**Loop name:** `<loop-name>`
**Owner:** `[Owner]`
**Cadence:** `[cron expression or "manual"]`
**Created:** `[Date]`
**Last revised:** `[Date]`

---

## Goal

<!-- One sentence: the outcome this loop produces, outcome-shaped not task-shaped. -->

[What does this loop achieve? e.g. "Triage failing CI runs nightly and open fix PRs for deterministic failures."]

## Scope

<!-- What the loop is allowed to touch. Be concrete: file paths, package names, commands. -->

- [Allowed action 1: e.g. edit source under `src/`]
- [Allowed action 2: e.g. run `npm test` / `npm run lint`]
- [Allowed action 3: e.g. open a PR on branch `loop/<name>/<ts>` — never `main`]

## Out-of-scope

<!-- What the loop must NEVER do, even if asked. Hard refuses. -->

- [Refuse 1: e.g. auth / payments / architecture changes]
- [Refuse 2: e.g. editing `package.json`, lockfiles, or this VISION.md / the gate script]
- [Refuse 3: e.g. merging or deploying — human approval required]

## Definition-of-done

<!-- Observable, verifiable end state. Must be checkable by the Gate command (exit 0). -->

- [ ] [Criterion 1: e.g. `npm test` exits 0]
- [ ] [Criterion 2: e.g. diff is limited to in-scope paths]
- [ ] [Criterion 3: e.g. a PR is open on `loop/<name>/<ts>` with a body citing this file]

## Gate

<!--
  PARSE CONTRACT (machine-readable — do NOT edit this comment):
    The orchestrator (T9/T10) extracts the gate command from the FIRST fenced
    ```bash block located directly under the "## Gate" heading in this file.
    Extraction rule: take the content of that code block, strip trailing
    whitespace, run it via `bash -c "<command>"`, read the exit code.
      exit 0   -> PASS  -> ship (push branch `loop/<name>/<ts>` + open PR)
      non-zero -> FAIL  -> no ship; record failure in STATE.json; cleanup worktree
    The gate decision is computational (exit code), never an LLM's opinion.
    Keep exactly ONE ```bash block directly under ## Gate.
-->

Command (exit 0 = pass):

```bash
<GATE_COMMAND>
```

**Pass:** exit 0 → ship (push `loop/<name>/<ts>` branch + open PR via `gh`).
**Fail:** non-zero → no ship; record failure in `STATE.json.failures[]`; cleanup worktree.

## Hard stops

<!-- Conditions that abort the run immediately, no matter the gate result. -->

- [Hard stop 1: e.g. token budget exceeded (`STATE.json.metrics.tokens_used > cap`)]
- [Hard stop 2: e.g. gate file / VISION.md / `package.json` modified during the run]
- [Hard stop 3: e.g. item already in `STATE.json.processed` → idempotent skip]
- [Hard stop 4: e.g. `gh` not authenticated → fall back to commit-only/log, do not ship]

## Human-approval-required

<!-- Actions the loop may stage but never execute on its own. -->

- [ ] Merging a PR
- [ ] Deploying to production
- [ ] Changing dependencies (`package.json`, lockfiles, version bumps)
- [ ] Modifying this VISION.md or the Gate command mid-run
- [ ] Touching auth, payments, or architectural decisions

---

<!--
  Reread this file at the start of every run. The loop must not act outside
  this file. If a proposed action is not clearly inside Scope, treat it as
  Out-of-scope and escalate (record in STATE.json.escalated[]) instead of
  acting.
-->