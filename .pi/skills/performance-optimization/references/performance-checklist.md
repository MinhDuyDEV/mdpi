# Performance Checklist

Quick reference for web application performance. Use alongside the `performance-optimization` skill.

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Frontend Checklist

### Images
- [ ] Modern formats (WebP, AVIF)
- [ ] Responsively sized (`srcset` and `sizes`)
- [ ] Explicit `width` and `height` (prevents CLS)
- [ ] Below-the-fold images: `loading="lazy"`, `decoding="async"`
- [ ] Hero/LCP images: `fetchpriority="high"`, no lazy loading

### JavaScript
- [ ] Bundle size under 200KB gzipped (initial load)
- [ ] Code splitting with dynamic `import()`
- [ ] Tree shaking enabled
- [ ] No blocking JavaScript in `<head>` (use `defer` or `async`)
- [ ] Heavy computation offloaded to Web Workers
- [ ] Long tasks (> 50ms) broken up (`scheduler.yield()`, `requestIdleCallback`)

### CSS
- [ ] Critical CSS inlined or preloaded
- [ ] No render-blocking CSS for non-critical styles
- [ ] No CSS-in-JS runtime cost in production (use extraction)

### Fonts
- [ ] Limited to 2–3 font families, 2–3 weights each
- [ ] WOFF2 format only
- [ ] Self-hosted when possible
- [ ] `font-display: swap` (or `optional` for non-critical)
- [ ] Subsetted via `unicode-range`
- [ ] System font stack considered before any custom font

### Network
- [ ] Static assets cached with long `max-age` + content hashing
- [ ] API responses cached where appropriate
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Resources preconnected for known origins
- [ ] `fetchpriority` used on critical resources

## Backend Checklist

- [ ] Database queries have appropriate indexes
- [ ] N+1 queries eliminated
- [ ] Expensive operations cached (Redis, in-memory)
- [ ] Pagination on list endpoints
- [ ] Response payloads trimmed to needed fields
- [ ] Compression enabled (gzip, brotli)
- [ ] Connection pooling configured

## Measurement Commands

```bash
# Lighthouse CLI
npx lighthouse https://example.com --view

# Web Vitals in browser
# Chrome DevTools → Performance tab → Record

# Bundle analysis
npx webpack-bundle-analyzer stats.json

# TTFB diagnosis in DevTools Network waterfall
# Check: DNS → TCP/TLS → Server processing
```

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Loading all JS upfront | Slow FCP/TTI | Code split by route |
| Unoptimized images | High LCP | Compress, modern formats, responsive sizes |
| No caching headers | Repeat downloads | `Cache-Control` with content hashing |
| Client-side rendering everything | Slow FCP, bad SEO | Server components, SSG where possible |
| Third-party scripts in `<head>` | Blocks rendering | `async`/`defer`, audit, facade pattern |
| Missing width/height on images | Layout shift (CLS) | Explicit dimensions or aspect-ratio |
