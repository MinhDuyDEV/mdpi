---
name: shipping-and-launch
description: Guides final readiness checks, rollback planning, documentation, and release handoff. Use when preparing to merge, deploy, release, or declare a development branch complete.
---

# Shipping & Launch

## Overview

Shipping should be boring because risk was removed earlier. The ship phase verifies readiness, documents what changed, and makes rollback possible.

Core principle: do not ship work that cannot be verified, explained, or rolled back. Every launch should be reversible, observable, and incremental.

## When to Use

- User says ship, merge, deploy, release, or finish.
- Before closing tracked work as complete.
- Before creating a PR or release notes.
- After build/review/QA phases pass.
- Deploying a feature to production for the first time.
- Releasing a significant change to users.
- Migrating data or infrastructure.
- Opening a beta or early access program.
- Any deployment that carries risk (all of them).

## When NOT to Use

- Work is still being implemented.
- Critical review findings are open.
- Verification cannot run and no user-approved exception exists.

## Workflow

1. Check worktree state and identify intended changes.
2. Confirm spec/plan acceptance criteria are met.
3. Run required verification or use a fresh valid verification stamp.
4. Run phantom completion checks for stubs, placeholders, and disconnected wiring.
5. Review security/secrets/configuration risk in the diff.
6. Confirm docs/ADRs/changelog updates are sufficient.
7. Define rollback path: revert commit, feature flag, migration rollback, or manual procedure.
8. Present ship options when action is irreversible: PR, merge, deploy, hold.
9. Record handoff/memory when useful.

## Pre-Ship Checklist

- Tests relevant to changed behavior pass.
- Build/typecheck/lint pass or exceptions are documented.
- No high-severity review findings remain.
- No secrets or local-only paths in diff.
- User-facing/API behavior is documented.
- Rollback path is clear.
- User approval exists for irreversible actions.

## Pre-Launch Checklist (Comprehensive)

Use this expanded checklist for production launches and risky deployments. Each section must be green before advancing.

### Code Quality

- [ ] All tests pass (unit, integration, e2e)
- [ ] Build succeeds with no warnings
- [ ] Lint and type checking pass
- [ ] Code reviewed and approved
- [ ] No TODO comments that should be resolved before launch
- [ ] No `console.log` debugging statements in production code
- [ ] Error handling covers expected failure modes

### Security

- [ ] No secrets in code or version control
- [ ] `npm audit` shows no critical or high vulnerabilities
- [ ] Input validation on all user-facing endpoints
- [ ] Authentication and authorization checks in place
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS configured to specific origins (not wildcard)

### Performance

- [ ] Core Web Vitals within "Good" thresholds
- [ ] No N+1 queries in critical paths
- [ ] Images optimized (compression, responsive sizes, lazy loading)
- [ ] Bundle size within budget
- [ ] Database queries have appropriate indexes
- [ ] Caching configured for static assets and repeated queries

### Accessibility

- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader can convey page content and structure
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Focus management correct for modals and dynamic content
- [ ] Error messages are descriptive and associated with form fields
- [ ] No accessibility warnings in axe-core or Lighthouse

### Infrastructure

- [ ] Environment variables set in production
- [ ] Database migrations applied (or ready to apply)
- [ ] DNS and SSL configured
- [ ] CDN configured for static assets
- [ ] Logging and error reporting configured
- [ ] Health check endpoint exists and responds

### Documentation

- [ ] README updated with any new setup requirements
- [ ] API documentation current
- [ ] ADRs written for any architectural decisions
- [ ] Changelog updated
- [ ] User-facing documentation updated (if applicable)

## Feature Flag Strategy

Ship behind feature flags to decouple deployment from release:

```typescript
// Feature flag check
const flags = await getFeatureFlags(userId);

if (flags.taskSharing) {
  // New feature: task sharing
  return <TaskSharingPanel task={task} />;
}

// Default: existing behavior
return null;
```

**Feature flag lifecycle:**

```
1. DEPLOY with flag OFF     → Code is in production but inactive
2. ENABLE for team/beta     → Internal testing in production environment
3. GRADUAL ROLLOUT          → 5% → 25% → 50% → 100% of users
4. MONITOR at each stage    → Watch error rates, performance, user feedback
5. CLEAN UP                 → Remove flag and dead code path after full rollout
```

**Rules:**
- Every feature flag has an owner and an expiration date
- Clean up flags within 2 weeks of full rollout
- Don't nest feature flags (creates exponential combinations)
- Test both flag states (on and off) in CI

## Staged Rollout

### The Rollout Sequence

