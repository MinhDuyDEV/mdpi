---
name: debugging-and-error-recovery
description: Guides root-cause debugging and safe recovery from failures. Use when tests fail, builds break, behavior is unexpected, or multiple fix attempts have not worked.
---

# Debugging & Error Recovery

## Overview

Random fixes create new bugs. Debugging must move from symptom to root cause to guarded fix.

Systematic debugging uses structured triage. When something breaks, stop adding features, preserve evidence, and follow a repeatable process to find and fix the root cause. Guessing wastes time.

Core principle: reproduce, localize, reduce, fix, and guard before claiming resolution.

## When to Use

- Test, lint, typecheck, build, or runtime failure.
- User reports a bug or unexpected behavior.
- A previous fix failed.
- Error crosses multiple layers or components.
- Multiple fix attempts have not worked.
- System behavior differs from the stated contract or recent baseline.
- A subagent reports that a verification step is blocked.

## When NOT to Use

- Feature work with no failure signal; use `incremental-implementation`.
- Pure research; use `source-driven-development`.
- Code review feedback without a failing signal; use `code-review-and-quality`.

## Stop-the-Line Rule

When a failure is observed, stop normal work immediately:

1. **STOP** adding features or making unrelated changes.
2. **PRESERVE** evidence (error output, logs, repro steps, commit hash, environment).
3. **DIAGNOSE** using the triage checklist.
4. **FIX** the root cause, not the symptom.
5. **GUARD** against recurrence with a regression test or monitor.
6. **RESUME** only after verification passes.

Do not resume feature work while a verified failure is unaddressed. The longer a bug sits, the more assumptions build on top of it.

## The Triage Checklist

### Step 1: Reproduce — Make the failure happen reliably

- Read the full error message and stack trace before acting.
- Capture relevant logs, request payloads, environment variables, and commit hashes.
- Run the failing command or scenario until it fails consistently.
- If the failure is intermittent, record frequency, timing, and environment differences.
- Document exact reproduction steps so another agent can replay them.
- If reproduction is impossible, document the evidence and move to the Non-reproducible bugs pattern.
- If the failure only happens in CI, reproduce in a matching container or environment before assuming it is environmental noise.
- Check whether the failure depends on a specific seed, order, or race condition.

### Step 2: Localize — Narrow down WHERE the bug lives

- Identify the failing layer: input validation, boundary, business logic, integration, environment.
- Use `git bisect` when the failure started recently and history is clean.
- For test failures: confirm whether the code under test changed or the test became stale.
- For build failures: identify whether it is a type error, import error, config error, dependency error, or environment error.
- For runtime errors: trace the call path from entry point to the thrown error.
- For unexpected behavior: compare actual output against expected behavior in the smallest observable scope.
- Ask: what is the last point where the state was still correct?
- Use available tools to gather evidence: read source near the error line, inspect callers and callees, search for related symbols, and check recent diffs.

### Step 3: Reduce — Create the minimal failing case

- Remove unrelated code, data, and configuration until the failure still occurs.
- Replace large inputs with the smallest input that triggers the bug.
- Run the reduced case in isolation to confirm it reproduces the original failure.
- A minimal case clarifies the root cause and becomes the basis of a regression test.
- If reduction is hard, bisect the inputs or the commit history to isolate the trigger.
- Keep a record of each reduction step so the investigation remains reversible.

### Step 4: Fix the Root Cause — Fix the underlying issue, not the symptom

- Ask "Why does this happen?" repeatedly until you reach the actual cause.
- Form one hypothesis and test it with one change or one diagnostic.
- Change one causal layer at a time.
- Avoid defensive patches that hide symptoms without fixing cause.
- Prefer the smallest fix that removes the failure and matches the intended design.
- If the fix requires touching multiple layers, verify each layer independently.
- Do not combine unrelated changes in the same commit as the bug fix.

### Step 5: Guard Against Recurrence — Write a test that catches this specific failure

- Add a regression test that fails without the fix and passes with it.
- If the bug cannot be tested directly, add an assertion, monitor, or lint rule that would have caught it.
- Update documentation or runbooks when the fix involves operational behavior.
- Make the guard visible: a passing test named after the bug is better than a comment.
- Ensure the guard runs in CI, not only locally.

### Step 6: Verify End-to-End — Confirm the failure is gone and nothing else broke

- Run the original reproduction scenario and confirm it passes.
- Run the new regression test.
- Run the relevant test suite, typecheck, lint, and build.
- Perform a manual spot check when the failure has UI or workflow behavior.
- If verification fails, return to Step 2 with fresh evidence.
- If three fix attempts fail, stop and escalate architecture or assumption risk.
- Document the verification commands used and their output.

## Error-Specific Patterns

### Test Failure

- Did you change code the test covers? The test may be outdated, or the code may have a bug.
- Check whether the test makes a brittle assumption about ordering, timing, or internal state.
- Do not skip or delete the test until you prove it is wrong.
- If the test is outdated, update it to match the new contract and verify the contract is intentional.
- If the test is flaky, isolate the source of flakiness rather than increasing retries.

### Build Failure

- **Type error**: check changed signatures, generics, and strict null checks.
- **Import error**: check moved files, missing exports, circular imports, and dependency versions.
- **Config error**: check changed config files, environment variables, and CI images.
- **Dependency error**: check lockfile drift, peer dependency ranges, and installed versions.
- **Environment error**: check Node/runtime version, OS differences, and CI vs local divergence.
- Treat build errors as runtime errors that happen earlier: the root cause is usually a recent change, not the build tool.

### Runtime Error

