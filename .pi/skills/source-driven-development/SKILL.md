---
name: source-driven-development
description: Grounds implementation decisions in official docs, source code, and cited references. Use when using unfamiliar libraries, external APIs, framework behavior, or current ecosystem guidance.
---

# Source-Driven Development

## Overview

Framework guesses become bugs. Source-driven work verifies behavior against authoritative references before implementation.

Core principle: cite the source for non-trivial external API decisions, or mark the decision as unverified.

Training data goes stale, APIs get deprecated, best practices evolve. This skill ensures the user gets code they can trust because every pattern traces back to an authoritative source they can check.

## When to Use

- New or unfamiliar library/framework/API.
- Version-specific behavior matters.
- Choosing between packages or integration patterns.
- Error suggests external API misuse.
- User asks to research current best practice.
- Building boilerplate, starter code, or patterns that will be copied across a project.
- Implementing features where the framework's recommended approach matters (forms, routing, data fetching, state management, auth).
- Any time you are about to write framework-specific code from memory.

## When NOT to Use

- Pure local codebase questions; use code search/explore.
- Stable project conventions already cover the behavior.
- Trivial syntax you can verify from existing code.
- Correctness does not depend on a specific version (renaming variables, fixing typos, moving files).
- Pure logic that works the same across all versions (loops, conditionals, data structures).
- The user explicitly wants speed over verification ("just do it quickly").

## Source Hierarchy

**Ranked sources (in order of authority):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official documentation | react.dev, docs.djangoproject.com, symfony.com/doc |
| 2 | Official blog / changelog / release notes | react.dev/blog, nextjs.org/blog |
| 3 | Maintained source code and examples | repo source, official examples repos |
| 4 | Web standards references | MDN, web.dev, html.spec.whatwg.org |
| 5 | Browser/runtime compatibility | caniuse.com, node.green |
| 6 | Maintainer-authored articles | posts by core maintainers |
| 7 | Community posts (only when higher sources are absent) | dated blog posts with caveats |

Higher-ranked sources win on conflicts.

**Not authoritative — never cite as primary sources:**

- Stack Overflow answers
- Blog posts or tutorials (even popular ones)
- AI-generated documentation or summaries
- Your own training data (that is the whole point — verify it)

## Workflow

```
DETECT ──→ FETCH ──→ IMPLEMENT ──→ CITE
  │          │           │            │
  ▼          ▼           ▼            ▼
 What       Get the    Follow the   Show your
 stack?     relevant   documented   sources
            docs       patterns
```

1. State the question precisely.
2. Detect the stack and exact versions (see Stack Detection below).
3. Check memory/local docs for prior decisions.
4. Retrieve authoritative sources for the relevant pattern.
5. Verify version compatibility with the project.
6. Compare sources if guidance conflicts.
7. Extract only the implementation-relevant facts.
8. Implement following the documented patterns.
9. Cite URLs or source refs in the recommendation.
10. Mark unresolved uncertainty explicitly.

## Stack Detection

Read the project's dependency file to identify exact versions:

```
package.json    → Node/React/Vue/Angular/Svelte
composer.json   → PHP/Symfony/Laravel
requirements.txt / pyproject.toml → Python/Django/Flask
go.mod          → Go
Cargo.toml      → Rust
Gemfile         → Ruby/Rails
```

State what you found explicitly:

```
STACK DETECTED:
- React 19.1.0 (from package.json)
- Vite 6.2.0
- Tailwind CSS 4.0.3
→ Fetching official docs for the relevant patterns.
```

If versions are missing or ambiguous, **ask the user**. Don't guess — the version determines which patterns are correct.

## Fetching Official Documentation

Fetch the specific documentation page for the feature you're implementing. Not the homepage, not the full docs — the relevant page.

**Be precise with what you fetch:**

```
BAD:  Fetch the React homepage
GOOD: Fetch react.dev/reference/react/useActionState

BAD:  Search "django authentication best practices"
GOOD: Fetch docs.djangoproject.com/en/6.0/topics/auth/
```

After fetching, extract the key patterns and note any deprecation warnings or migration guidance.

When official sources conflict with each other (e.g. a migration guide contradicts the API reference), surface the discrepancy to the user and verify which pattern actually works against the detected version.

## Implementing Following Documented Patterns

Write code that matches what the documentation shows:

- Use the API signatures from the docs, not from memory.
- If the docs show a new way to do something, use the new way.
- If the docs deprecate a pattern, don't use the deprecated version.
- If the docs don't cover something, flag it as unverified.

**When docs conflict with existing project code:**

