---
purpose: Index of DAG workflows with trigger, phases, and invoking command
---

# Workflows Index

6 DAG workflows. All have `description` frontmatter (for `run_workflow` discovery) and use a consistent Phase format: `Agent`, `Concurrency`, `Depends on`, `Prompt`.

## Invocation

Commands invoke workflows via the `run_workflow` tool — never by manually reading the workflow file:

```
run_workflow({ name: "<workflow-name>", args: { <args> } })
```

Workflows may compose recursively (e.g., `development-lifecycle-workflow` Phase 4 calls `run_workflow('batch-implement')`).

## Workflows

| Workflow | Phases | Trigger | Invoked by | Purpose |
|----------|--------|---------|------------|---------|
| `audit-pattern` | 2 + synthesis | `>5` pattern occurrences | `/audit` | Find pattern occurrences, review each, prioritize remediation |
| `batch-implement` | 3 + merge | ≥5 independent tasks, no file conflicts | `/ship` Phase 3, `development-lifecycle-workflow` Phase 4 | One subagent per task in parallel, review, merge |
| `deep-research` | 2 + synthesis | Complex/multi-angle topic | `/research` (complex mode) | Fan out web searches per angle, cross-check, cited report |
| `development-lifecycle-workflow` | 5 | Explicit full-lifecycle multi-agent run | Manual / future `/lifecycle` | research → validate → plan → implement → verify (composes batch-implement) |
| `garbage-collection` | 5 | Manual `/gc` or scheduled cadence | `/gc` | Fallow scan → grade → prioritize → optional cleanup PRs |
| `quality-loop` | 7 (looped) | High-risk feature, explicit quality gating | `/ship` Phase 5 (Iterative Quality Loop) | Score-gated review loop until 5/5 or escalation |

## Phase format (canonical)

```markdown
### Phase N: <name>
- **Agent:** <type>           # explore | scout | review | plan | general | vision | build
- **Concurrency:** <N | Dynamic: min..max>
- **Depends on:** Phase <M> | —
- **Tool:** `subagent` (single|parallel mode)   # omit if main-agent phase
- **Skill:** <skill>          # optional, when a phase needs a specific skill loaded
- **Gate:** <condition>        # optional, e.g., dry-run default
- **Prompt:** ...
```

**Final Synthesis (Main Agent)** — every workflow ends with a main-agent synthesis step that aggregates phase outputs into the final report. Main agent does not dispatch itself as a subagent.

## Composition

```
development-lifecycle-workflow
  └── Phase 4 → run_workflow('batch-implement')
```

No other cross-workflow dependencies. `quality-loop` is self-contained (loops internally).

## Notes

- **Dynamic concurrency** is expressed as `min..max`; pick a concrete count within range based on input size (e.g., occurrences, tasks, findings).
- **Empty-input guards** — phases that depend on a prior phase's output must check for empty results and skip if none (e.g., `audit-pattern` Phase 2 skips when Phase 1 returns 0 occurrences).
- **Conflict fallback** — `batch-implement` falls back to sequential execution if parallel subagents produce merge conflicts.

## Related

- `prompts/INDEX.md` — 11 commands that invoke these workflows
- `skills/INDEX.md` — skills loaded by workflow phases