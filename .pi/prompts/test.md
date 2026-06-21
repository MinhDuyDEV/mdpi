---
description: Design + execute black-box tests from specs/contracts/mockups — no source code access, oracle is the artifact + running app
argument-hint: "<spec path, contract, mockup, or feature description> [--app-url <url>] [--dry-run] [--help]"
---

# Test: $ARGUMENTS

Derive test cases from specs, contracts (OpenAPI/GraphQL), mockups, or feature descriptions — then execute them against the **running application** via Playwright/MCP, capturing screenshot + DOM + network evidence per case. **Black-box only. No source code access.**

> **Lifecycle:** Plan/Build utility (standalone). The oracle is the artifact + the running app — never the code.
> **Composes with:** `black-box-qa-playbook`, `spec-based-testing`, `contract-testing`, `exploratory-testing`, `api-testing`, `test-case-design`, and existing `playwright` + `chrome-devtools` skills (tool execution).

## Parse Arguments

| Argument     | Default  | Description                                    |
| ------------ | -------- | ---------------------------------------------- |
| `<spec>`     | required | Path to spec/PRD, OpenAPI/GraphQL schema, mockup/Figma, or a feature description |
| `--app-url`  | required | Running app URL (for execute phase) |
| `--scope`    | `.`      | Limit to a flow/component/operation |
| `--dry-run`  | false    | Derive cases without executing |
| `--help`     | false    | Show this usage |

## Guard Phase

- Load `black-box-qa-playbook` + `spec-based-testing` + `contract-testing` skills
- If a path arg given, verify it exists
- If `.pi/artifacts/.active` exists, write the plan to that feature's artifact dir
- **IRON RULE:** do NOT read source files, do NOT grep the codebase, do NOT inspect implementation. Oracle = the artifact (spec/contract/mockup) + the running app only.
- If `--app-url` is missing and not `--dry-run`, report the gap and continue plan-only.

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `black-box-qa-playbook` | Always | Black-box lane router + evidence pattern |
| `test-case-design` | Always | EP/BVA/decision tables from the spec |
| `spec-based-testing` | Spec/PRD source | RTM, acceptance-criteria → scenario |
| `contract-testing` | API/contract source | Schema as oracle, conformance checks |
| `exploratory-testing` | Exploratory mode | Charter + timebox + heuristics |
| `api-testing` | API execution | Request sending + response validation |
| `playwright` | Execution | CLI for screenshots + interaction + APIRequestContext |
| `dcp-hygiene` | Output | Compress closed reads when `compress` available |

## Execution

Delegate to the `black-box-test-workflow`:

```
run_workflow({ name: "black-box-test-workflow", args: { source: "<spec/contract/mockup from $ARGUMENTS>", app_url: "<--app-url>", scope: "<--scope or .>", mode: "<plan-only if --dry-run else execute>" } })
```

**Announce:** "Deriving + executing black-box tests for: [source]. Invoking black-box-test-workflow. Oracle = artifact + running app. No source access."

The workflow derives cases from artifacts (no code), reviews coverage from the artifact perspective (are all requirements/contract operations/UI states covered?), then executes via Playwright/MCP (screenshot/DOM/network evidence per case).

## Failure Handling

| Scenario | Action |
|----------|--------|
| Artifact unreadable/missing | Report, ask for valid path or inline description |
| App unreachable | Report status, ask for correct `--app-url` |
| Workflow phase fails | Retry once with adjusted prompt, then escalate |
| Case FAIL (observed ≠ expected) | Record FAIL with screenshot → route to `/defect` |

## Stop Conditions

- Artifact path not found → stop, ask for clarification
- Workflow phase fails 2x → stop, escalate with partial results
- `--dry-run` → derive cases, report, stop (no execution)

## Output

> **DCP hygiene:** Before reporting, compress closed reads per `dcp-hygiene`. Skip if unavailable.

1. **Source artifacts** (spec/contract/mockup)
2. **Cases derived** (count by type: spec/contract/ui/workflow)
3. **Coverage review findings** (per artifact: any requirement/operation/state without a case?)
4. **Execution results** (per case: PASS/FAIL, observed vs expected, evidence file path)
5. **Screenshot/DOM/network evidence index** (file paths)
6. **Defects found** (each FAIL → route to `/defect`)
7. **Next step:** all PASS → feed `/release-gate`; FAILs → `/defect`

Write to `.pi/artifacts/$SLUG/black-box-test-report.md` (or inline).

## Related Commands

| Need              | Command         |
| ----------------- | --------------- |
| Test API from contract | `/api-test` |
| Triage a finding  | `/defect`       |
| Release sign-off  | `/release-gate` |
| QA metrics        | `/qa-report`    |

## Related Skills

- `black-box-qa-playbook` — Black-box lane router + evidence pattern
- `spec-based-testing` — RTM from requirements
- `contract-testing` — Schema as oracle
- `exploratory-testing` — Charter + heuristics
- `api-testing` — Request execution
- `test-case-design` — Design techniques from spec
- `playwright` — CLI + screenshot execution
