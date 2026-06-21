---
name: api-testing
description: "Use when testing REST/GraphQL APIs by sending requests and validating responses — black-box execution against the running API, no source needed. Covers request construction, response validation (status/headers/body), payload edge cases, auth/permission flows, pagination, and Playwright APIRequestContext/httpie/curl tooling. Distinct from contract-testing (schema conformance) and security-testing (vuln detection); this is REQUEST-EXECUTION testing. Load for /api-test or black-box API testing."
---

# API Testing

> Sends real requests to a running API and validates every layer of the response — status, headers, body, timing. The "execute the request" layer, distinct from contract conformance testing.

## When to Use

- Testing a REST or GraphQL API by sending requests and validating responses — no source access needed.
- You have a spec (OpenAPI, GraphQL schema, docs) and need to confirm the running API behaves correctly.
- Checking auth/permission boundaries, payload edge cases, or pagination behavior.
- You are in the black-box QA lane (load `black-box-qa-playbook` first if unsure).

## When NOT to Use

- Schema conformance against an OpenAPI/GraphQL spec without executing requests (use `contract-testing`).
- Security vulnerability scanning (use `security-testing`).
- Load/stress testing with concurrent users (use `load-testing`).
- Reading source to understand API behavior (white-box; load `code-review-and-quality`).

## Overview

**Core principle:** 200 OK is not a pass. Every response must be validated against an oracle — the spec, the contract, or the documented behavior. Black-box API testing judges responses from the outside: what went in vs what came out.

This skill is the **request-execution** layer in the API testing stack:

| Layer | Skill | What It Does |
|-------|-------|-------------|
| Contract conformance | `contract-testing` | Checks schema adheres to spec (OpenAPI, GraphQL introspection) |
| Request execution | **api-testing (this skill)** | Sends requests, validates responses against the oracle |
| Security | `security-testing` | Probes for OWASP Top 10 vulnerabilities |
| Performance | `load-testing` | Measures throughput, latency, breaking points |

## Request Construction

Every request has multiple parameters. Each is a validation concern.

| Parameter Location | What to Vary | Validation Concern |
|--------------------|-------------|-------------------|
| **Method** | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS | Correct method accepted? Wrong method gets 405? |
| **URL / path** | Valid path, typo, trailing slash vs no slash, URL-encoded chars | Correct resource reached? 404 on nonexistent path? |
| **Query params** | Present, absent, empty, multiple values, invalid type | Parsed correctly? Missing = skipped or error? |
| **Headers — Auth** | Valid token, expired token, missing header, malformed format | Auth accepted/denied correctly (401/403)? |
| **Headers — Content-Type** | `application/json`, `text/plain`, omitted | Correct parser selected? Wrong type = 415? |
| **Headers — Accept** | `application/json`, `text/xml`, `*/*`, omitted | Response format matches requested type? |
| **Body — JSON** | Complete, partial, extra fields, wrong types, empty object | Body parsed correctly? Extra fields ignored or rejected? |
| **Body — Form-data** | All fields, subset, file upload | Fields parsed; file received correctly? |
| **Body — Multipart** | Single part, multiple parts, parts in wrong order | Parts assembled correctly? |

## Response Validation (Core)

Every response is validated against four layers. A "passed" test validates all four.

### Status Code

| Code | Meaning | Check |
|------|---------|-------|
| 200  | OK | Body matches oracle |
| 201  | Created | `Location` header present |
| 202  | Accepted async | Body has status endpoint |
| 204  | No content | Empty body |
| 400  | Bad request | Body has field-level errors |
| 401  | Unauthenticated | Auth header missing/invalid |
| 403  | Forbidden | Auth worked, access denied |
| 404  | Not found | Path vs resource distinction |
| 405  | Method not allowed | `Allow` header valid methods |
| 409  | Conflict | Duplicate / version mismatch |
| 429  | Rate limited | `Retry-After` present? |
| 500+ | Server error | Flag as finding |

### Headers

| Header | Check | Oracle |
|--------|-------|--------|
| `Content-Type` | Matches Accept | Spec |
| `Cache-Control` | Policy correct | Spec |
| `RateLimit-*` | Present and documented | Spec |
| `Retry-After` | Present on 429/503 | Spec |
| `Location` | Present on 201/301/302 | Spec |
| `Set-Cookie` | Domain, path, flags | Spec |

### Body Shape

| Aspect | Validate | Oracle |
|--------|----------|--------|
| Schema | Body matches types | Delegate to `contract-testing` |
| Envelope | `data`/`meta`/`errors` consistent | Spec |
| Data | Values match expectations | Spec/docs |
| Timestamps | ISO 8601, consistent tz | Spec |
| IDs | UUID, integer, slug format | Spec |

