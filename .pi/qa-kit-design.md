# QA/QC Kit — Research & Design Analysis

> **Status:** Analysis & proposal (not yet implemented). Companion to `qa-inventory.md`.
> **Date:** 2026-06-20
> **Scope:** Build a dedicated QA/QC sub-kit (skills + prompts + workflows) that serves Quality Assurance (process/prevention) and Quality Control (product/detection), composing with — not duplicating — the existing kit.

---

## 1. Executive summary

The existing `.pi/` kit is **strong on per-change quality** — verifying a change is done (`verification-before-completion`, `/verify`), reviewing code (`code-review-and-quality`, `quality-loop`), debugging bugs (`debugging-and-error-recovery`, `/fix`), TDD discipline (`test-driven-development`), and building secure/performant/accessible code (`security-and-hardening`, `performance-optimization`, `fixing-accessibility`, `production-hardening`).

It is **weak on the QA/QC layer above per-change work**:

1. **Test strategy & design engineering** — *what* to test, at *which layer*, with *which cases*. TDD teaches order (test-first), not test design (equivalence partitioning, boundary values, decision tables, BDD/ATDD, coverage strategy).
2. **Non-functional TESTING as execution** — the kit teaches *building* secure/performant/accessible code, not *running* SAST/DAST/SCA, load/stress/soak, or axe-in-CI as QA activities with triage.
3. **Regression management** — implicit (fix adds a test); no suite curation, selection, or health.
4. **Defect management** — entirely absent (triage, lifecycle, process RCA, defect→regression loop).
5. **Quality metrics & QA reporting** — `QUALITY.md` is Fallow structural grades, not QA metrics (defect density, escape rate, DORA, flake rate).
6. **Release QA sign-off** — `shipping-and-launch` is release engineering (rollback, handoff); no unified go/no-go gate aggregating functional + NFR + regression + smoke.
7. **The QA/QC/Testing conceptual frame** — never explicitly defined; the kit blends them.
8. **AI-agent-specific QA** — gating agent output is well-covered (`agent-code-quality-gate`, `doubt-driven`, phantom detection); eval harnesses / golden tests / hallucination detection as dedicated techniques are not.

**Proposal:** a curated QA/QC sub-kit of ~14 skills, ~6 prompts, ~4 workflows, organized explicitly by the QA (prevention) / QC (detection) / Testing (verification) distinction, tiered by priority, composing with existing pieces. See §7–§8.

---

## 2. Method

- **First-hand read** of all core QA skills (`verification-before-completion`, `agent-code-quality-gate`, `code-review-and-quality`, `test-driven-development`, `testing-anti-patterns`, `debugging-and-error-recovery`, `root-cause-tracing`, `doubt-driven-development`, `security-and-hardening`, `performance-optimization`, `production-hardening`, `fallow`) and all QA-relevant prompts/workflows (`/verify`, `/audit`, `/gc`, `/fix`, `/ship`, `/close`; `quality-loop`, `audit-pattern`, `garbage-collection`, `batch-implement`, `development-lifecycle-workflow`).
- **Inventory** (`qa-inventory.md`): 29 skills + 5 workflows + 6 prompts cataloged with phase, risk, key techniques, QA-relevance tag, and a coverage matrix.
- **Industry research** (scout agent, 39 sources 2023–2026): test strategy/design, execution, NFR testing, review/static analysis, quality gates, defect management, metrics/observability, QA/QC/Testing distinction, AI-agent-specific QA, influential frameworks (ISTQB, ISO/IEC 25010, IEEE 829, DORA, BDD/TDD/ATDD, SDET).

---

## 3. Current state — inventory by layer

