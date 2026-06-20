---
name: react-best-practices
description: MUST load when writing, reviewing, or refactoring React/Next.js code for performance. Covers Vercel Engineering patterns — components, data fetching, bundle optimization, server components. Critical for any Next.js performance work.
---

# Vercel React Best Practices

## When to Use

- Applying performance guidelines to React 19 / Next.js 16 components or pages.
- Optimizing Server Components, data fetching, bundle size, and re-renders.

## When NOT to Use

- Non-React codebases or UI-free/backend-only changes.
- Server Actions and form patterns (use `react-server-actions` skill)
- App Router architecture (use `nextjs-app-router` skill)
- Next.js 16 caching (use `nextjs-cache` skill)
- State management (use `tanstack-query`, `zustand`, or `react-hook-form` skills)


## When to Apply

Reference these guidelines when:

- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category                  | Impact      | Prefix       |
| -------- | ------------------------- | ----------- | ------------ |
| 1        | Eliminating Waterfalls    | CRITICAL    | `async-`     |
| 2        | Bundle Size Optimization  | CRITICAL    | `bundle-`    |
| 3        | Server-Side Performance   | HIGH        | `server-`    |
| 4        | Client-Side Data Fetching | MEDIUM-HIGH | `client-`    |
| 5        | Re-render Optimization    | MEDIUM      | `rerender-`  |
| 6        | Rendering Performance     | MEDIUM      | `rendering-` |
| 7        | JavaScript Performance    | LOW-MEDIUM  | `js-`        |
| 8        | Advanced Patterns         | LOW         | `advanced-`  |

## Quick Reference

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` - Move await into branches where actually used
- `async-parallel` - Use Promise.all() for independent operations
- `async-dependencies` - Use better-all for partial dependencies
- `async-api-routes` - Start promises early, await late in API routes
- `async-suspense-boundaries` - Use Suspense to stream content

### 2. Bundle Size Optimization (CRITICAL)

- `bundle-barrel-imports` - Import directly, avoid barrel files
- `bundle-dynamic-imports` - Use next/dynamic for heavy components
- `bundle-defer-third-party` - Load analytics/logging after hydration
- `bundle-conditional` - Load modules only when feature is activated
- `bundle-preload` - Preload on hover/focus for perceived speed

### 3. Server-Side Performance (HIGH)

- `server-cache-react` - Use React.cache() for per-request deduplication
- `server-cache-lru` - Use LRU cache for cross-request caching
- `server-serialization` - Minimize data passed to client components
- `server-parallel-fetching` - Restructure components to parallelize fetches
- `server-after-nonblocking` - Use after() for non-blocking operations

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

- `client-swr-dedup` - Use SWR for automatic request deduplication
- `client-event-listeners` - Deduplicate global event listeners

### 5. Re-render Optimization (MEDIUM)

- `rerender-defer-reads` - Don't subscribe to state only used in callbacks
- `rerender-memo` - Extract expensive work into memoized components
- `rerender-dependencies` - Use primitive dependencies in effects
- `rerender-derived-state` - Subscribe to derived booleans, not raw values
- `rerender-functional-setstate` - Use functional setState for stable callbacks
- `rerender-lazy-state-init` - Pass function to useState for expensive values
- `rerender-transitions` - Use startTransition for non-urgent updates

### 6. Rendering Performance (MEDIUM)

- `rendering-animate-svg-wrapper` - Animate div wrapper, not SVG element
- `rendering-content-visibility` - Use content-visibility for long lists
- `rendering-hoist-jsx` - Extract static JSX outside components
- `rendering-svg-precision` - Reduce SVG coordinate precision
- `rendering-hydration-no-flicker` - Use inline script for client-only data
- `rendering-activity` - Use Activity component for show/hide
- `rendering-conditional-render` - Use ternary, not && for conditionals

### 7. JavaScript Performance (LOW-MEDIUM)

- `js-batch-dom-css` - Group CSS changes via classes or cssText
- `js-index-maps` - Build Map for repeated lookups
- `js-cache-property-access` - Cache object properties in loops
- `js-cache-function-results` - Cache function results in module-level Map
- `js-cache-storage` - Cache localStorage/sessionStorage reads
- `js-combine-iterations` - Combine multiple filter/map into one loop
- `js-length-check-first` - Check array length before expensive comparison
- `js-early-exit` - Return early from functions
- `js-hoist-regexp` - Hoist RegExp creation outside loops
- `js-min-max-loop` - Use loop for min/max instead of sort
- `js-set-map-lookups` - Use Set/Map for O(1) lookups
- `js-tosorted-immutable` - Use toSorted() for immutability

### 8. Advanced Patterns (LOW)

- `advanced-event-handler-refs` - Store event handlers in refs
- `advanced-use-latest` - useLatest for stable callback refs

## React 19 Patterns

### Server Components: Default Data Flow

React 19 + Next.js App Router defaults to **Server Components**. Keep data fetching on the server:

```tsx
// ✅ Server Component — fetch data where it lives
// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await db.post.findMany()       // Direct DB access
  const config = await fetchConfig()           // Private API calls (no CORS)

  return <PostsList posts={posts} config={config} />
}
```

Only add `'use client'` at the interactive leaves — push it as deep as possible.

### New Hooks Performance Impact

| Hook | Use Case | Performance Note |
|------|----------|-----------------|
| `useOptimistic` | Instant UI feedback | Replaces manual `useState` + revert logic |
| `useActionState` | Form submissions | Replaces `useFormState` (deprecated) |
| `useFormStatus` | Pending states | Read from child, not form component |
| `use()` | Unwrap promises in render | Only in Client Components — Server Components use `await` |

### React Compiler Awareness

The React Compiler (stable, React 19+) auto-memoizes components and hooks. With compiler enabled:

- **Remove** manual `useMemo`, `useCallback`, `memo()` unless truly expensive
- **Keep** `useRef` (semantic, not memoization)
- **Keep** `useEffect` for synchronization (compiler doesn't touch effects)
- See `react-compiler` skill for full migration guide

### `use()` for Client Component Data

```tsx
'use client'

