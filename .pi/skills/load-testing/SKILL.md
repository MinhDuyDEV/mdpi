---
name: load-testing
description: "Use when running performance/load/stress/soak tests against budgets — k6 load profiles, Lighthouse CI for UI, stress/soak to find breaking points. Distinct from performance-optimization which teaches OPTIMIZING code; this teaches TESTING performance under load and gating on budgets. Load for /nfr perf dimension or when adding endpoints."
---

# Load Testing

> **Tests** performance under load and **gates** on budgets — distinct from `performance-optimization` which teaches optimizing code after a regression is found.

## When to Use

- Adding or modifying API endpoints — run a load profile before merging
- Making UI changes that affect Core Web Vitals — run Lighthouse CI
- Before a release that touches hot paths, data queries, or external integrations
- As part of NFR testing for the performance dimension (`/nfr perf`)
- When setting up performance budgets for the first time
- When investigating a performance regression suspected to be load-related

## When NOT to Use

- Optimizing code after a regression is found (use `performance-optimization`)
- Adding production monitoring or observability (use `observability-and-instrumentation`)
- Setting up CI/CD pipelines (use `ci-cd-and-automation`)
- Profiling a single-request bottleneck (use `performance-optimization` — measure-first workflow)
- When no load test suite exists and no endpoints have changed — report the gap and recommend adding k6/Lighthouse profiles. Do not read source code for static analysis.

## Overview

Load testing finds performance defects that single-request profiling misses: concurrency issues, memory leaks under sustained load, database connection pool exhaustion, and breaking points. Run four profiles: **load** (expected peak), **stress** (beyond peak → break), **soak** (sustained → leaks), and optionally **spike** (sudden bursts).

**Core principle:** Run against realistic load profiles. Gate on budgets (thresholds fail the build). Find the breaking point before traffic finds it for you.

## Load Test Types

| Type | Profile | Duration | What It Finds |
|------|---------|----------|---------------|
| **Load** | Expected peak throughput (e.g., 100 req/s) | 5–15 min | Response times under normal peak, error rates, whether budgets hold |
| **Stress** | 1.5x–3x expected peak, stepped increases | 10–20 min | Breaking point — at what concurrency does the system fail? What fails first? (DB, API, memory?) |
| **Soak** | Sustained expected load (or slightly above) | 1–24 hours | Memory leaks, connection pool leaks, slow resource exhaustion, garbage collection thrash |
| **Spike** | Sudden 5x–10x burst, then settle | 1–5 min bursts | Auto-scaling response, queue buildup, cold starts, circuit breaker behavior |
| **Break-point** | Ramp up until failure | Until failure | Maximum capacity, failure mode, recovery time |

## k6 Essentials

### Script Structure

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const failureRate = new Rate('http_req_failed');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs
    { duration: '5m', target: 50 },   // Stay at 50 VUs (LOAD)
    { duration: '2m', target: 200 },  // Ramp to 200 VUs (STRESS)
    { duration: '5m', target: 200 },  // Stay at 200 VUs
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // PASS/FAIL gates — these fail the build if breached
    http_req_duration: ['p(95)<200', 'p(99)<500'],   // p95 < 200ms, p99 < 500ms
    http_req_failed: ['rate<0.01'],                   // < 1% errors
    'response_time': ['max<1000'],                    // custom: max < 1s
  },
};

