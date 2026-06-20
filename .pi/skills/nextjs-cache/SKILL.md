---
name: nextjs-cache
description: Use when working with Next.js 16 caching — `use cache` directive, cacheLife, cacheTag, revalidation, migration from v15. MUST load before implementing any caching strategy.
---

# Next.js Cache System (Next.js 16)

## When to Use

- Adding `use cache` to functions or components
- Configuring cache lifetimes with `cacheLife()`
- Tagging cache entries for targeted revalidation
- Migrating from Next.js 15's implicit cache (force-dynamic, fetch cache)
- Calling `revalidateTag()` / `revalidatePath()` after mutations
- Using `connection()` for database-aware caching

## When NOT to Use

- Pages Router projects (no `use cache` support)
- Next.js 14 or earlier (different cache model)
- Purely client-side caching (use TanStack Query or SWR)

## Core Pattern: `use cache`

```tsx
// app/lib/data.ts
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getPosts() {
  'use cache'
  cacheTag('posts')  // Tag for later revalidation

  const posts = await db.post.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
  })

  return posts
}
```

```tsx
// app/posts/page.tsx
import { getPosts } from '@/lib/data'

export default async function PostsPage() {
  const posts = await getPosts()  // Cached until revalidated or expired
  return <PostsList posts={posts} />
}
```

## cacheLife — Set TTL

```tsx
import { cacheLife } from 'next/cache'

export async function getPopularPosts() {
  'use cache'
  cacheLife('hours')  // Revalidate every hour
  cacheTag('popular-posts')

  return db.post.findMany({ where: { views: { gte: 1000 } } })
}
```

Available `cacheLife` values:

| Profile | Duration | Use Case |
|---------|----------|----------|
| `'seconds'` | ~1 second | Real-time but deduped |
| `'minutes'` | ~5 minutes | Frequently changing data |
| `'hours'` | ~1 hour | Dashboard stats, user profiles |
| `'days'` | ~1 day | Blog content, static pages |
| `'weeks'` | ~1 week | Changelogs, documentation |
| `'max'` | Unlimited | Immutable data (never revalidates automatically) |

Custom profiles via `next.config.ts`:

```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  cacheLife: {
    frequent: {
      stale: 60,       // seconds before background revalidate
      revalidate: 300, // seconds before full re-fetch
      expire: 3600,    // seconds before purge
    },
  },
}
```

## cacheTag — Target Revalidation

```tsx
// Tag multiple related caches
export async function getPost(id: string) {
  'use cache'
  cacheTag(`post-${id}`, 'posts')  // Individual + list tag

  return db.post.findUnique({ where: { id } })
}
```

```tsx
// app/actions.ts — revalidate after mutation
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } })

  revalidateTag(`post-${id}`)  // Revalidate specific post
  revalidateTag('posts')       // Revalidate all post lists
  revalidatePath('/posts')     // Also revalidate the URL path
}
```

## connection() — Database-Driven Cache

`connection()` makes the cache aware of your database connection, speeding up purge:

```tsx
import { connection } from 'next/cache'

export async function getPost(id: string) {
  'use cache'
  cacheTag(`post-${id}`)
  connection()  // Invalidate when DB connection changes (e.g., deploy)

  return db.post.findUnique({ where: { id } })
}
```

Call `connection()` at any point in the cached function. Multiple calls deduplicate.

## Cacheable vs Non-Cacheable

**Can be cached**: Database queries, filesystem reads, fetch to stable APIs, computed values, Component output.

**Cannot be cached**: Request objects (`cookies()`, `headers()`), mutable state, random values, real-time data.

```tsx
export async function getUserData() {
  const session = await auth()  // ❌ Uses cookies — cannot cache

  const user = await db.user.findUnique({
    where: { id: session.userId }
  })

  return user
}
```

**Solution**: Split the function — cache only the data part:

```tsx
export async function getUserData() {
  const session = await auth()  // Not cached

  return getUser(session.userId)  // Cached
}

async function getUser(id: string) {
  'use cache'
  cacheTag(`user-${id}`)
  return db.user.findUnique({ where: { id } })
}
```

## Migration from Next.js 15

### Before (v15 implicit caching):

```tsx
// Next.js 15
export const dynamic = 'force-dynamic'     // Opt out of caching
export const revalidate = 3600             // ISR interval

// fetch caching
const data = await fetch(url, { cache: 'no-store' })
const data = await fetch(url, { next: { revalidate: 60 } })
```

### After (v16 explicit caching):

```tsx
// Next.js 16 — everything is dynamic by default
// To cache, use `use cache`:
export async function getPage() {
  'use cache'
  cacheLife('hours')
  return db.page.findMany()
}

// No more fetch cache options — use cache instead:
const data = await fetch(url)  // Always fresh, unless wrapped in use cache
```

### Quick Migration Table

| v15 Pattern | v16 Equivalent |
|------------|----------------|
| `fetch(url, { cache: 'no-store' })` | `fetch(url)` — no cache (default) |
| `fetch(url, { next: { revalidate: 60 } })` | Wrap in `use cache` + `cacheLife` |
| `export const dynamic = 'force-dynamic'` | Remove — dynamic is default |
| `export const revalidate = 3600` | `'use cache'` + `cacheLife('hours')` |
| `revalidatePath('/posts')` | Same API — still works |
| `revalidateTag('posts')` | Same API — still works with `cacheTag` |
| `unstable_cache(fn, ['key'])` | `'use cache'` + `cacheTag('key')` |

## Revalidation vs Expiration

- **Revalidate** (`revalidateTag`/`revalidatePath`): Immediate purge and re-fetch on next request
- **Expire** (`cacheLife` TTL): Background revalidate, stale data served until fresh data ready

```tsx
// Mutation pattern — revalidate affected caches
export async function updatePost(id: string, data: PostInput) {
  await db.post.update({ where: { id }, data })

  revalidateTag(`post-${id}`)           // Immediate purge
  // cacheLife handles TTL-based refresh for other entries
}
```

## Concurrent Mutations Safety

`use cache` functions support deduplication — concurrent requests for the same data share one database call:

```tsx
// Three components call getPosts() on same page
// → only ONE database query executes
<PostsList />      // calls getPosts()
<RecentPosts />    // calls getPosts() — deduped
<PopularPosts />   // calls getPosts() — deduped
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `cookies()` inside `'use cache'` | Split function: read cookies outside, pass data into cached function |
| Forgetting `cacheTag()` | Without tags, cache can only be purged by TTL or full flush |
| Using `revalidatePath` too broadly | Prefer `revalidateTag` — narrower scope, less CPU |
| Not invalidating after mutation | Every mutation must revalidate affected caches |
| `cacheLife` too short for write-heavy data | Use `cacheLife('seconds')` or skip caching for hot data |
| Caching user-specific data without user-scoping | Include `userId` in `cacheTag`: `cacheTag('user-${id}-posts')` |
| Assuming cache survives deployment | Add `connection()` to auto-invalidate on deploy |

## Verification

- [ ] `'use cache'` functions have `cacheTag()` for targeted revalidation
- [ ] Mutations call `revalidateTag()` or `revalidatePath()`
- [ ] No `cookies()` or `headers()` inside cached functions
- [ ] `cacheLife` appropriate for data freshness requirements
- [ ] `connection()` added for database queries that should invalidate on deploy
- [ ] v15 `fetch` cache options removed or migrated
- [ ] User-scoped data uses user-specific cache tags