import { use } from 'react'

function UserProfile({ userPromise }) {
  const user = use(userPromise)  // Unwrap promise in render
  return <div>{user.name}</div>
}
```

`use()` reads Promises and Context in render without a hook wrapper.

## Next.js 16 Caching

Next.js 16 reversed the v15 caching model — everything is dynamic by default. To cache:

```tsx
// Cached — uses `use cache` directive
export async function getPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  return db.post.findMany()
}

// Dynamic — no directive (default)
export async function getUserSession() {
  return auth()  // Always fresh
}
```

**Migration**: Remove `export const dynamic = 'force-dynamic'` (now default). Replace `export const revalidate = 3600` with `'use cache'` + `cacheLife`. See `nextjs-cache` skill for detailed migration.

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/async-parallel.md
rules/bundle-barrel-imports.md
rules/_sections.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is straightforward, I don't need the full process" | Simple tasks mask hidden complexity. The process catches what "straightforward" misses. |
| "I'll reference the docs instead of loading the skill" | Docs describe what. The skill describes how. Both are needed for reliable execution. |
| "I've used this before, I know the patterns" | Patterns evolve. The skill captures current best practices, not remembered ones. |
| "The skill's steps add overhead" | The overhead is minutes. The rework from skipping them is hours. |

## Red Flags

- Skill's process steps being skipped without explicit justification
- Output that doesn't match the skill's expected quality standards
- No evidence of verification before claiming completion
- The same shortcut being taken repeatedly (pattern of avoidance)

## Verification

After completing work with this skill:

- [ ] All relevant tests pass
- [ ] Build succeeds with no new warnings
- [ ] The skill's process steps were followed in order
- [ ] No skipped steps without explicit justification
- [ ] Evidence of completion is documented (test output, screenshots, logs)