| Layer | Existing pieces | Strength |
|-------|-----------------|----------|
| Verification gate | `verification-before-completion` (Tier 1), `/verify`, `agent-code-quality-gate` | **Strong** — Iron Law, gate function, phantom detection, cache, Worker Distrust |
| Code review | `code-review-and-quality`, `quality-loop` workflow, `doubt-driven-development`, `ui-quality-audit`, `design-system-audit`, `deep-module-design` | **Strong** — 5-axis, severity P0–P3, score-gated loop |
| Testing discipline | `test-driven-development`, `testing-anti-patterns` | **Strong on order/anti-patterns**, weak on design (see §4) |
| Debugging | `debugging-and-error-recovery`, `root-cause-tracing`, `/fix` | **Strong** — 6-step triage, backward tracing |
| Build secure | `security-and-hardening`, `defense-in-depth` | **Strong on writing**, no testing execution |
| Build performant | `performance-optimization`, `react-best-practices`, `observability-and-instrumentation` | **Strong on optimizing**, no load testing |
| Build hardened UI | `production-hardening`, `fixing-accessibility` | **Strong on building**, no a11y testing execution |
| Static analysis | `fallow`, `/gc`, `garbage-collection` workflow, `/audit`, `audit-pattern` workflow | **Strong** — structural QC |
| Release eng | `shipping-and-launch`, `ci-cd-and-automation`, `deprecation-and-migration` | **Strong on release mechanics**, no QA sign-off gate |
| Process discipline | `behavioral-kernel`, `incremental-implementation`, `doubt-driven` (Tier 1 + others) | **Strong** |
| Browser tooling | `playwright`, `chrome-devtools`, `browser-testing-with-devtools` | **Tool-ops**, not test strategy |

Full detail: `qa-inventory.md`.

---

## 4. Honest coverage assessment (per QA lifecycle stage)

The inventory's coverage matrix lists many skills per stage, but several are **tangential**, not real coverage. Corrected assessment:

| Stage | Real coverage | Honest verdict |
|-------|---------------|----------------|
| Test Strategy (what/which layer/tiers/ownership) | None | **GAP** — TDD is order, not strategy |
| Test Design (case techniques, BDD/ATDD, IEEE 829) | None | **GAP** — biggest hole |
| Test Execution (tiering, selection, parallelization) | `/verify` runs the gate; `playwright` runs E2E | **Weak** — gate only, no tier/selection strategy |
| Regression | piecemeal (fix adds a test; TDD prevents) | **Weak** — no suite strategy/selection/health |
| Non-functional Perf testing | `performance-optimization` (optimize, not load-test) | **GAP** (execution) |
| Non-functional Security testing | `security-and-hardening` (build, not SAST/DAST/SCA run) | **GAP** (execution) |
| Non-functional A11y testing | `fixing-accessibility` (fix), `accessibility-audit` (deprecated), `ui-quality-audit` (score) | **GAP** (conformance testing execution) |
| Code Review | `code-review-and-quality`, `quality-loop`, `doubt-driven`, etc. | **Strong** |
| Static Analysis | `fallow`, `/gc`, `/audit` | **Strong** |
| Release Gating (QA sign-off) | `shipping-and-launch` (release eng), `quality-loop` (review loop) | **Partial** — no unified go/no-go |
| Defect Management | `debugging`/`root-cause-tracing` (code RCA only) | **GAP** — no triage/lifecycle/process-RCA |
| Quality Metrics | `fallow`/`QUALITY.md` (structural), `observability` (prod) | **GAP** — no QA metrics (defect density, escape, DORA, flake) |
| Process Discipline | Tier 1 + `doubt-driven` etc. | **Strong** |
| AI-agent QA | `agent-code-quality-gate`, `doubt-driven`, phantom detection | **Partial** — no eval harness/golden/hallucination-dedicated |

---

## 5. Industry research — key findings for AI-agent QA

