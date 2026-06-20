---
name: nextjs-app-router
description: Use when building or refactoring Next.js App Router pages. Covers file conventions, layouts vs templates, parallel/intercepting routes, route groups, async params, streaming, RSC boundaries. MUST load before any App Router architecture work.
---

# Next.js App Router Patterns (Next.js 15+)

## When to Use

- Building new pages in Next.js App Router
- Understanding or refactoring App Router file conventions
- Designing route architecture (parallel routes, intercepting, groups)
- Setting up layouts, error boundaries, and loading states
- Making decisions about Server vs Client Components

## When NOT to Use

- Pages Router projects (`pages/` directory — use `react-best-practices`)
- Non-Next.js React projects (Vite, Remix, React Router)
- Pure API routes (not page structure)

## File Conventions Reference

| File | Purpose | Runs |
|------|---------|------|
| `page.tsx` | Route's unique UI | Server (default) |
| `layout.tsx` | Shared UI that persists across navigations | Server (default) |
| `template.tsx` | Shared UI that remounts on navigation | Server (default) |
| `loading.tsx` | Suspense fallback while page loads | Server (default) |
| `error.tsx` | Error boundary for the segment | Client |
| `not-found.tsx` | 404 UI for the segment | Server (default) |
| `default.tsx` | Fallback for parallel routes | Server (default) |
| `route.tsx` | API endpoint for the segment | Server |

## Layout vs Template

**Layout**: persists across navigations, state preserved.

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>Sidebar — stays mounted</nav>
      <main>{children}</main>
    </div>
  )
}
```

**Template**: remounts on every navigation. Use when you need:
- Page transitions (AnimatePresence needs remount)
- `useEffect` that must re-run on navigation
- Resetting client state between pages

```tsx
// app/dashboard/template.tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={usePathname()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

**Rule**: Layout wraps Template wraps Page: `layout.tsx > template.tsx > page.tsx`

## Route Groups — `(group)/`

Use parentheses to group routes without affecting the URL:

```
app/
├── (marketing)/
│   ├── page.tsx          → /
│   ├── about/page.tsx    → /about
│   └── layout.tsx        # Marketing layout
├── (dashboard)/
│   ├── dashboard/page.tsx  → /dashboard
│   └── layout.tsx          # Dashboard layout (different from marketing)
```

## Parallel Routes — `@folder/`

Render multiple pages in the same layout simultaneously:

```
app/
├── dashboard/
│   ├── layout.tsx        # Accepts both props:
│   ├── @analytics/       #   children, analytics, team
│   │   └── page.tsx
│   ├── @team/
│   │   └── page.tsx
│   └── page.tsx          # Default children
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout(props: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2">
      <div>{props.children}</div>
      <div>{props.analytics}</div>
      <div>{props.team}</div>
    </div>
  )
}
```

Each slot needs a `default.tsx` for initial load and unmatched routes.

## Intercepting Routes — `(.)folder/`

Render a route in the context of another without full navigation:

| Convention | Meaning |
|-----------|---------|
| `(.)folder/` | Same level |
| `(..)folder/` | One level up |
| `(..)(..)folder/` | Two levels up |
| `(...)folder/` | From root |

Common pattern: Photo modal:

```
app/
├── photos/
│   ├── page.tsx              # Photos grid: /
│   └── [id]/
│       └── page.tsx          # Photo detail: /photos/1
└── @modal/
    ├── default.tsx           # null return
    └── (.)photos/
        └── [id]/
            └── page.tsx      # Modal overlay when navigating from photos grid
```

```tsx
// app/layout.tsx
export default function RootLayout({ children, modal }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

## Async Server Components

```tsx
// app/posts/[id]/page.tsx — no 'use client'
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>  // params is a Promise in Next.js 15+
}) {
  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })

  return <article>{post.content}</article>
}
```

**Next.js 15+**: `params`, `searchParams` are Promises — must `await` them.

## Streaming with Suspense + loading.tsx

```tsx
// app/posts/page.tsx
import { Suspense } from 'react'

export default function PostsPage() {
  return (
    <div>
      <h1>Posts</h1>
      <Suspense fallback={<PostsSkeleton />}>
        <PostsList />  {/* Streams in when ready */}
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <PostStats />  {/* Streams independently */}
      </Suspense>
    </div>
  )
}
```

- `loading.tsx` wraps the entire page in Suspense automatically
- Manual `<Suspense>` gives finer control — stream sections independently
- Wrap data-fetching Server Components in Suspense

## RSC Boundary Rules

```
Server Component (default)
  └─ can render → Client Components
  └─ can pass → serializable props only (no functions, no JSX as props)
  └─ can use → async/await, direct DB access, filesystem, secrets

Client Component ('use client')
  └─ can render → Server Components (passed as children)
  └─ can use → hooks, event handlers, browser APIs, state
  └─ cannot → async/await directly, access DB
```

**Boundary pattern** — push 'use client' as deep as possible:

```tsx
// ✅ Server Component (default) — data fetching here
export default async function UserProfile({ userId }) {
  const user = await db.user.findUnique({ where: { id: userId } })

  return (
    <div>
      <h1>{user.name}</h1>
      <EditButton />  {/* Only the interactive leaf is client */}
    </div>
  )
}

// ✅ Client leaf — only what needs interactivity
'use client'
function EditButton() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(true)}>Edit</button>
}
```

## Error Handling

```tsx
// app/dashboard/error.tsx
'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

- `error.tsx` must be a Client Component
- Errors bubble up to the nearest `error.tsx`
- `reset()` re-renders the error boundary's children
- `error.tsx` in a nested segment only catches errors in that segment and below

## Middleware

```tsx
// middleware.ts (root level)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')

  // Protect routes
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

## Metadata API

```tsx
// Static metadata
export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your account',
}

// Dynamic metadata (Server Components)
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.id)
  return { title: post.title, description: post.excerpt }
}
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Adding `'use client'` to a layout | Layouts are Server Components by default; only add `'use client'` when you need hooks |
| Forgetting `default.tsx` for parallel routes | Every slot needs a `default.tsx` for initial load |
| Passing functions as props from Server to Client | Functions are not serializable — define them in the client |
| Using `useSearchParams()` in Server Component | Use `searchParams` prop (Promise in v15+) |
| `params` treated as plain object (v15+) | `params` is now a Promise — must `await params` |
| No Suspense boundary for async component | Wrap in `<Suspense>` or ensure `loading.tsx` exists |
| `layout.tsx` doesn't receive `searchParams` | Only `page.tsx` gets `searchParams` |

## Verification

- [ ] Server Components are the default — `'use client'` only where interactive
- [ ] `params` and `searchParams` are awaited (Next.js 15+)
- [ ] Error boundaries (`error.tsx`) exist at appropriate levels
- [ ] Loading states (`loading.tsx` or `<Suspense>`) for async pages
- [ ] Parallel route slots each have `default.tsx`
- [ ] Layout and template used correctly (persist vs remount)
- [ ] Route groups used to share layouts without affecting URL
- [ ] Functions and non-serializable data stay in Client Components