export default function () {
  const res = http.get('https://staging.example.com/api/search?q=test');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

### Running k6

```bash
# Run locally
k6 run load-test.js

# Run with output for analysis
k6 run --out json=load-test-results.json load-test.js

# Fail the build if thresholds breached
k6 run --threshold http_req_duration:--  load-test.js
```

### Key Thresholds as Gates

| Threshold | Budget | Why |
|-----------|--------|-----|
| `http_req_duration: p(95)<200` | p95 < 200ms | User-facing API should respond fast for most users |
| `http_req_duration: p(99)<500` | p99 < 500ms | Tail latency — the slowest 1% should still be acceptable |
| `http_req_failed: rate<0.01` | < 1% errors | No more than 1% of requests should fail under load |
| Custom: `checks: rate>0.99` | > 99% pass | Business-level assertions (status codes, response shape) |
| Custom: memory metric | < 80% RSS | No memory leak — baseline and compare across runs |

### What to Load Test

| Endpoint Type | Test Profile | Priority |
|---------------|-------------|----------|
| Public API (read) | Load + stress | High |
| Public API (write) | Load + soak | High |
| Search / listing | Load + stress + spike | High |
| Auth / login | Load | Medium |
| Background job | Soak | Medium |
| Admin-only endpoint | Load | Low |
| Third-party proxy | Load (with mock if external) | Medium |

## Lighthouse CI for UI Performance

```bash
# Install
npm install -g @lhci/cli

# Run and assert budgets
lhci autorun --config=lighthouserc.json
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "https://staging.example.com/",
        "https://staging.example.com/search"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance"]
      }
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "interaction-to-next-paint": ["error", {"maxNumericValue": 200}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["warn", {"maxNumericValue": 200}]
      }
    }
  }
}
```

### CI Assertion Levels

| Level | Meaning |
|-------|---------|
| `error` | Fails the build — budget breach is a release blocker |
| `warn` | Logs warning — does not fail build but flags for review |
| `off` | Skips the assertion — use only for metrics not yet measured |

### Core Web Vitals Budgets

| Metric | Good Budget | Warn Budget | Fails at |
|--------|-------------|-------------|----------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TBT | ≤ 200ms | ≤ 500ms | > 500ms |

## When No Load Test Suite Exists

Report the gap explicitly — no load test suite exists for the changed code. Recommend adding k6 or Lighthouse CI load profiles before the next release. Do NOT read source code for static analysis; static analysis is not a load test and requires source access outside the black-box lane.

## Regression Detection

Compare load test results against a baseline. Fail on budget breach.

```bash
# Run with baseline comparison
k6 run --summary-trend-stats="avg,p(95),p(99)" --out json=current-run.json load-test.js

# Compare against stored baseline
compare-load-results --baseline baseline.json --current current-run.json --threshold 1.2
```

| Budget | Baseline | Current | Verdict |
|--------|----------|---------|---------|
| p95 < 200ms | 180ms | 210ms | **FAIL** — breached budget |
| Error rate < 1% | 0.3% | 0.5% | PASS |
| p99 < 500ms | 350ms | 340ms | PASS |

A baseline must be from a comparable environment (same hardware, same data size). Baseline from local dev vs. CI staging are not comparable — use CI environment consistently.

## Common Rationalizations

| Excuse | Rebuttal |
|--------|----------|
| "It's fast on my machine" | Single-user latency on a dev machine is meaningless. Load test on realistic profiles with concurrency. |
| "We'll load test before launch" | Regressions ship between launches. Gate per-change on budgets. Load testing before launch catches launch-day problems too late to fix without delaying. |
| "No traffic yet, skip load testing" | Find the breaking point before traffic arrives. It's cheaper to discover during development than during an incident. |
| "Our users are internal, it's fine" | Internal apps still have peak hours, batch jobs, and concurrent usage. A stress test costs 30 minutes. |
| "We optimized everything" | Optimized single-request latency ≠ good under concurrency. Load test validates your optimizations work in production-like conditions. |
| "k6 thresholds are too strict" | Set realistic budgets based on measurement. Don't loosen thresholds — fix the performance regression. |
| "We'll monitor in production" | Production monitoring tells you AFTER users are impacted. Load test tells you BEFORE. |

## Red Flags — STOP

- Optimizing code without a load test to validate the improvement
- Performance budgets not enforced in CI (thresholds that don't fail the build are suggestions)
- No stress or soak test for long-running services (memory leaks are invisible in short load tests)
- Baselines from different environments compared directly (dev vs. staging results are not comparable)
- Load test targets only the happy path (unhappy paths under load — 404, validation errors — also matter)
- Thresholds set after the fact to pass current performance (thresholds should be aspirational, not descriptive)

## Verification

- [ ] Load test script exists for changed endpoints with thresholds as pass/fail gates
- [ ] At least one load profile run (load + stress for API changes, soak for long-running services)
- [ ] Thresholds enforced in CI (budget breach fails the build)
- [ ] Lighthouse CI run for UI changes with core web vital budgets
- [ ] Baseline comparison done (regression detected or confirmed clean)
- [ ] If no load test suite exists: gap reported with recommendation to add k6/Lighthouse profiles
- [ ] Soak test run for services that run continuously (memory leak check)
- [ ] Results documented with: test type, profile, thresholds pass/fail, any findings

## Skill Result Contract

```xml
<skill-result>
  <name>load-testing</name>
  <output>
    <tests>
      <load profile="50-VUs-5min" result="PASS" p95="180ms" p99="340ms" errors="0.3%" />
      <stress profile="200-VUs-5min" result="PASS" p95="195ms" p99="480ms" errors="0.8%" />
      <soak profile="50-VUs-2h" result="PASS" memory-stable="true" />
    </tests>
    <lighthouse-ci pages="2" lcp-pass="true" inp-pass="true" cls-pass="true" />
    <budgets>
      <threshold name="p95<200ms" result="PASS" />
      <threshold name="error-rate<1%" result="PASS" />
    </budgets>
  </output>
</skill-result>
```

## See Also

- **nfr-testing** — Orchestrator that routes to this skill for the performance dimension
- **performance-optimization** — Optimize code after a regression is found by load testing (complement)
- **observability-and-instrumentation** — Add production metrics to validate load test findings
- **ci-cd-and-automation** — Integrate k6 and Lighthouse CI into CI pipelines
- **performance-optimization** budgets — Set budgets before load testing, not after