1. **Velocity changes the constraint.** Agent-assisted dev produces 50+ PRs/week vs 5–10 traditional. Single-tier nightly regression is too slow; **tiered execution** (pre-merge smoke <5m, post-merge regression <20m, scheduled full) is the modern baseline.
2. **Test design techniques remain authoritative** (ISTQB): equivalence partitioning, boundary value analysis, decision tables, state transition, pairwise. These are agent-actionable (generate cases from specs).
3. **Test quality validation > coverage count.** Mutation testing (introduce bugs, verify tests catch them) and property-based testing (random inputs, invariant checks) prove tests actually test. Coverage reveals untested code, not test quality (Fowler).
4. **NFR testing is a distinct execution discipline**: SAST/DAST/SCA (Semgrep/CodeQL, ZAP, Trivy/Snyk), load/stress/soak (k6, Lighthouse), a11y (axe-core + manual matrix). OWASP Top 10:2025, WCAG 2.2 AA, ISO/IEC 25010 quality model.
5. **Quality gates are the primary defense** at agent velocity: pre-commit (typecheck/lint/format) → PR-time (unit+integration+affected E2E <10m) → release (smoke + critical journeys <15m). **DORA metrics** (deployment frequency, lead time, change failure rate, MTTR) are the gold standard.
6. **Defect management** has a standard lifecycle (discover→triage→assign→RCA→fix→verify→close); RCA techniques: 5-whys, fishbone, blameless postmortem. Defect→regression-test loop closes the system.
7. **Leading vs lagging metrics**: leading (code churn, coverage decay, flake rate, false-positive rate) predict; lagging (defect escape, MTTD, MTTR, defect density) report. Production observability is QA ("test in prod", synthetic monitoring).
8. **QA vs QC vs Testing distinction** (industry-standard): QA = process/prevention; QC = product/detection; Testing = verification against requirements. Organizing the kit by this distinction prevents the current blending.
9. **AI-agent-specific risks**: hallucinated APIs, plausible-but-wrong logic, over-engineering, nondeterministic drift, autonomous-edit regression. Mitigations: self-verification, golden/snapshot guardrails, eval harnesses (trajectory eval, LLM-as-judge), adversarial/doubt-driven review, deterministic execution environments. Tools: CodeHalu, CodeMirage, Anthropic evals, agentevals.
10. **BDD/TDD/ATDD + SDET** remain foundational; SDET role evolves toward agent-native QA (eval harnesses, agentic test infra).

Full source list: 39 references (IEEE Computer 2025, Shiplight AI 2026, Frontiers in AI 2025, OWASP 2025, ISO/IEC 25010:2023, DORA 2024, Anthropic evals 2026, etc.).

---

## 6. The QA / QC / Testing frame

The organizing model for the sub-kit (industry-standard, §5.8):

| Concept | Focus | Goal | Kit examples |
|---------|-------|------|--------------|
| **Quality Assurance (QA)** | Process | **Prevent** defects | test strategy, test design, coverage strategy, defect prevention, process RCA, QA metrics |
| **Quality Control (QC)** | Product | **Detect** defects | NFR testing, security/a11y/load testing execution, release readiness gate, flaky test detection |
| **Testing** | Verification | **Verify** against requirements | TDD (existing), test execution, regression, agent-output eval |

**Design rule for the sub-kit:** every new piece declares whether it is QA, QC, or Testing, and composes with — never duplicates — existing pieces.

---

## 7. Proposed QA/QC sub-kit

### 7.1 Design principles

- **Extend, don't duplicate.** Existing verify/review/debug/TDD/build-secure pieces stay canonical. New pieces add the missing strategy/design/testing-execution/sign-off/defect/metrics layers and *compose* with existing ones (e.g., `release-readiness` aggregates `/verify` output; `defect-workflow` delegates to `/fix`).
- **Declare QA/QC/Testing** for each piece (§6).
- **Curated, not exhaustive.** 14 skills / 6 prompts / 4 workflows, tiered by priority (§8). No speculative flexibility.
- **Idempotent & convention-compliant.** Frontmatter minimal (`name`+`description`), kebab-case, update `INDEX.md` routing, `/reload` to activate.
- **Smallest working change per phase.** Build Tier A first, verify it composes, then Tier B/C.