```
1. DEPLOY to staging
   └── Full test suite in staging environment
   └── Manual smoke test of critical flows

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment succeeded (health check)
   └── Check error monitoring (no new errors)

3. ENABLE for team (flag ON for internal users)
   └── Team uses the feature in production
   └── 24-hour monitoring window

4. CANARY rollout (flag ON for 5% of users)
   └── Monitor error rates, latency, user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── Advance only if all thresholds pass (see table below)

5. GRADUAL increase (25% -> 50% -> 100%)
   └── Same monitoring at each step
   └── Ability to roll back to previous percentage at any point

6. FULL rollout (flag ON for all users)
   └── Monitor for 1 week
   └── Clean up feature flag
```

### Rollout Decision Thresholds

Use these thresholds to decide whether to advance, hold, or roll back at each stage:

| Metric | Advance (green) | Hold and investigate (yellow) | Roll back (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |

### When to Roll Back

Roll back immediately if:
- Error rate increases by more than 2x baseline
- P95 latency increases by more than 50%
- User-reported issues spike
- Data integrity issues detected
- Security vulnerability discovered

## Monitoring and Observability

### What to Monitor

```
Application metrics:
├── Error rate (total and by endpoint)
├── Response time (p50, p95, p99)
├── Request volume
├── Active users
└── Key business metrics (conversion, engagement)

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth (if applicable)

Client metrics:
├── Core Web Vitals (LCP, INP, CLS)
├── JavaScript errors
├── API error rates from client perspective
└── Page load time
```

### Error Reporting

Set up error capture at the framework boundary so production failures surface to your error tracking service, not user complaints:

```typescript
// Set up error boundary with reporting
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to error tracking service
    reportError(error, {
      componentStack: info.componentStack,
      userId: getCurrentUser()?.id,
      page: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Server-side error reporting
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  reportError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  });

  // Don't expose internals to users
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### Post-Launch Verification

In the first hour after launch:

```
1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)
```

## Rollback Strategy

Every deployment needs a rollback plan before it happens. Document it in the PR or release notes:

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```

## Common Rationalizations

| Rationalization | Rebuttal |
| --- | --- |
| "Tests passed earlier" | Fresh changes require fresh evidence or a valid unchanged-state stamp. |
| "Rollback is just git revert" | Migrations, flags, queues, and external state may need more. |
| "Docs can wait" | Shipped behavior without docs becomes support debt. |
| "Small release, no checklist" | Small releases still leak secrets and break config. |
| "It works in staging, it'll work in production" | Production has different data, traffic patterns, and edge cases. Monitor after deploy. |
| "We don't need feature flags for this" | Every feature benefits from a kill switch. Even "simple" changes can break things. |
| "Monitoring is overhead" | Not having monitoring means you discover problems from user complaints instead of dashboards. |
| "We'll add monitoring later" | Add it before launch. You can't debug what you can't see. |
| "Rolling back is admitting failure" | Rolling back is responsible engineering. Shipping a broken feature is the failure. |

## Red Flags

- Completion claim without verification evidence.
- Unresolved P0/P1 findings.
- No rollback plan for data or API changes.
- Changelog omits user-visible behavior changes.
- Deployment/merge attempted without explicit user approval.
- Placeholder/stub patterns remain in modified code.
- Deploying without a rollback plan.
- No monitoring or error reporting in production.
- Big-bang releases (everything at once, no staging).
- Feature flags with no expiration or owner.
- No one monitoring the deploy for the first hour.
- Production environment configuration done by memory, not code.
- "It's Friday afternoon, let's ship it".

## Verification

- Verification commands and outputs are recorded.
- Acceptance criteria are checked line-by-line.
- Phantom completion scan is clean or exceptions are explained.
- Rollback plan is documented.
- Final action is approved when irreversible.

## Skill Result Contract

```xml
<skill_result>
  <skill>shipping-and-launch</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Verification commands, acceptance audit, review status, rollback plan</evidence>
  <artifacts>Changelog, PR, release notes, handoff, or none</artifacts>
  <risks>Open findings, skipped checks, deployment risk, or none</risks>
</skill_result>
```


## Consolidated Branch Completion

`finishing-a-development-branch` was removed as a separate optional skill. Keep merge/PR/cleanup choices, release handoff, rollback planning, and completion evidence in this canonical shipping workflow.

## Verification

Before shipping:

- [ ] Rollback procedure is documented and tested
- [ ] Feature flags have kill switches configured
- [ ] Monitoring dashboards show real-time data
- [ ] Launch checklist items all have verification evidence
- [ ] On-call team is briefed on the deployment
- [ ] Staged rollout plan is documented (percentage, duration, abort criteria)

Before deploying:

- [ ] Pre-launch checklist completed (all sections green)
- [ ] Feature flag configured (if applicable)
- [ ] Rollback plan documented
- [ ] Monitoring dashboards set up
- [ ] Team notified of deployment

After deploying:

- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready

## See Also

- For the project-wide Definition of Done that every change must clear before this checklist, see your project's definition-of-done reference.
- For security pre-launch checks, see the `security-and-hardening` skill.
- For the performance pre-launch checklist, see the `performance-optimization` skill.
- For accessibility verification before launch, see the `fixing-accessibility` skill.