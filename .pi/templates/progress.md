# Progress — <feature-slug>

> **Purpose:** Append-only log for `/ship`, `/verify`, `/fix`, and `/close`. Each entry is a short, dated line. Lives at `.pi/artifacts/$SLUG/progress.md`. Not a fill-in template — created empty per feature and appended to during execution.

**Spec:** `.pi/artifacts/$SLUG/spec.md`
**Started:** [YYYY-MM-DD]

---

## Entries

<!-- Append one block per significant event. Keep entries under 3 lines each. -->

### [YYYY-MM-DD HH:MM] — <command>
- **Action:** <what was done>
- **Result:** <PASS|FAIL|PARTIAL|BLOCKED> — <one-line summary>
- **Files:** <list or "none">

### [YYYY-MM-DD HH:MM] — /verify
- **Result:** PASS — typecheck ✓, lint ✓, test 42/42
- **Mode:** full
- **Phantom:** CLEAN

### [YYYY-MM-DD HH:MM] — /ship
- **Task:** task-3 — <title>
- **Commit:** <hash> <subject>
- **Verification:** PASS

### [YYYY-MM-DD HH:MM] — /close
- **Outcome:** done
- **Note:** <user note or empty>

---

## Entry Format

```
### [ISO timestamp] — <command>
- **Action|Result|Task|Commit|Verification|Mode|Phantom|Outcome|Note:** <value>
```

**Rules:**
- One top-level `###` block per event.
- Never delete past entries — append only.
- If a gate fails, record the failure with file:line evidence in the summary.
- `/close` appends a final outcome block and stops.

## Linked Artifacts

- `spec.md` — the PRD
- `plan.md` — authoritative task decomposition (from `/plan`)
- `tasks.json` — runtime task status (from `/plan`, updated by `/ship`)
- `verify.log` — verification cache stamp (from `/verify`)
- `review-state.json` — quality-loop state (if high-risk mode ran)
- `audit.md` / `research.md` — optional command outputs