### 7.2 Proposed SKILLS (14)

**QA — process/prevention**

| # | Skill | Purpose | Fills gap | Composes with (avoids duplicating) | Phase | Risk |
|---|-------|---------|-----------|------------------------------------|-------|------|
| 1 | `qa-qc-framework` | Define QA vs QC vs Testing; map kit pieces to the model; the sub-kit's index/orientation skill | #7 | All — it's the router | Define | Low |
| 2 | `test-strategy` | Test pyramid/trophy, tiering (smoke/regression/full; pre-merge/post-merge/scheduled), ownership, what-layer-for-what-test | #1 strategy | `spec-driven-development` (strategy in spec), `test-driven-development` | Plan | Low |
| 3 | `test-case-design` | Equivalence partitioning, boundary value analysis, decision tables, state transition, pairwise; BDD/ATDD Gherkin scenarios; IEEE-829 test case format | #1 design | `test-driven-development` (design feeds RED), `spec-driven-development` | Plan/Build | Low |
| 4 | `coverage-strategy` | Meaningful coverage vs line coverage; mutation testing (validate tests catch bugs); property-based testing; coverage gating & decay tracking | #1 coverage | `test-driven-development`, `testing-anti-patterns`, `verification-before-completion` | Build/Verify | Medium |
| 5 | `regression-strategy` | Regression suite curation; impacted-test/regression selection; suite health (prune/dedup/flake) | #4 | `/verify`, `debugging-and-error-recovery` (fix→regression) | Verify | Low |
| 6 | `defect-management` | Bug lifecycle; severity vs priority triage; defect→regression-test loop; blameless postmortem / 5-whys / fishbone for **process** RCA | #5 | `root-cause-tracing` (code RCA — this is process RCA), `/fix` | Verify/Maintenance | Low |
| 7 | `qa-metrics` | Defect density, escape rate, DORA, test effectiveness, flake rate; leading vs lagging; QA report format | #6 | `fallow`/`QUALITY.md` (structural) — adds QA metrics layer | Maintenance | Low |

**QC — product/detection**

| # | Skill | Purpose | Fills gap | Composes with (avoids duplicating) | Phase | Risk |
|---|-------|---------|-----------|------------------------------------|-------|------|
| 8 | `nfr-testing` | Orchestrate non-functional testing as execution phases (perf + security + a11y + compatibility); when to run each; aggregate into release gate | #3 orchestration | `security-and-hardening`/`performance-optimization`/`fixing-accessibility` (build) — this is the TEST layer | Verify | Medium |
| 9 | `security-testing` | SAST/DAST/SCA execution (Semgrep, CodeQL, ZAP, Trivy, `npm audit`) + finding triage; distinct from `security-and-hardening` (build-secure) | #3 security | `security-and-hardening`, `/audit`, `fallow security` | Verify | High |
| 10 | `a11y-testing` | axe-core in CI, automated + manual test matrix, WCAG 2.2 AA conformance testing; distinct from `fixing-accessibility` (fix) | #3 a11y | `fixing-accessibility`, `ui-quality-audit`, `playwright` | Verify | Medium |
| 11 | `load-testing` | k6 load/stress/soak profiles, performance test design, thresholds; distinct from `performance-optimization` (optimize) | #3 perf | `performance-optimization`, `observability-and-instrumentation` | Verify | Medium |
| 12 | `release-readiness` | Go/no-go gate aggregating functional verify + NFR + regression + smoke + Definition of Done; distinct from `shipping-and-launch` (release eng) | #6 release QA | `/verify`, `shipping-and-launch`, `quality-loop` | Ship | High |
| 13 | `flaky-test-management` | Flaky test detection, retry-vs-fix decision, quarantine policy, find-the-polluter | #3 flaky | `debugging-and-error-recovery`, `/verify` | Verify/Maintenance | Low |

