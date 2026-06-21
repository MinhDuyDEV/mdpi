---
name: contract-testing
description: "Use when testing APIs from their contract (OpenAPI/GraphQL schema, response examples, consumer-driven contracts) WITHOUT reading implementation code — schema conformance, status codes, payload validation, error shapes, consumer-driven Pact-style contracts. Distinct from api-testing (request execution) and security-testing (vuln detection); this is CONTRACT CONFORMANCE from the spec. Load for /api-test or black-box API testing."
---

# Contract Testing (Black-Box)

> **The contract is the oracle.** Not the code, not the dev's word — the published contract. If the API doesn't match its contract, it's broken regardless of what the implementation does.

## When to Use

- Validating an API against its published OpenAPI / GraphQL / AsyncAPI spec
- Testing consumer-driven contracts (Pact) between microservices
- Before integrating with a third-party API — does it actually conform to its docs?
- As part of API stability gates: does a schema diff introduce breaking changes?
- Any time an API spec is the primary documentation and no source code is available

## When NOT to Use

- Testing request execution or authentication flows (use api-testing)
- Finding security vulnerabilities (use security-testing)
- Performance or load testing (use load-testing/integration-testing)
- Testing internal service logic you have source access to (use unit/integration tests)

## Overview

Contract testing answers one question: **Does the running API match its published contract?** The contract is the single source of truth. Implementation code is irrelevant to conformance — if the contract says `201 Created` and the API returns `200 OK`, that's a defect regardless of how well the code works.

**Core principle:** The published contract is the oracle. Every deviation from it is a bug, even if the response payload is "correct" by implementation standards.

## What Is a Contract?

| Type | What It Defines | Example |
|------|----------------|---------|
| **OpenAPI (Swagger)** | REST endpoints, request/response shapes, status codes, headers, auth schemes | `openapi: 3.0.3` spec with paths, schemas, examples |
| **GraphQL SDL** | Types, queries, mutations, subscriptions, return shapes, argument types | `type Query { users: [User!]! }` |
| **AsyncAPI** | Event-driven channels, message schemas, bindings | Kafka topic schemas, AMQP queue shapes |
| **Consumer-Driven Contract (Pact)** | Expected request → expected response for each consumer-provider pair | Pact file: "given X, when request Y, expect response Z" |
| **Response Examples** | Concrete request → expected response pairs embedded in the spec | OpenAPI `examples` or `example` field on schema objects |

## Contract Conformance Checks

Apply this checklist against every endpoint/channel against its contract.

| Check | What to Verify | Example Defect |
|-------|---------------|----------------|
| **Status code conformance** | Response status matches spec per scenario (success, error, edge case) | Spec says `201 Created`, API returns `200 OK` |
| **Response body schema** | Types, required fields, enums, format constraints match the schema | Spec says `email: string(format: email)`, API returns `"not-an-email"` |
| **Required fields present** | All fields marked `required` in the schema are present in the response | Spec says `id` is required, response omits it on some objects |
| **Enum values respected** | Response values are a subset of the declared enum | Spec says `status: [pending, active, cancelled]`, API returns `"archived"` |
| **Format constraints met** | Strings with `format: date`, `uri`, `email`, `uuid` conform to that format | Spec says `date-time`, API returns `"2024-01-01"` without time |
| **Nullable handling** | Nullable fields accept `null`; non-nullable fields never return `null` | Required non-nullable field returns `null` |
| **Error shape** | Error responses match documented structure (codes, messages, fields) | Error response returns internal trace instead of specified error object |
| **Headers** | Response headers match contract (Content-Type, RateLimit, custom) | Spec says `X-Request-Id` header, API omits it |
| **Pagination envelope** | Paginated responses match the expected shape (page, limit, total, items) | Spec says `{ data, meta: { total } }`, API returns flat array |
| **Examples reproduce** | Every example in the spec can be reproduced against the running API | Example payload fails validation when sent as request |
| **Auth conformance** | Protected endpoints reject unauthenticated requests with correct error code | Spec says `401`, API returns `403` for missing auth |

