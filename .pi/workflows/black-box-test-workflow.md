---
description: Black-box test workflow for QA/QC without code access — derive tests from specs/contracts/mockups, execute via Playwright/MCP against the running app, capture screenshot + report evidence — distinct from the code-reading test-strategy-workflow
---

# black-box-test-workflow

For QA/QC who test **without reading source code** — derive test cases from specs, contracts (OpenAPI/GraphQL), mockups/Figma, and user-journey descriptions, then execute them against the **running application** using Playwright/MCP tooling, capturing screenshot + DOM + network evidence per case. This is the black-box counterpart to `test-strategy-workflow` (which assumes code access for coverage/dependency-graph analysis).

> **When to use:** QA/QC role with no code access; testing UI/workflow/API purely from docs + running app; contract-driven API testing; exploratory session-based testing.
> **Invoked by:** `/test --black-box` (or `/test` when no codebase/spec-with-implementation is available).
> **Composes with:** `contract-testing`, `spec-based-testing`, `exploratory-testing`, `black-box-qa-playbook`, `api-testing`, and existing `playwright` + `chrome-devtools` + `browser-testing-with-devtools` (tool execution — do NOT duplicate tool ops).

## Args

- `source` (required) — Path to spec/PRD, OpenAPI/GraphQL schema, mockup/Figma, or a feature description
- `--app-url` (required for execution phases) — Running app URL (e.g., `http://localhost:3000`)
- `--api-url` (optional) — API base URL for contract testing
- `--scope` (optional) — Limit to a flow/component
- `--mode` (optional) — `plan-only` (derive cases, no execution) | `execute` (default: both)

## Phases

### Phase 1: derive-from-artifacts
- **Agent:** plan
- **Concurrency:** 1
- **Depends on:** —
- **Tool:** `subagent` (single mode)
- **Skills:** `spec-based-testing`, `contract-testing`

**Prompt:**

```
Read the source artifacts: {source}. Derive black-box test cases WITHOUT reading implementation code.

If SPEC/PRD: build a Requirement Traceability Matrix (requirement → test case → acceptance criterion). For each requirement, derive cases via equivalence partitioning + boundary value analysis + state transition (from spec-based-testing skill). Name each case in behavior terms.

If OPENAPI/GRAPHQL: for each endpoint/operation, derive contract tests — status codes, response schema conformance, payload validation (required fields, types, constraints), examples match schema, error shapes. Cover happy + 4xx error + edge inputs (from contract-testing skill).

If MOCKUP/FIGMA/UI: derive visual + flow cases — layout matches mockup, states (empty/loading/error/success), copy matches, flows navigable, edge content (long text, 0/1/many items) (from black-box-qa-playbook skill).

If USER-JOURNEY DESCRIPTION: derive end-to-end workflow cases — happy path, branching flows, role/permission variations, data lifecycle (create→read→update→delete), abort/resume.

Return a structured case list to {phase_1_output}. Each case: ID, type (spec/contract/ui/workflow), inputs, expected result (from the artifact, not from code), oracle (how to judge pass/fail from the outside).
```

### Phase 2: review-coverage
- **Agent:** review
- **Concurrency:** 1
- **Depends on:** Phase 1
- **Tool:** `subagent` (single mode)

**Prompt:**

```
Adversarially review {phase_1_output} for black-box coverage gaps — WITHOUT reading code:
- Requirements in the spec with no case (under-testing)
- Contract operations with no error/edge case
- UI states missing (empty/loading/error/success/long-content/0-1-many)
- Workflow branches missing (abort, resume, permission denied, concurrent)
- Missing boundaries in numeric/string inputs (from the spec, not the code)
- Missing illegal state transitions (from the spec's state model)

Do NOT validate. Find gaps or state explicitly that you cannot find any after thorough examination. Return findings (critical/important/minor) to {phase_2_output}.
```

### Phase 3: execute
- **Agent:** general
- **Concurrency:** Dynamic (1 per case batch, min 1, max 5)
- **Depends on:** Phase 2
- **Tool:** `subagent` (parallel mode)
- **Skills:** `playwright` (UI/workflow cases), `api-testing` (contract cases), `chrome-devtools`/`browser-testing-with-devtools` (live evidence)

**Guard:** If `--mode plan-only`, skip Phase 3 and synthesize the plan only. If `--app-url` is missing for UI/workflow cases, skip those and report "no app URL — plan only".

**Prompt (per batch):**

```
Execute these black-box test cases against the running app at {app-url} (API at {api_url}).

For UI/WORKFLOW cases: use the playwright skill (CLI mode preferred for token efficiency). For each case:
1. Navigate to the starting state
2. Perform the steps
3. Capture a screenshot (save to /tmp/bbqa-<case-id>.png, use filename — never inline)
4. Capture DOM/console/network evidence if relevant (save to files)
5. Compare observed vs expected (from {phase_1_output} oracle) — PASS/FAIL with the screenshot as evidence

For API/CONTRACT cases: use the api-testing skill. For each case:
1. Send the request (method, URL, headers, body) via curl/httpie or playwright APIRequestContext
2. Capture status + headers + body
3. Validate against the contract (schema, status, error shape) — PASS/FAIL with the response as evidence

For EXPLORATORY (if a charter was specified): run a timeboxed session per exploratory-testing skill; log findings with screenshots.

Stay black-box: do NOT read source files, do NOT grep the codebase, do NOT inspect implementation. Judge only from the artifact oracle + the running app's observable behavior.

Return per-case results (PASS/FAIL + evidence file path + observed vs expected) to {phase_3_output}.
```

## Final Synthesis (Main Agent)

Aggregate into a black-box test report. Write to `.pi/artifacts/$SLUG/black-box-test-report.md`:

1. **Source artifacts** (spec/contract/mockup/journey)
2. **Cases derived** (count by type: spec/contract/ui/workflow)
3. **Coverage review findings** (from Phase 2, addressed or deferred)
4. **Execution results** (per case: PASS/FAIL, observed vs expected, evidence file path)
5. **Screenshot/DOM/network evidence index** (file paths under /tmp or artifacts)
6. **Defects found** (each FAIL → route to `/defect` for triage + RCA)
7. **Coverage gaps remaining** (artifacts with insufficient detail to derive cases — request clarification)

> **Post-workflow routing:** FAILs → `/defect "<description>" --attach <screenshot>`. Coverage gaps → ask for richer spec/contract. Passes → feed `/release-gate`.

## Invocation

```
run_workflow({ name: "black-box-test-workflow", args: { source: "<path or description>", app_url: "<url>", api_url: "<url or empty>", scope: "<dir or .>", mode: "plan-only|execute" } })
```

Typically invoked by `/test --black-box` or `/api-test`.