**Testing — AI-agent-specific (optional tier)**

| # | Skill | Purpose | Fills gap | Composes with | Phase | Risk |
|---|-------|---------|-----------|---------------|-------|------|
| 14 | `agent-output-qa` | Eval harness design, golden/snapshot tests as agent guardrails, hallucination detection as a dedicated technique, agent-behavior regression suite | #8 AI-agent | `agent-code-quality-gate`, `doubt-driven-development`, `verification-before-completion` | Review/Verify | Medium |

### 7.3 Proposed PROMPTS (6)

| Command | Purpose | Lifecycle | Loads skills | Invokes workflow |
|---------|---------|-----------|--------------|------------------|
| `/test` | Design + generate test strategy & cases for a feature/spec | Plan/Build | `test-strategy`, `test-case-design`, `coverage-strategy` | `test-strategy-workflow` |
| `/nfr` | Run non-functional testing suite (perf + security + a11y) with triage | Verify/Review | `nfr-testing`, `security-testing`, `a11y-testing`, `load-testing` | `nfr-testing-workflow` |
| `/release-gate` | Aggregate go/no-go release readiness | Ship | `release-readiness`, `regression-strategy` | `release-readiness-workflow` |
| `/defect` | Triage + process RCA + regression-test loop for a reported defect | Verify (utility) | `defect-management`, `root-cause-tracing`, `debugging-and-error-recovery` | `defect-workflow` |
| `/flake` | Detect & quarantine flaky tests | Maintenance | `flaky-test-management` | (direct; ≤threshold) |
| `/qa-report` | Generate QA metrics report/dashboard | Maintenance | `qa-metrics`, `fallow` | (direct) |

> Note: `/verify`, `/audit`, `/gc`, `/fix`, `/ship` remain canonical; new commands compose with them. `/release-gate` consumes `/verify` output; `/defect` delegates fixing to `/fix`.

### 7.4 Proposed WORKFLOWS (4)

| Workflow | Phases | Trigger | Invoked by | Purpose |
|----------|--------|---------|------------|---------|
| `test-strategy-workflow` | 3 + synthesis | Feature/spec needs test plan | `/test` | spec → test plan (pyramid/tiers) → test cases (design techniques) → coverage targets + regression set |
| `nfr-testing-workflow` | 3 + synthesis | Pre-release NFR sweep | `/nfr` | parallel: perf testing + security testing + a11y testing → aggregate findings + severity triage |
| `release-readiness-workflow` | 4 + synthesis | Pre-release go/no-go | `/release-gate` | parallel: functional verify (delegates `/verify`) + NFR results + regression + smoke → aggregate → go/no-go report |
| `defect-workflow` | 4 + synthesis | Reported defect needing triage/RCA | `/defect` | triage (severity/priority) → RCA (5-whys/fishbone) → fix (delegates `/fix`) → regression test → close + defect→regression loop |

### 7.5 Composition map (lifecycle, new + existing)

```
Define:  qa-qc-framework (new) → test-strategy (new, feeds /create spec)
Plan:    /test (new) → test-strategy-workflow (new); test-case-design (new); coverage-strategy (new)
Build:   test-driven-development (existing) ← fed by test-case-design (new); incremental-implementation (existing)
Verify:  /verify (existing) + regression-strategy (new) + flaky-test-management (new);
         /nfr (new) → nfr-testing-workflow (new) → security-testing/a11y-testing/load-testing (new)
Review:  code-review-and-quality (existing) + quality-loop (existing) + agent-output-qa (new)
Ship:    /release-gate (new) → release-readiness-workflow (new) → release-readiness (new, aggregates /verify + NFR + regression)
         → shipping-and-launch (existing, release eng) → /close (existing)
Maint:   /gc (existing) + /flake (new) + /qa-report (new, qa-metrics) + /defect (new, defect-management)
```

