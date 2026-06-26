---
name: performance-optimization
description: Use when profiling, optimizing, or adding performance budgets to applications — covers measure-first workflow, Core Web Vitals, common anti-patterns, and performance regression prevention
---

# Performance Optimization

> **Replaces** premature optimization and gut-feeling tuning with measurement-driven improvements that target actual bottlenecks

## When to Use

- Application is measurably slow (user reports, metrics, profiler data)
- Setting up performance budgets for a new project
- Reviewing code for common performance anti-patterns
- Performance regression detected in CI or monitoring

## When NOT to Use

- No evidence of a performance problem — premature optimization wastes time
- Micro-optimizations that save nanoseconds in non-hot paths
- Choosing "fast" over "correct" — correctness first, always

## Overview

Performance optimization is an empirical process. Measure, identify, fix, verify. Never optimize without profiling first.

**Core principle:** Measure before optimizing. Optimize the bottleneck, not the code you happen to be reading. Verify the improvement with numbers.

## Measure-First Workflow

```
1. MEASURE   — Profile to identify actual bottlenecks (not guessed ones)
2. IDENTIFY  — Find the specific hot path or resource constraint
3. FIX       — Apply targeted optimization to the bottleneck
4. VERIFY    — Measure again to confirm improvement
5. GUARD     — Add budget/benchmark to prevent regression
```

**Rule:** Skip to step 3 only if you have measurement data that justifies the optimization.

### How to Measure

Two complementary approaches — use both:

- **Synthetic (Lighthouse, DevTools Performance tab):** Controlled conditions, reproducible. Best for CI regression detection and isolating specific issues.
- **RUM (web-vitals library, CrUX):** Real user data in real conditions. Required to validate that a fix actually improved user experience.

**Frontend:**
```bash
# Synthetic: Lighthouse in Chrome DevTools (or CI)
# Chrome DevTools → Performance tab → Record
# Chrome DevTools MCP → Performance trace

# RUM: Web Vitals library in code
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

**Backend:**
```bash
# Response time logging
# Application Performance Monitoring (APM)
# Database query logging with timing

# Simple timing
console.time('db-query');
const result = await db.query(...);
console.timeEnd('db-query');
```

### Where to Start Measuring

Use the symptom to decide what to measure first:

```
What is slow?
├── First page load
│   ├── Large bundle? --> Measure bundle size, check code splitting
│   ├── Slow server response? --> Measure TTFB in DevTools Network waterfall
│   │   ├── DNS long? --> Add dns-prefetch / preconnect for known origins
│   │   ├── TCP/TLS long? --> Enable HTTP/2, check edge deployment, keep-alive
│   │   └── Waiting (server) long? --> Profile backend, check queries and caching
│   └── Render-blocking resources? --> Check network waterfall for CSS/JS blocking
├── Interaction feels sluggish
│   ├── UI freezes on click? --> Profile main thread, look for long tasks (>50ms)
│   ├── Form input lag? --> Check re-renders, controlled component overhead
│   └── Animation jank? --> Check layout thrashing, forced reflows
├── Page after navigation
│   ├── Data loading? --> Measure API response times, check for waterfalls
│   └── Client rendering? --> Profile component render time, check for N+1 fetches
└── Backend / API
    ├── Single endpoint slow? --> Profile database queries, check indexes
    ├── All endpoints slow? --> Check connection pool, memory, CPU
    └── Intermittent slowness? --> Check for lock contention, GC pauses, external deps