## Schema-Derived Test Cases

For each operation, derive test cases from the schema alone. Use test-case-design techniques (EP, BVA) on each field's domain.

| Schema Constraint | Test Cases to Derive | Example from `POST /users` |
|------------------|---------------------|----------------------------|
| `required: [name, email]` | Omit each required field → expect 422/400 | POST `{ email: "..." }` → expect 422 "name required" |
| `type: string, minLength: 1, maxLength: 100` | Empty string, 1 char, 100 chars, 101 chars | Name = "", "a", "a×100", "a×101" |
| `type: integer, minimum: 0, maximum: 999` | -1, 0, 1, 998, 999, 1000 | Age = -1, 0, 1, 998, 999, 1000 |
| `enum: [pending, active, cancelled]` | Each enum value, invalid value | Status = "pending", "active", "cancelled", "unknown" |
| `format: email` | Valid email, missing @, missing domain, empty | email = "a@b.co", "invalid", "" |
| `nullable: true` | Send `null` for the field | Sets a nullable `nickname` to `null` |
| `array: minItems: 1, maxItems: 10` | Empty array, 1 item, 10 items, 11 items | Tags = [], ["a"], ["a"×10], ["a"×11] |
| `additionalProperties: false` | Add an undeclared field | POST `{ ...valid, undeclaredField: "x" }` → expect 422 |
| `oneOf / anyOf` | Match each variant, omit discriminators | Send shape satisfying variant A, then variant B, then neither |
| `deprecated: true` | Use deprecated field → expect warning header or documented behavior | Call deprecated endpoint, verify response header |
| `readOnly: true` (in response) | Never send readOnly fields in requests | Send `id` in POST body → expect ignore or 422 |
| `writeOnly: true` (in request) | Never return writeOnly fields in responses | Verify `password` not returned in GET response |

## Consumer-Driven Contracts (Pact-Style)

In microservice architectures, the **consumer** defines the contract: "Given this state, when I send this request, I expect this response." The provider verifies against all consumer pacts.

### When to Use

| Scenario | Why |
|----------|-----|
| Multiple consumers for one provider | Each consumer defines its slice. Provider verifies all. |
| Independent deployability | Provider knows which changes break consumers. |
| Third-party APIs you consume | Write pact-style expectations; verify against their staging. |

### Concept, Not Full Tutorial

```
┌──────────────────┐         ┌──────────────────┐
│  Consumer tests  │ ──────▶ │     Pact file    │
│  (defines pact)  │         │ Consumer A → GET │
└──────────────────┘         │ /users → [User]  │
                             │ Consumer B → POST│
┌──────────────────┐         │ /users → 201     │
│ Provider verif.  │ ◀────── │                  │
│ (against pacts)  │         └──────────────────┘
└──────────────────┘
```

1. Consumer writes test that defines expected interactions → generates Pact file.
2. Pact file is published to a broker or shared.
3. Provider runs Pact verification — replays each interaction against the running provider.
4. If any interaction fails, the provider has broken a contract.

**Black-box note:** As a QA engineer, you may receive Pact files from consumer teams or write your own consumer-side tests. You do not need provider source code.

## Breaking-Change Detection from Contract Diff

When a spec changes (new version, amended PR), diff the old vs new contract and flag:

| Change | Type | Severity |
|--------|------|----------|
| Removed endpoint/path | Breaking | Critical |
| New required field | Breaking | Critical |
| Narrowed type (e.g., `string` → `enum` removing a value) | Breaking | Critical |
| Changed method (GET → POST) | Breaking | Critical |
| Changed status code (201 → 200) | Breaking | Major |
| Added enum value | Non-breaking | Low |
| Added optional field | Non-breaking | Low |
| Broadened type (enum → string) | Non-breaking | Medium (check consumers) |
| Deprecated field/endpoint | Non-breaking | Info |
| New endpoint | Non-breaking | Low |

**Gate:** Breaking changes must be flagged to consumer teams before deployment.

## Tooling (Black-Box — No Source Required)

