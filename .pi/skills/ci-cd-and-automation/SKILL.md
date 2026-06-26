---
name: ci-cd-and-automation
description: Use when setting up CI/CD pipelines, GitHub Actions workflows, automated testing in CI, or deployment automation — covers pipeline design, caching, secrets management, and release workflows
---

# CI/CD & Automation

> **Replaces** manual deployment checklists and ad-hoc scripts with repeatable, auditable automation pipelines

## When to Use

- Setting up or modifying CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- Adding automated testing, linting, or type-checking to a repository
- Configuring deployment automation or release workflows
- Optimizing CI performance (caching, parallelism, conditional runs)

## When NOT to Use

- Local development scripts (use Makefile or package.json scripts)
- One-time migration scripts that don't repeat
- Infrastructure provisioning (use infrastructure-as-code tools directly)

## Overview

CI/CD pipelines are the quality gates between code and production. A well-designed pipeline catches problems early, runs fast, and deploys safely.

**Core principle:** Every step that a human does manually before merging or deploying should be automated in the pipeline. If it can be automated, it must be.

**Shift Left:** Catch problems as early in the pipeline as possible. A bug caught in linting costs minutes; the same bug caught in production costs hours. Move checks upstream — static analysis before tests, tests before staging, staging before production.

**Faster is Safer:** Smaller batches and more frequent releases reduce risk, not increase it. A deployment with 3 changes is easier to debug than one with 30. Frequent releases build confidence in the release process itself.

## Pipeline Design

### Verification Pipeline (PR/Push)

```yaml
# Ordered by speed: fastest gates first
steps:
  1. Lint          # seconds — catches formatting/style issues
  2. Typecheck     # seconds — catches type errors
  3. Unit tests    # seconds-minutes — catches logic bugs
  4. Build         # minutes — catches compilation issues
  5. Integration   # minutes — catches integration bugs
  6. E2E tests     # minutes — catches user-facing bugs (optional per-PR)
```

**Fail-fast rule:** Run cheapest checks first. Don't waste 10 minutes on E2E tests if linting fails in 5 seconds.

**No gate can be skipped.** If lint fails, fix lint — don't disable the rule. If a test fails, fix the code — don't skip the test.

### Deployment Pipeline (Main/Release)

```
1. All verification steps pass
2. Build production artifacts
3. Deploy to staging
4. Run smoke tests against staging
5. Deploy to production (manual gate or auto)
6. Run smoke tests against production
7. Monitor error rates for rollback window
```

## GitHub Actions Patterns

### Basic PR Verification

```yaml
name: verify
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".node-version"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

### Caching Strategy

| What         | Cache Key         | Restore Key | Impact       |
| ------------ | ----------------- | ----------- | ------------ |
| Dependencies | `lockfile hash`   | `os-deps-`  | 30-60s saved |
| Build output | `source hash`     | `os-build-` | 1-5min saved |
| Test cache   | `test files hash` | `os-test-`  | Variable     |

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```

### Parallel Jobs

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [checkout, setup, "pnpm lint"]

  typecheck:
    runs-on: ubuntu-latest
    steps: [checkout, setup, "pnpm typecheck"]

  test:
    runs-on: ubuntu-latest
    steps: [checkout, setup, "pnpm test"]

  build:
    needs: [lint, typecheck, test] # Only build after all checks pass
    runs-on: ubuntu-latest
    steps: [checkout, setup, "pnpm build"]
```

## Feeding CI Failures Back to Agents

The power of CI with AI agents is the feedback loop. When CI fails, feed the failure back to your coding agent so it can fix and re-verify locally before pushing again.

```
CI fails
    │
    ▼
Copy the failure output
    │
    ▼
Feed it to the agent:
"The CI pipeline failed with this error:
[paste specific error]
Fix the issue and verify locally before pushing again."
    │
    ▼
Agent fixes → pushes → CI runs again
```

**Key patterns:**

```
Lint failure → Agent runs `npm run lint --fix` and commits
Type error  → Agent reads the error location and fixes the type
Test failure → Agent follows the debugging-and-error-recovery skill
Build error → Agent checks config and dependencies
```

## Secrets Management

| Rule                                       | Reason                                        |
| ------------------------------------------ | --------------------------------------------- |
| Never echo secrets in CI logs              | Logs are often accessible to all contributors |
| Use GitHub Secrets / environment variables | Encrypted at rest, masked in logs             |
| Rotate secrets on exposure                 | Assume compromised if ever logged             |
| Separate secrets per environment           | Staging keys ≠ production keys                |
| Use OIDC for cloud providers               | No long-lived credentials needed              |

CI should never have production secrets. Use separate secrets for CI testing.

## Release Automation

### Semantic Versioning

```
MAJOR.MINOR.PATCH
  │      │     └── Bug fixes (backward compatible)
  │      └──────── New features (backward compatible)
  └─────────────── Breaking changes