**Key composition rules:**
- `release-readiness` / `/release-gate` **consumes** `/verify` output — never redefines gates.
- `defect-workflow` **delegates** fixing to `/fix` — never redefines debug.
- `nfr-testing` skills are the **execution** counterpart to existing **build** skills (security-and-hardening → security-testing; performance-optimization → load-testing; fixing-accessibility → a11y-testing).
- `qa-qc-framework` is the **router** that points to both new and existing pieces by the QA/QC/Testing frame.

---

## 8. Recommended phasing / priority

| Tier | Skills | Prompts | Workflows | Why first |
|------|--------|---------|-----------|-----------|
| **A — Foundation (build first)** | `qa-qc-framework`, `test-strategy`, `test-case-design`, `coverage-strategy`, `nfr-testing`, `release-readiness`, `defect-management` | `/test`, `/nfr`, `/release-gate`, `/defect` | `test-strategy-workflow`, `nfr-testing-workflow`, `release-readiness-workflow`, `defect-workflow` | Fills the 3 biggest gaps (test design, NFR testing, defect mgmt) + the organizing frame + release sign-off. Highest leverage. |
| **B — Specialization** | `regression-strategy`, `flaky-test-management`, `security-testing`, `a11y-testing`, `load-testing`, `qa-metrics` | `/flake`, `/qa-report` | — | Deepens NFR execution into per-discipline skills + regression/flake/metrics. |
| **C — AI-agent (optional)** | `agent-output-qa` | — | — | Eval harnesses / golden tests / hallucination detection. Build if agent-output regression is a real concern. |

**Build order within Tier A:** `qa-qc-framework` (router) → `test-strategy` + `test-case-design` + `coverage-strategy` (test design layer) → `nfr-testing` + `release-readiness` (QC execution + sign-off) → `defect-management`. Verify each composes before next.

---

## 9. Open decisions (need user input before building)

1. **Scope of this build** — Tier A only (7 skills / 4 prompts / 4 workflows), A+B (13/6/4), or A+B+C (14/6/4)?
2. **NFR granularity** — keep `security-testing`/`a11y-testing`/`load-testing` as separate skills (proposed), or fold into one `nfr-testing` skill with subsections? (Separate = clearer, more files; folded = fewer files, less routing.)
3. **Command naming** — accept `/test`, `/nfr`, `/release-gate`, `/defect`, `/flake`, `/qa-report`, or prefer a `/qa:*` namespace (e.g., `/qa:test`, `/qa:nfr`)?
4. **Integration depth** — should `/test` hook into the existing `/create`→`/plan` lifecycle (auto-run after `/create`), or stay a standalone utility invoked manually?
5. **Tier-1 promotion** — promote `qa-qc-framework` (or `test-strategy`) to Tier 1 auto-load, or keep all new skills Tier 2 on-demand? (Tier 1 = always in context, cost; Tier 2 = load when relevant.)
6. **Quality-metrics artifact** — extend `QUALITY.md` to include QA metrics (defect density, escape, DORA, flake) alongside Fallow grades, or create a separate `QA-METRICS.md`?
7. **`agent-output-qa` (Tier C)** — is agent-output regression/eval-harness a real need now, or defer?

---

## 10. Appendix — source highlights

IEEE Computer "Testing in the Generative AI Era" (2025) · Shiplight AI "AI-Native Test Strategy 6-Component Template" (2026) · Frontiers in AI "Test Pyramid 2.0" (2025) · OWASP Top 10:2025 · ISO/IEC 25010:2023 (SQuaRE) · IEEE 829 (test documentation) · DORA State of DevOps 2024 · Anthropic "Demystifying evals for AI agents" (2026) · langchain-ai/agentevals · Grafana k6 / Lighthouse docs · Semgrep/CodeQL/Trivy/ZAP docs · axe-core / WCAG 2.2 AA · ISTQB CTFL test design techniques. Full 39-source list in scout agent output.