| Tool | Use | Requires |
|------|-----|----------|
| **OpenAPI/Swagger Validator** | Validate a running API against an OpenAPI spec | OpenAPI spec URL, API base URL |
| **Schemathesis** | Auto-generate test cases from OpenAPI spec, find schema violations | OpenAPI spec |
| **Dredd** | Test OpenAPI spec examples against running API | OpenAPI spec + API URL |
| **Postman Collection Runner** | Run requests from collection, validate against saved examples | Postman collection (can import OpenAPI) |
| **GraphQL Inspector** | Validate query responses against schema, detect breaking schema changes | GraphQL endpoint + schema SDL |
| **Pact Verifier** | Verify provider against consumer pact files | Pact file(s) + provider base URL |
| **Spectral** | Lint OpenAPI/AsyncAPI specs for style + correctness (pre-deployment) | Spec file only (no running API) |
| **Optic** | Diff API specs for breaking changes, track API history | Two spec versions |
| **Stoplight** | Validate API responses against spec rules | Spec + API endpoint |

None of these tools require access to the API implementation source code.

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "The devs said it returns 200" | Verify against the contract, not hearsay. If the contract says 201, 200 is a defect. |
| "Examples in the spec are just illustrative" | If an example isn't reproducible, either the spec or the code is wrong — flag it. |
| "We'll document the contract later" | No contract = no conformance oracle. You're testing hearsay, not conformity. |
| "It works in production, that's good enough" | Working ≠ conformant. A response that works but violates the schema will break consumers who trust the contract. |
| "The schema is too strict, the API returns more fields" | Extra fields not in the spec are undocumented — consumers won't expect them. Flag as spec drift. |
| "Consumer-driven contracts are for devs" | QA owns provider verification — does the running provider satisfy all consumer pacts? |
| "Breaking changes are obvious, we don't need to diff" | Removed fields and narrowed types are invisible without a diff. Diff every spec change. |

## Red Flags

- Testing an API that has no written contract — no spec to validate against
- API examples in the spec cannot be reproduced against the running API
- Error responses that leak stack traces, internal codes, or unexpected fields not in the spec
- Status codes that drift from spec (200 everywhere instead of 201/204/4xx)
- Schema with no examples — cannot validate example reproducibility
- Required fields in the schema that are absent from responses
- Contracts that say `{...}` or "returns the object" without a defined shape
- Spec updates merged without a breaking-change review against the previous version

## Verification

- [ ] Every endpoint/channel has at least one request that validates status code + body + headers against contract
- [ ] All enum values in the spec are tested as inputs; invalid enum values produce documented error
- [ ] Required field omission tested per operation — documented rejection code returned
- [ ] Format constraints (email, uri, date-time, uuid) validated with invalid values
- [ ] Error responses match documented shape — no internal leaks
- [ ] Examples from the spec reproduce successfully against the running API
- [ ] Schema diff performed between previous and current spec version — breaking changes flagged
- [ ] Consumer-driven pacts, if present, are verified against the running provider
- [ ] Pagination/envelope shape matches contract for list endpoints
- [ ] Tooling (validator/schemathesis/dredd) run and report 0 contract violations

## Skill Result Contract

```xml
<skill_result>
  <skill>contract-testing</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Validation results from spec validator, schemathesis, or comparable tool showing conformance or violations</evidence>
  <artifacts>Contract spec (version under test), validation report with per-endpoint results, breaking-change diff</artifacts>
  <risks>Spec may be incomplete or out of date; contract conformance ≠ functional correctness; silent extra fields not in spec are invisible to validation</risks>
</skill_result>
```

## See Also

- **api-testing** — Request execution layer (contract testing tells you IF the API conforms; api-testing tells you if it works for a given scenario)
- **test-case-design** — EP, BVA, decision-table techniques used to derive schema-derived test cases
- **spec-based-testing** — Requirement traceability from API specs to test cases
- **security-testing** — Finds vulns; contract testing finds spec drift — complementary, not overlapping
- **exploratory-testing** — Fills gaps contract tests miss (state-based API bugs, sequencing)
