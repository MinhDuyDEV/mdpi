---
name: react-compiler
description: Use when enabling, debugging, or optimizing with the React Compiler. Covers what it auto-memoizes, what it can't optimize, ESLint plugin, migration guide, and React DevTools debugging. MUST load before enabling the compiler or diagnosing memoization issues.
---

# React Compiler (React 19+)

## When to Use

- Enabling the React Compiler in a project
- Understanding what the compiler does and doesn't optimize
- Debugging why a component didn't get memoized
- Diagnosing unexpected re-renders in a compiler-enabled project
- Deciding between manual `useMemo`/`useCallback` vs letting the compiler handle it

## When NOT to Use

- Non-React projects
- Debugging runtime rendering issues unrelated to memoization
- Choosing component architecture (use `react-best-practices` or `deep-module-design`)

## What the React Compiler Does

The React Compiler **auto-memoizes** components and hooks at build time. It eliminates the need for manual `useMemo`, `useCallback`, and `memo()` in most cases.

```tsx
// Before compiler — manual memoization
function ExpensiveList({ items }: { items: Item[] }) {
  const filtered = useMemo(
    () => items.filter(i => i.active),
    [items]
  )

  const handleClick = useCallback((id: string) => {
    onSelect(id)
  }, [onSelect])

  return filtered.map(item => (
    <Item key={item.id} item={item} onClick={handleClick} />
  ))
}

// With compiler — writes itself
function ExpensiveList({ items }: { items: Item[] }) {
  const filtered = items.filter(i => i.active)

  return filtered.map(item => (
    <Item key={item.id} item={item} onClick={() => onSelect(item.id)} />
  ))
}
```

## What the Compiler CAN Optimize

| Pattern | How |
|---------|-----|
| Components | Auto-wraps with `memo()` equivalent |
| Props & dependencies | Auto-generates dependency arrays for `useMemo`, `useCallback`, `useEffect` |
| Inline functions | Auto-memoizes `() => {}` passed as props |
| Computed values | Auto-wraps expensive computations in `useMemo` |
| Context reads | Tracks granular context reads — only re-renders when specific field changes |
| useRef stability | Stabilizes `useRef` references |

## What the Compiler CANNOT Optimize

| Limitation | What to Do |
|-----------|------------|
| **Side effects in render** | Fix — compiler bails out on impure renders |
| **Mutating state directly** | Fix — use setState functions |
| **Dynamic `key` values from `Math.random()`** | Fix — use stable keys |
| **Third-party libraries that break Rules of React** | Wait for library updates |
| **Components with `ref` + mutating `ref.current` in render** | Move mutation to event handler or effect |
| **Deeply nested context that's read broadly** | Split context or use selectors (Zustand) |
| **Extremely large dependency arrays (100+ items)** | Restructure: split component or function |
| **Code using `eval()` or `new Function()`** | Remove dynamic code evaluation |

## Enabling the Compiler

### Next.js (15+)

```bash
npm install babel-plugin-react-compiler
```

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
}
```

### Vite (React)

```bash
npm install babel-plugin-react-compiler
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
})
```

## ESLint Plugin

```bash
npm install eslint-plugin-react-compiler
```

```json
// .eslintrc.json
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

The ESLint plugin detects **Rules of React violations** that would cause the compiler to bail out — catches issues at lint time before they become runtime problems.

## React DevTools Integration

With the compiler enabled, React DevTools shows:

- **"Memo ✨"** badge on auto-memoized components
- Components that **failed** to compile — shown with a warning badge
- Why it failed: hover the badge for explanation

Open React DevTools → Components tab → look for ✨ beside component names.

## Migration Guide

### Phase 1: ESLint First (No Compiler)

```bash
npm install eslint-plugin-react-compiler
```

Enable only the ESLint rule. Fix all violations. This ensures your code follows Rules of React — a prerequisite for the compiler.

### Phase 2: Enable Compiler on CI

```ts
// next.config.ts — enable on CI/staging first
reactCompiler: process.env.CI === 'true'
```

Run your test suite. Check for behavioral changes.

### Phase 3: Remove Manual Memoization

Once the compiler is stable in production:

```tsx
// Remove these — compiler handles them:
// - useMemo for computed values
// - useCallback for event handlers
// - React.memo() wrapping

// Keep these — they serve semantic purposes:
// - useMemo for expensive computations the compiler can't prove
// - useRef for mutable values
// - useEffect for synchronization
```

### Phase 4: Full Production Enable

```ts
reactCompiler: true
```

## Gradual Adoption

Enable per-directory via compiler directive comments:

```tsx
// Opt-in specific files:
'use memo'

// Opt-out specific files:
'use no memo'
```

Use `'use memo'` at the top of a file to enable the compiler for that file only, even if the project-level config is off.

## When to Keep Manual Memoization

Even with the compiler, keep manual memoization for:

- **Truly expensive computations**: The compiler is conservative — if you know something is heavy, `useMemo` makes it explicit
- **Custom hooks with object returns**: `useMemo` on the return value ensures referential stability
- **Third-party integration**: When passing objects to non-React libraries that do shallow comparisons

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Side effects during render (console.log, date, random) | Move to event handlers or effects |
| Mutating props or state in render | Use immutable updates |
| Assuming compiler fixes all performance | Compiler handles memoization only — waterfalls, bundle size, SSR still need attention |
| Leaving manual memoization everywhere | Remove redundant `useMemo`/`useCallback` — they add noise with no benefit |
| Not running ESLint plugin before enabling | Run ESLint first and fix all violations — this is the #1 source of compiler bailouts |
| `useMemo` with empty dependency for object identity | Compiler handles this — remove unless it's truly expensive |

## Integration with Other Skills

| Skill | How Compiler Changes It |
|-------|------------------------|
| `react-best-practices` | `rerender-memo`, `rerender-functional-setstate` become unnecessary with compiler |
| `react-server-actions` | No change — Server Actions don't use compiler |
| `zustand` | Selective subscriptions still recommended — compiler doesn't replace selectors |
| `tanstack-query` | No change — data fetching patterns unchanged |

## Verification

- [ ] ESLint plugin enabled and passing with zero violations
- [ ] Compiler enabled in `next.config.ts` or `vite.config.ts`
- [ ] React DevTools shows ✨ on auto-memoized components
- [ ] No unexpected re-renders after enabling (profile with DevTools)
- [ ] Test suite passes with compiler enabled
- [ ] Manual `useMemo`/`useCallback` removed where compiler handles them
- [ ] No side effects in render (build warnings if any)