```

### Tag-Based Release

```yaml
on:
  push:
    tags: ["v*"]
jobs:
  release:
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
      - run: pnpm publish # or deploy
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

## Deployment Strategies

### Preview Deployments

Every PR gets a preview deployment for manual testing:

```yaml
# Deploy preview on PR (Vercel/Netlify/etc.)
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy preview
      run: npx vercel --token=${{ secrets.VERCEL_TOKEN }}
```

### Feature Flags

Feature flags decouple deployment from release. Deploy incomplete or risky features behind flags so you can:

- **Ship code without enabling it.** Merge to main early, enable when ready.
- **Roll back without redeploying.** Disable the flag instead of reverting code.
- **Canary new features.** Enable for 1% of users, then 10%, then 100%.
- **Run A/B tests.** Compare behavior with and without the feature.

```typescript
// Simple feature flag pattern
if (featureFlags.isEnabled('new-checkout-flow', { userId })) {
  return renderNewCheckout();
}
return renderLegacyCheckout();
```

**Flag lifecycle:** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Flags that live forever become technical debt — set a cleanup date when you create them.

### Staged Rollouts

```
PR merged to main
    │
    ▼
  Staging deployment (auto)
    │ Manual verification
    ▼
  Production deployment (manual trigger or auto after staging)
    │
    ▼
  Monitor for errors (15-minute window)
    │
    ├── Errors detected → Rollback
    └── Clean → Done
```

### Rollback Plan

Every deployment should be reversible:

```yaml
# Manual rollback workflow
name: Rollback
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          # Deploy the specified previous version
          npx vercel rollback ${{ inputs.version }}
```

## Automation Beyond CI

### Dependabot / Renovate

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

### Build Cop Role

Designate someone responsible for keeping CI green. When the build breaks, the Build Cop's job is to fix or revert — not the person whose change caused the break. This prevents broken builds from accumulating while everyone assumes someone else will fix it.

### PR Checks

- **Required reviews:** At least 1 approval before merge
- **Required status checks:** CI must pass before merge
- **Branch protection:** No force-pushes to main
- **Auto-merge:** If all checks pass and approved, merge automatically

## CI Performance Optimization

| Technique              | Savings                   | Effort                 |
| ---------------------- | ------------------------- | ---------------------- |
| Dependency caching     | 30-60s per run            | Low — add cache action |
| Parallel jobs          | 50-70% of sequential time | Low — split into jobs  |
| Conditional runs       | Skip unchanged paths      | Medium — path filters  |
| Build artifact caching | 1-5min per run            | Medium — cache config  |
| Self-hosted runners    | Faster hardware           | High — infrastructure  |

## Common Rationalizations

| Excuse                              | Rebuttal                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| "CI is slow, I'll test locally"     | Local tests miss environment-specific issues. Optimize CI instead of skipping it. |
| "We can add CI later"               | Every merged PR without CI is a potential regression. Set up day one.             |
| "The pipeline is too complex"       | Complexity means you're catching real issues. Simplify steps, not coverage.       |
| "Manual deploy is faster"           | Until someone deploys the wrong branch. Automation prevents human error.          |
| "Caching is premature optimization" | 5 minutes saved per PR × 20 PRs/week = 100 minutes/week. Cache from day one.      |
| "This change is trivial, skip CI"   | Trivial changes break builds. CI is fast for trivial changes anyway.              |
| "The test is flaky, just re-run"    | Flaky tests mask real bugs and waste everyone's time. Fix the flakiness.          |
| "Manual testing is enough"          | Manual testing doesn't scale and isn't repeatable. Automate what you can.         |

## Red Flags — STOP

- CI pipeline takes >15 minutes for a PR check
- Secrets hardcoded in workflow files
- No caching configured despite slow builds
- Tests skipped in CI "to save time"
- Manual deployment steps in the release process
- No rollback mechanism for failed deployments
- CI failures ignored or silenced
- Production deploys without staging verification

## Verification

- [ ] All verification steps run on every PR
- [ ] Pipeline fails fast (cheapest checks first)
- [ ] Dependencies are cached
- [ ] Secrets are never printed in logs
- [ ] Release process is tag-triggered and automated
- [ ] Rollback procedure is documented and tested
- [ ] CI results feed back into the development loop

## See Also

- **verification-gates** — Detecting project type and running appropriate checks
- **git-workflow-and-versioning** — Branch strategy and commit conventions
- **security-and-hardening** — Secrets management and supply chain security
- **debugging-and-error-recovery** — Triage CI failures fed back to the agent