### Timing

| Check | Threshold |
|-------|-----------|
| First-byte latency | Flag >1000ms CRUD, >3000ms reports |
| Timeout behavior | Should return 504 or 408, not hang |

## Payload Edge Cases

Test inputs at the boundaries of what the spec allows. Oracle = spec.

| Input Class | Examples | Expected |
|-------------|----------|----------|
| **Missing required** | POST without required field | 400 + error describing missing field |
| **Wrong type** | String where number expected | 400 + field-level error |
| **Empty string** | `""` for required string | 400 or rejected; never silently accepted |
| **Null** | `null` for required field | 400 or handled per spec |
| **Oversized** | String > maxLength, number > max | 400 or truncated per spec |
| **Special chars** | Unicode, emoji, control chars | Accepted or rejected with clear error |
| **Injection strings** | `' OR 1=1--`, `<script>` as INPUTS | Rejected or sanitized; never executed |
| **Boundary values** | min, max, 0, -1 | In-spec handled; out-of-spec rejected clearly |
| **Duplicate** | POST same resource twice | 409 Conflict or idempotent |
| **Extra fields** | Fields not in schema | Accepted and ignored? Or 400? Note finding |

## Auth / Permission Flows

Test every endpoint against every role defined in the docs.

| Test | Request Setup | Expected |
|------|--------------|----------|
| **Unauthenticated** | No auth header on a protected endpoint | 401 — never 200 or 403 |
| **Wrong role** | Valid token for Role A calling Role-B-only endpoint | 403 — distinct error from 401 |
| **Valid auth** | Valid token with correct role | 200 (or appropriate success code) |
| **Expired token** | Pass an expired JWT | 401 — never 500 |
| **Malformed token** | `Bearer abcdefg` (not a real token) | 401 — never 500 |
| **Token without scope** | Token valid but missing required scope | 403 — scope error, not auth error |
| **Token for deleted user** | Token issued to a user who was deleted | 401 — token invalidated |

**Test matrix pattern:** Generate one row per (endpoint × role × expected status). Flag any status that differs from the documented permission matrix.

## Pagination / Envelope

| Aspect | What to Test | Oracle |
|--------|-------------|--------|
| **Page/cursor variants** | Page=1, page=2, cursor=next, cursor=prev | Spec |
| **Page size** | Default, custom `?per_page=50`, check actual count | Spec |
| **Envelope shape** | `data`, `meta` (total, page, per_page), `links` (next/prev) | Spec |
| **Edge: page 0** | `?page=0` or `?page=1` | Should error or default to page 1 |
| **Edge: beyond last** | `?page=999999` or cursor beyond end | Empty `data` array, not 404 |
| **Edge: empty set** | Resource with no items | Empty `data` array, valid envelope |
| **Edge: single page** | Only one page of results | `links.next` absent or null |
| **Filter/sort with pagination** | Filtered + sorted list across pages | Consistent ordering across pages |

## GraphQL-Specific

GraphQL APIs require additional checks because the transport is a single POST endpoint.

| Aspect | What to Test | Oracle |
|--------|-------------|--------|
| **Operation** | Query, mutation, subscription — each tested separately | Spec/docs |
| **Variables** | Correct, missing, wrong type, null for non-null | Per-field error in `errors[]` |
| **Error shape** | `errors[].message`, `errors[].path`, `extensions.code` | GraphQL spec format |
| **200 with errors** | Status 200 but `errors[]` is non-empty | This IS valid GraphQL — still inspect `errors[]` |
| **Partial data** | Data returned alongside `errors[]` (null fields) | `errors[]` explains which fields failed and why |
| **Persisted queries** | Send hash instead of full query string | Works if spec supports; fails cleanly if not |
| **Depth/complexity** | Send a deeply nested query | Rejected with complexity error, not 500 |

**⚠️ GraphQL trap:** 200 OK with `errors[]` is valid GraphQL but still a finding. Always check `errors[]` even on 200 responses.

## Tooling (Black-Box, No Source)

All tools send requests and capture responses. No code inspection required.

| Tool | Use Case | Evidence Format |
|------|----------|-----------------|
| **Playwright APIRequestContext** | Preferred in this kit — send requests, capture status/headers/body from a browser-authenticated context | Body saved to `/tmp/bbqa-api-<case>.json` |
| **httpie** | Quick ad-hoc requests with colorized output | `http --print=Hhb` captures headers + body |
| **curl** | Universal, works everywhere | `curl -v -o /tmp/response.json -w "%{http_code}"` |
| **Postman / Newman** | Collection-based testing with CI integration | Collection runner output |