```

## Identify the Bottleneck

Common bottlenecks by category:

**Frontend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow LCP | Large images, render-blocking resources, slow server | Check network waterfall, image sizes |
| High CLS | Images without dimensions, late-loading content, font shifts | Check layout shift attribution |
| Poor INP | Heavy JavaScript on main thread, large DOM updates | Check long tasks in Performance trace |
| Slow initial load | Large bundle, many network requests | Check bundle size, code splitting |

**Backend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow API responses | N+1 queries, missing indexes, unoptimized queries | Check database query log |
| Memory growth | Leaked references, unbounded caches, large payloads | Heap snapshot analysis |
| CPU spikes | Synchronous heavy computation, regex backtracking | CPU profiling |
| High latency | Missing caching, redundant computation, network hops | Trace requests through the stack |

## Performance Targets

### Core Web Vitals (Web)

| Metric                          | Good    | Needs Improvement | Poor    |
| ------------------------------- | ------- | ----------------- | ------- |
| LCP (Largest Contentful Paint)  | ≤ 2.5s  | ≤ 4.0s            | > 4.0s  |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms           | > 500ms |
| CLS (Cumulative Layout Shift)   | ≤ 0.1   | ≤ 0.25            | > 0.25  |

### General Targets

| Context             | Target       | Measure                |
| ------------------- | ------------ | ---------------------- |
| API response (p95)  | < 200ms      | Server-side timing     |
| CLI command startup | < 500ms      | `time` or `perf_hooks` |
| Build time          | < 60s        | CI pipeline metrics    |
| Bundle size (JS)    | < 200KB gzip | Bundler output         |
| Database query      | < 50ms       | Query EXPLAIN + timing |

## Common Anti-Patterns & Fixes

### N+1 Queries

```typescript
// [ ] N+1: One query per user
const users = await db.query("SELECT * FROM users");
for (const user of users) {
  user.posts = await db.query("SELECT * FROM posts WHERE user_id = ?", [user.id]);
}

// [x] Batch: Two queries total
const users = await db.query("SELECT * FROM users");
const userIds = users.map((u) => u.id);
const posts = await db.query("SELECT * FROM posts WHERE user_id IN (?)", [userIds]);
// Group posts by user_id in application code
```

### Unbounded Fetching

```typescript
// [ ] Fetch everything
const allItems = await db.query("SELECT * FROM items");

// [x] Paginate
const items = await db.query("SELECT * FROM items LIMIT ? OFFSET ?", [pageSize, offset]);
```

### Missing Memoization

```typescript
// [ ] Recompute on every render
function ExpensiveList({ items }) {
  const sorted = items.sort((a, b) => complexSort(a, b)); // sorts on every render
  return <List items={sorted} />;
}

// [x] Memoize expensive computation
function ExpensiveList({ items }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => complexSort(a, b)),
    [items]
  );
  return <List items={sorted} />;
}
```

### Large Bundle Size

```typescript
// [ ] Import entire library
import _ from "lodash";
const result = _.debounce(fn, 300);

// [x] Import only what you need
import debounce from "lodash/debounce";
const result = debounce(fn, 300);

// [x][x] Use native (no dependency)
function debounce(fn, ms) {
  /* ... */
}
```

Modern bundlers (Vite, webpack 5+) handle named imports with tree-shaking automatically, provided the dependency ships ESM and is marked `sideEffects: false` in `package.json`. Profile before changing import styles — the real gains come from splitting and lazy loading:

```typescript
// GOOD: Dynamic import for heavy, rarely-used features
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// GOOD: Route-level code splitting wrapped in Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

### Missing Image Optimization

```html
<!-- [ ] Unoptimized -->
<img src="hero.png" />

<!-- [x] Optimized -->
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
  loading="lazy"
  decoding="async"
  width="1200"
  height="630"
  alt="Hero image"
/>
```

#### Advanced: Art Direction with `<picture>`

For LCP hero images where crop/composition should differ per breakpoint, combine two techniques — **art direction** (different crop per breakpoint via `media`) and **resolution switching** (right file size per screen density via `srcset` + `sizes`):

```html
<picture>
  <!-- Mobile: portrait crop (8:10) -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: landscape crop (2:1) -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Hero image description"
  />
</picture>

<!-- Below-the-fold image — lazy loaded + async decoding -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="Content image description"
/>
```

### Unnecessary Re-renders (React)

```typescript
// [ ] New object every render causes child re-render
function Parent() {
  return <Child style={{ color: 'red' }} onClick={() => doThing()} />;
}

// [x] Stable references
const style = { color: 'red' };
function Parent() {
  const handleClick = useCallback(() => doThing(), []);
  return <Child style={style} onClick={handleClick} />;
}
```

