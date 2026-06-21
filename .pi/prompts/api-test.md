---
description: Test an API black-box by sending requests and validating responses against its contract/spec
argument-hint: "<api-url or openapi-path> [--scope <operation>] [--auth <token>] [--dry-run] [--help]"
---

# API Test: $ARGUMENTS

Test an API **black-box**: derive contract + payload cases from the OpenAPI/GraphQL schema (or description), send requests against the running API, and validate responses — without reading implementation code. Captures status/headers/body evidence per case.

> **Lifecycle:** Verify/Review utility. Black-box lane — no source access required.
> **Composes with:** `contract-testing` (schema as oracle), `api-testing` (request execution), `test-case-design` (EP/BVA on payloads), `playwright` (APIRequestContext). Invokes `black-box-test-workflow` in API mode.

## Parse Arguments

| Argument     | Default  | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `<api-url>`  | required | API base URL, or path to an OpenAPI/GraphQL schema   |
| `--scope`    | all      | Limit to an operation/path/operationId               |
| `--auth`     | —        | Auth token/header for protected endpoints            |
| `--dry-run`  | false    | Derive cases without sending requests                |
| `--help`     | false    | Show this usage                                      |

## Guard Phase

- Load `black-box-qa-playbook` + `contract-testing` + `api-testing` skills
- If a schema path given, verify it exists and parses (openapi: `npx @redocly/cli lint <path>`; graphql: parse SDL)
- If a URL given, confirm it's reachable (`curl -sS -o /dev/null -w "%{http_code}" <url>/health` or root)
- IRON RULE: do NOT read source files. The schema/contract + running API are the only oracles.

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `black-box-qa-playbook` | Always | Black-box lane router + evidence pattern |
| `contract-testing` | Always | Schema-derived cases + conformance oracle |
| `api-testing` | Always | Request execution + response validation |
| `test-case-design` | Always | EP/BVA on payload domains |
| `playwright` | Execution | APIRequestContext for send + capture (preferred) |
| `dcp-hygiene` | Output | Compress closed response bodies when `compress` available |

## Execution

### Direct Execution (≤5 operations)

For small APIs, execute directly: derive cases per operation, send via Playwright APIRequestContext (or curl/httpie), validate, capture evidence.

### Workflow Execution (>5 operations or full sweep)

Delegate to the `black-box-test-workflow` in API mode:

```
run_workflow({ name: "black-box-test-workflow", args: { source: "<schema path or description>", api_url: "<api-url>", scope: "<--scope or .>", mode: "plan-only|execute" } })
```

**Announce:** "Black-box API testing against: [api-url/schema]. Invoking black-box-test-workflow (API mode)."

### Per-Operation Test Derivation

For each operation (from the schema, not the code):
1. **Happy path**: valid request → expected 2xx + body matches schema
2. **Error paths**: missing required field, wrong type, invalid enum → expected 4xx + error shape matches contract
3. **Boundary inputs**: min/max/empty/oversized/special-chars per field domain (test-case-design EP/BVA)
4. **Auth/permission**: unauthenticated → 401; wrong role → 403; valid → 2xx
5. **Pagination/envelope**: page 0, beyond last, empty set (if paginated)
6. **GraphQL-specific** (if GraphQL): errors[] shape, variable validation, depth/complexity

### Evidence Capture

Per case: save status + headers + body to `/tmp/bbqa-api-<case-id>.json` (filename, never inline). Record observed vs expected (from the contract).

## Failure Handling

| Scenario | Action |
|----------|--------|
| Schema path not found / unparseable | Report, ask for valid schema or inline description |
| API unreachable | Report status, ask for correct URL or to start the app |
| Response doesn't match contract | Record FAIL with observed vs expected + evidence path → route to `/defect` |
| Auth required but `--auth` missing | Report 401s, ask for credentials |

## Stop Conditions

- Schema unparseable → stop, ask for valid contract
- API unreachable after 3 attempts → stop, report
- Every operation returns 500 → stop, report server error (route to `/defect`)
- `--dry-run` → derive cases, report, stop (no requests sent)

## Output

> **DCP hygiene:** Before reporting, if `compress` is available, compress closed response-body reads per `dcp-hygiene` — bodies are captured as evidence files. Skip if unavailable.

1. **API/schema audited** (operations × methods)
2. **Cases derived** (count by type: happy/error/boundary/auth/pagination)
3. **Execution results** (per case: PASS/FAIL, observed vs expected, evidence file path)
4. **Contract drift** (responses that don't match the schema — route to `/defect`)
5. **Coverage gaps** (operations with no case; schema with no examples → request clarification)
6. **Next step:** FAILs → `/defect "<description>" --attach <evidence>`; PASS → feed `/release-gate`

Write to `.pi/artifacts/$SLUG/api-test-report.md` (or inline).

## Related Commands

| Need              | Command         |
| ----------------- | --------------- |
| Full black-box    | `/test --black-box` |
| Triage a finding  | `/defect`       |
| Release sign-off  | `/release-gate` |

## Related Skills

- `black-box-qa-playbook` — black-box lane router + evidence pattern
- `contract-testing` — schema as oracle, conformance checks
- `api-testing` — request execution + response validation
- `test-case-design` — EP/BVA on payload domains
- `playwright` — APIRequestContext tool ops
- `security-testing` — if findings look like vulns (distinct: that's detection, this is conformance)