### Playwright APIRequestContext Pattern

```typescript
const api = await request.newContext({ baseURL: 'https://api.example.com' });
const resp = await api.get('/users?page=1', {
  headers: { Authorization: 'Bearer <token>' },
});

// Capture evidence, never inline payloads
const status = resp.status();   // expect 200
const headers = resp.headers(); // expect application/json
const body = await resp.json(); // save to /tmp/bbqa-api-<case>.json
```

## Evidence

Every API test produces status + headers + body.

| Artifact | Pattern | Content |
|----------|---------|---------|
| Response body | `/tmp/bbqa-api-<case>.json` | Full response (scrub secrets) |
| Headers | `/tmp/bbqa-api-<case>-headers.txt` | Response headers |
| Timing | `/tmp/bbqa-api-<case>-timing.txt` | Response time in ms |

**Per-case format:**

```text
CASE: bbqa-api-003 — POST /users missing 'email'
REQUEST: POST /users {"name": "Test"}
EXPECTED: 400 + 'email' is required
OBSERVED: 200 + user created with null email
RESULT: FAIL
EVIDENCE: /tmp/bbqa-api-003.json
```

## Common Rationalizations

| Rationalization | Rebuttal |
|----------------|----------|
| "200 means it worked" | 200 means it responded. Validate body against the oracle — incorrect data with 200 is still a finding. |
| "I'll test auth by logging in via the UI" | Test the API auth endpoint directly. UI path couples you to UI bugs. |
| "Edge cases are the devs' job" | Black-box QA's job is the edges the dev didn't think of. |
| "GraphQL errors return 200, so it's fine" | 200 with `errors[]` is valid GraphQL but still a finding. Always check `errors[]`. |
| "Headers don't matter — body is correct" | Headers control caching, auth, rate limiting — all testable. |
| "Pagination is boilerplate, skip it" | Pagination bugs (wrong totals, missing next links) are among the most common API defects. |
| "The spec is out of date — trust the code" | Flag the drift. The spec is the oracle until the team agrees otherwise. |

## Red Flags

- Only happy-path requests — no auth/permission matrix coverage.
- No payload edge cases tested (missing required, wrong types, empty strings, nulls, oversize).
- Responses validated by status code only — headers and body ignored.
- Response bodies not captured as evidence files.
- GraphQL `errors[]` ignored because status is 200.
- Pagination not tested across page boundaries.
- Auth tested on only one endpoint instead of the full permission matrix.
- Timing never measured — no baseline for performance regression.
- Tooling choice duplicates what `playwright` skill already defines.
- Results reported without PASS/FAIL classification and evidence paths.

## Verification

- [ ] Every endpoint tested with valid auth → status + body validated against oracle.
- [ ] Every endpoint tested without auth → 401.
- [ ] Permission matrix: each role × endpoint × expected status verified.
- [ ] Payload edge cases: missing required, wrong type, empty, null, oversize, special chars, boundary values.
- [ ] Pagination: page variants, envelope, edge cases (page 0, beyond last, empty set).
- [ ] GraphQL `errors[]` checked on every response — not just status code.
- [ ] Response timing captured per request.
- [ ] Evidence saved per case to `/tmp/bbqa-api-<case>.*`.
- [ ] Findings reported with expected vs observed, PASS/FAIL, and evidence path.

## Skill Result Contract

```xml
<skill_result>
  <skill>api-testing</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Per-case status/headers/body captures saved to /tmp/bbqa-api-*.json, aggregate PASS/FAIL report with evidence index</evidence>
  <artifacts>Request-response pairs, auth matrix results, payload edge-case results, pagination results</artifacts>
  <risks>Untested endpoints, uncovered auth roles, payload classes not exercised, oracle (spec) may be out of date, GraphQL depth/complexity not tested</risks>
</skill_result>
```

## See Also

- **black-box-qa-playbook** — Router: the black-box QA playbook that decides when to use this skill vs contract-testing vs spec-based-testing vs exploratory-testing
- **contract-testing** — Layer above: validates schema conformance (OpenAPI, GraphQL introspection) — distinct from this skill's request execution
- **test-case-design** — Use to design payload edge cases systematically (equivalence partitioning, boundary value analysis)
- **playwright** — Tool: Playwright APIRequestContext for request execution in this kit (referenced, not duplicated)
- **security-testing** — Security layer: injection, auth bypass, rate limiting (do not duplicate in this skill)
- **load-testing** — Performance layer: concurrent requests, ramp profiles, breaking points
- **production-hardening** — Reference: state coverage for API responses (empty/large/error shapes)