### Missing Caching (Backend)

```typescript
// Cache frequently-read, rarely-changed data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// HTTP caching headers for static assets
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache for 1 year
  immutable: true,        // Never revalidate (use content hashing in filenames)
}));

// Cache-Control for API responses
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
```

> **Caveat:** Caching masks problems. Fix the root cause first, then add caching as defense in depth — never as a substitute for fixing a fundamentally slow operation.

## Profiling Tools

| Context          | Tool                             | What It Shows                     |
| ---------------- | -------------------------------- | --------------------------------- |
| Web (browser)    | Chrome DevTools Performance      | Paint, scripting, layout, network |
| Web (field data) | CrUX, PageSpeed Insights         | Real-user Core Web Vitals         |
| Node.js          | `node --prof` + `--prof-process` | V8 profiling ticks per function   |
| Node.js          | `clinic.js`                      | Flamegraphs, event loop delays    |
| React            | React DevTools Profiler          | Component render times            |
| SQL              | `EXPLAIN ANALYZE`                | Query execution plan              |
| Bundle           | `source-map-explorer`            | Module size breakdown             |
| Network          | `lighthouse`                     | Loading performance audit         |

## Performance Budget

### Setting Budgets

```json
{
  "budgets": [
    { "metric": "js-bundle", "max": "200KB", "warn": "150KB" },
    { "metric": "css-bundle", "max": "50KB", "warn": "40KB" },
    { "metric": "lcp", "max": "2500ms", "warn": "2000ms" },
    { "metric": "api-p95", "max": "200ms", "warn": "150ms" }
  ]
}
```

### Enforcing Budgets in CI

```yaml
- name: Check bundle size
  run: |
    npx bundlesize --config .bundlesizerc.json

- name: Lighthouse audit
  run: |
    npx lighthouse $URL --output json --chrome-flags="--headless"
    # Parse and assert against budgets
```

## Common Rationalizations

| Excuse                            | Rebuttal                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| "It's fast enough on my machine"  | Test on low-end devices and slow networks. Your machine isn't representative.      |
| "We'll optimize later"            | Performance debt compounds. Set budgets now, optimize when they're breached.       |
| "This micro-optimization matters" | Profile first. If it's not in the hot path, it doesn't matter.                     |
| "Users won't notice 200ms"        | Studies show 100ms delays reduce conversions. Users notice more than you think.    |
| "Adding metrics is overhead"      | The overhead of measurement is trivial compared to the cost of blind optimization. |
| "Caching will fix it"             | Caching masks problems. Fix the root cause, then add caching as defense.           |
| "This optimization is obvious"    | If you didn't measure, you don't know. Profile first.                              |
| "The framework handles performance" | Frameworks prevent some issues but can't fix N+1 queries or oversized bundles.   |

## Red Flags — STOP

- Optimizing without profiling data
- Adding caching to mask a fundamentally slow operation
- Micro-optimizing code that runs once per request
- Bundle size growing without review
- No performance budget or monitoring in place
- Using `SELECT *` in production queries
- N+1 query patterns in data fetching
- List endpoints without pagination
- Images without dimensions, lazy loading, or responsive sizes
- No performance monitoring in production
- `React.memo` and `useMemo` everywhere (overusing is as bad as underusing)

## Verification

- [ ] Bottleneck identified with profiling data (not intuition)
- [ ] Optimization shows measurable improvement in profiler
- [ ] Performance budget is set and enforced in CI
- [ ] No regressions in existing benchmarks
- [ ] Optimization doesn't sacrifice correctness or readability
- [ ] Core Web Vitals are within "Good" thresholds
- [ ] Bundle size hasn't increased significantly
- [ ] No N+1 queries in new data fetching code
- [ ] Existing tests still pass (optimization didn't break behavior)

## See Also

- **react-best-practices** — React-specific performance patterns (server components, bundle optimization)
- **ci-cd-and-automation** — Enforcing performance budgets in CI
- **code-simplification** — Simplifying code often improves performance as a side effect
- `.pi/context/performance-checklist.md` — Detailed performance checklists, optimization commands, and anti-pattern reference