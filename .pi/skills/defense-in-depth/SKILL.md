---
name: defense-in-depth
description: Use when invalid data causes failures deep in execution, requiring validation at multiple system layers - validates at every layer data passes through to make bugs structurally impossible
---

# Defense-in-Depth Validation

> **Replaces** single-layer validation where bad data propagates silently until it causes cryptic failures deep in execution

## When to Use

- A bug is caused by invalid data flowing through multiple layers
- One validation check is insufficient because data crosses boundaries

## When NOT to Use

- Simple, single-layer validation at an obvious entry point is enough
- The issue is unrelated to invalid data or boundary checks

## Common Rationalizations

| Rationalization                                  | Rebuttal                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| "One validation at the entry point is enough"    | Different code paths, refactors, and mocks all bypass a single gate — each layer catches what others miss |
| "This adds too much boilerplate"                 | Each validation is 2-3 lines. The bug it prevents costs hours of debugging                                |
| "The caller already validates this"              | You don't control the caller. New callers won't know your assumptions                                     |
| "Tests will catch it"                            | Tests run after the fact. Validation prevents the bug from existing                                       |
| "This is an internal function, input is trusted" | Internal functions get called from new paths during refactors. Trust no input                             |

## Anti-Patterns

| Anti-Pattern                                             | Why It Fails                                  | Instead                                                      |
| -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Validating only at the entry point (trusting downstream) | Alternate paths and refactors bypass one gate | Add independent checks at each boundary                      |
| Duplicating identical validation at every layer          | Creates noise without improving safety        | Tailor each layer to boundary-specific invariants            |
| Catching and swallowing errors silently                  | Hides failures and delays detection           | Raise explicit errors with actionable context                |
| Mixing validation with business logic                    | Makes behavior hard to reason about and test  | Keep validation checks explicit and separate from core logic |

## Overview

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

## Why Multiple Layers

Single validation: "We fixed the bug"
Multiple layers: "We made the bug impossible"

Different layers catch different cases:

- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

## The Four Layers

### Layer 1: Entry Point Validation

**Purpose:** Reject obviously invalid input at API boundary

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === "") {
    throw new Error("workingDirectory cannot be empty");
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2: Business Logic Validation

**Purpose:** Ensure data makes sense for this operation

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error("projectDir required for workspace initialization");
  }
  // ... proceed
}
```

### Layer 3: Environment Guards

**Purpose:** Prevent dangerous operations in specific contexts

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === "test") {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
    }
  }
  // ... proceed
}
```

### Layer 4: Debug Instrumentation

**Purpose:** Capture context for forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug("About to git init", {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## Applying the Pattern

When you find a bug:

1. **Trace the data flow** - Where does bad value originate? Where used?
2. **Map all checkpoints** - List every point data passes through
3. **Add validation at each layer** - Entry, business, environment, debug
4. **Test each layer** - Try to bypass layer 1, verify layer 2 catches it

## Verification

- Test with invalid input at each layer boundary — each should reject independently.
- Remove one validation layer — the next layer should still catch the error.

## See Also

- `verification-before-completion` skill
- `behavioral-kernel` skill

## Red Flags

- Validation only at the outermost layer
- Trusting upstream data without verification
- Error handling that assumes valid input
- "This can never be null" comments without null checks
- Single-point validation in a multi-hop data flow

## Verification

After applying defense-in-depth:

- [ ] Validation exists at every system boundary data crosses
- [ ] Each layer validates independently, not relying on upstream guarantees
- [ ] Invalid data cannot reach the persistence or business logic layer
- [ ] Error handling at each layer is appropriate (not swallowing, not crashing)
- [ ] New validation rules have corresponding tests