- **TypeError / null / undefined**: trace the value back to its source; add null checks only after understanding why it is missing.
- **Network / CORS**: verify endpoint, headers, credentials, and allowed origins.
- **Render error**: check component props, state lifecycle, and framework-specific boundaries.
- **Unexpected behavior**: compare actual vs expected outputs and reduce to a minimal assertion.
- **Performance regression**: measure before and after; do not optimize from intuition.
- **Memory leak**: look for unbounded caches, unremoved listeners, and retained closures.

### Non-reproducible bugs

- **Timing-dependent**: add logging, reduce concurrency, or introduce deterministic sequencing.
- **Environment-dependent**: compare CI, local, staging, and production configs and dependencies.
- **State-dependent**: capture full application state at failure time and replay against it.
- When a bug cannot be reproduced, document everything and add a monitor so the next occurrence is captured.
- Increase observability before the next attempt; guessing without data usually fails.
- Set a timebox for chasing a non-reproducible bug before switching to defensive guards.

## Safe Fallback Patterns

When a fix cannot be applied immediately or the root cause is still uncertain:

- Use safe defaults with warnings rather than broken features.
- Apply graceful degradation that preserves core functionality.
- Make the fallback observable so users and operators know something is wrong.
- Do not treat a fallback as a permanent substitute for a root-cause fix.
- Prefer returning an explicit error over silently returning corrupted or partial data.
- Log the fallback path and the conditions that triggered it.

## Evidence Log

For complex bugs, maintain a short log in the response or a debug artifact:

```markdown
## Symptoms
- ...
## Reproduction
- ...
## Hypotheses Eliminated
- ...
## Root Cause
- ...
## Fix and Guard
- ...
```

Use the log to keep the investigation honest. Each entry should contain a fact, not a guess. Share the log when escalating so the next agent can continue without starting over.

## Common Rationalizations

| Rationalization | Reality |
| --- | --- |
| "This is probably the issue" | Probably is a hypothesis, not evidence. Test it minimally. |
| "I'll patch the symptom now" | Symptom patches hide root causes and regress later. |
| "Multiple fixes will save time" | You will not know which change mattered. |
| "The test failure is unrelated" | Prove it with isolation before ignoring it. |
| "One more attempt" | After three failed fixes, the model is wrong. Stop and rethink. |
| "I know what the bug is, I'll just fix it" | You might be right 70% of the time. The other 30% costs hours. Reproduce first. |
| "The failing test is probably wrong" | Verify that assumption. Don't just skip it. |
| "It works on my machine" | Environments differ. Check CI, config, dependencies. |
| "I'll fix it in the next commit" | Fix it now. Next commit introduces new bugs on top. |
| "This is a flaky test, ignore it" | Flaky tests mask real bugs. Fix the flakiness. |

## Red Flags

- Code changes before reproduction.
- Fix proposed before reading the full error.
- Same failure persists after two attempts.
- New failures appear in different layers.
- Regression test is skipped for a reproducible bug.
- Success claimed without re-running the original failing scenario.
- Skipping a failing test to work on new features.
- Guessing at fixes without reproducing the bug.
- Fixing symptoms instead of root causes.
- No regression test added after a bug fix.
- Continuing feature work while a failure is unverified.
- Treating environment differences as unimportant.

## Verification Checklist

- [ ] Original failure is reproduced or documented as non-reproducible.
- [ ] Root cause is identified and documented with evidence.
- [ ] Fix addresses the root cause, not just symptoms.
- [ ] A regression test exists that fails without the fix.
- [ ] All existing tests pass.
- [ ] Build / lint / typecheck succeeds.
- [ ] The original bug scenario is verified end-to-end.
- [ ] Related tests and checks pass.
- [ ] No new failures appear in adjacent layers.
- [ ] Evidence log or debug notes are updated.

## Skill Result Contract

```xml
<skill_result>
  <skill>debugging-and-error-recovery</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Reproduction, root cause, fix, and verification commands</evidence>
  <artifacts>Changed files, tests, debug notes</artifacts>
  <risks>Non-reproducible behavior, missing regression test, or none</risks>
</skill_result>
```

## Consolidated Debugging Workflow

This is the canonical active debugging skill. It absorbs `systematic-debugging` while preserving root-cause discipline. Use `root-cause-tracing` as an advanced companion when the failure is deep in execution.

Required posture:

- reproduce or observe the failure before fixing;
- state the hypothesis and evidence;
- change one causal layer at a time;
- verify the failure mode is gone;
- record recovery actions and residual risk.

## How to Use Tools During Debugging

Use tool calls deliberately, not randomly:

- Read the error location and a few lines of surrounding code before hypothesizing.
- Search for the error message or symbol across the codebase to find related call sites.
- Inspect callers and callees of the failing function to understand data flow.
- Check recent commits and diffs when the failure is new.
- Run the exact failing command and capture full output.
- Use memory search to see if this failure or a similar one was recorded before.

Avoid changing code until the evidence points to a specific cause.

## Escalation Guidance

Escalate when any of the following are true:

- Three fix attempts have failed.
- The failure spans multiple services, repositories, or teams.
- The root cause points to an architectural assumption that needs a decision.
- The fix would require a breaking change or new dependency.
- The bug is security-sensitive or affects production data integrity.

When escalating, include the Evidence Log, the current hypothesis, and the commands that reproduce the failure.

## Short Example

A failing test reports `TypeError: Cannot read property 'name' of undefined`.

1. Reproduce: run the single test; it fails every time.
2. Localize: the undefined value comes from a mapper function that receives `user.profile`.
3. Reduce: pass the smallest payload that still triggers the undefined read.
4. Fix root cause: the upstream API now omits `profile` for guests; update the mapper to handle missing `profile`.
5. Guard: add a regression test with a guest payload.
6. Verify: run the new test without the fix to confirm it fails, then with the fix, then run the full suite.