```
CONFLICT DETECTED:
The existing codebase uses useState for form loading state,
but React 19 docs recommend useActionState for this pattern.
(Source: react.dev/reference/react/useActionState)

Options:
A) Use the modern pattern (useActionState) — consistent with current docs
B) Match existing code (useState) — consistent with codebase
→ Which approach do you prefer?
```

Surface the conflict. Don't silently pick one.

## Citing Your Sources

Every framework-specific pattern gets a citation. The user must be able to verify every decision.

**In code comments:**

```typescript
// React 19 form handling with useActionState
// Source: https://react.dev/reference/react/useActionState#usage
const [state, formAction, isPending] = useActionState(submitOrder, initialState);
```

**In conversation:**

```
I'm using useActionState instead of manual useState for the
form submission state. React 19 replaced the manual
isPending/setIsPending pattern with this hook.

Source: https://react.dev/blog/2024/12/05/react-19#actions
"useTransition now supports async functions [...] to handle
pending states automatically"
```

**Citation rules:**

- Full URLs, not shortened.
- Prefer deep links with anchors where possible (e.g. `/useActionState#usage` over `/useActionState`) — anchors survive doc restructuring better than top-level pages.
- Quote the relevant passage when it supports a non-obvious decision.
- Include browser/runtime support data when recommending platform features.
- If you cannot find documentation for a pattern, say so explicitly:

```
UNVERIFIED: I could not find official documentation for this
pattern. This is based on training data and may be outdated.
Verify before using in production.
```

Honesty about what you couldn't verify is more valuable than false confidence.

## Common Rationalizations

| Rationalization | Rebuttal |
| --- | --- |
| "I know this API" | APIs change; verify version-specific behavior. Confidence is not evidence. |
| "A blog said so" | Blogs lose to official docs/source. |
| "The package name is obvious" | Similar packages differ in security and maintenance. |
| "Citations slow us down" | A bad integration costs more than a source check. Hallucinating an API wastes more tokens than fetching it. |
| "The docs won't have what I need" | If the docs don't cover it, that's valuable information — the pattern may not be officially recommended. |
| "I'll just mention it might be outdated" | A disclaimer doesn't help. Either verify and cite, or clearly flag it as unverified. Hedging is the worst option. |
| "This is a simple task, no need to check" | Simple tasks with wrong patterns become templates. The user copies your deprecated form handler into ten components before discovering the modern approach exists. |

## Red Flags

- Unfamiliar API used without citation or local precedent.
- Community answer conflicts with official docs.
- Version in docs differs from package version.
- Agent invents options, flags, or imports.
- Research dump has no recommendation.
- Writing framework-specific code without checking the docs for that version.
- Using "I believe" or "I think" about an API instead of citing the source.
- Implementing a pattern without knowing which version it applies to.
- Citing Stack Overflow or blog posts instead of official documentation.
- Using deprecated APIs because they appear in training data.
- Not reading the dependency file (`package.json`, etc.) before implementing.
- Delivering code without source citations for framework-specific decisions.
- Fetching an entire docs site when only one page is relevant.

## Verification

After source-driven implementation:

- [ ] Framework and library versions were identified from the dependency file.
- [ ] Official documentation was fetched for framework-specific patterns.
- [ ] All sources are official documentation, not blog posts or training data.
- [ ] Code follows the patterns shown in the current version's documentation.
- [ ] Non-trivial decisions include source citations with full URLs.
- [ ] No deprecated APIs are used (checked against migration guides).
- [ ] Conflicts between docs and existing code were surfaced to the user.
- [ ] Anything that could not be verified is explicitly flagged as unverified.
- [ ] Key claims cite authoritative sources.
- [ ] Implementation recommendation is specific.

## Skill Result Contract

```xml
<skill_result>
  <skill>source-driven-development</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Sources consulted and version checks</evidence>
  <artifacts>Research notes, citations, implementation recommendation</artifacts>
  <risks>Unverified claims, stale docs, conflicting sources, or none</risks>
</skill_result>
```


## Consolidated Research Workflow

This is the canonical active source-grounding skill. It absorbs deep-research and source-code-research for normal work. Use opensrc, webclaw, context7, grepsearch, or gemini-large-context as tool-specific companions only when the source demands them.

Evidence hierarchy:
1. local code and tests;
2. official docs and source;
3. maintained examples from reputable repos;
4. blog posts or issues with dates and caveats.


## Removed Optional Companion

`v1-run` was removed as an optional package-health skill. Use source-grounded package evaluation, official advisories, lockfile inspection, and package-manager audit commands instead.