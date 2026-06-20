---
name: tanstack-query
description: Use when implementing data fetching, caching, or mutations with TanStack Query v5. Covers useQuery, useMutation, optimistic updates, infinite queries, prefetching, SSR patterns, query keys. MUST load before any data fetching implementation.
---

# TanStack Query v5

## When to Use

- Fetching data from APIs in React applications
- Managing server state with automatic caching and background refetching
- Implementing optimistic updates for mutations
- Handling pagination and infinite scrolling
- Prefetching data for faster navigation
- Server-side rendering with client hydration

## When NOT to Use

- Server Components with direct DB access (use `use cache` instead)
- WebSocket-only real-time data (use SWR subscription or custom hook)
- Form state management (use React Hook Form)
- Global client-only state (use Zustand)

## Setup

```tsx
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,  // 1 min before considered stale
          gcTime: 5 * 60 * 1000,  // 5 min garbage collection
          retry: 1,               // One retry on failure
          refetchOnWindowFocus: false,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## useQuery — Basic Data Fetching

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'

function PostsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('/api/posts').then(res => res.json()),
  })

  if (isLoading) return <PostsSkeleton />
  if (error) return <ErrorDisplay error={error} />

  return data.map(post => <PostCard key={post.id} post={post} />)
}
```

## Query Key Design

```tsx
// Flat keys — simple
useQuery({ queryKey: ['posts'], queryFn: fetchPosts })

// Hierarchical keys — filterable
useQuery({ queryKey: ['posts', { status: 'published' }], queryFn: () => fetchPosts('published') })

// Detail queries — id-based
useQuery({ queryKey: ['posts', postId], queryFn: () => fetchPost(postId) })

// Factory pattern — recommended for large apps
const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: Filters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
}

// Usage:
useQuery({ queryKey: postKeys.lists({ status: 'published' }), ... })
useQuery({ queryKey: postKeys.detail(id), ... })

// Invalidation
queryClient.invalidateQueries({ queryKey: postKeys.lists() }) // All lists
queryClient.invalidateQueries({ queryKey: postKeys.detail(id) }) // Specific post
```

## useMutation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreatePost() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newPost: PostInput) =>
      fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(newPost),
      }),

    // Invalidate and refetch after success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  return (
    <button
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ title: 'New Post' })}
    >
      {mutation.isPending ? 'Creating...' : 'Create Post'}
    </button>
  )
}
```

## Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: toggleTodoStatus,

  onMutate: async (todoId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] })

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos'])

    // Optimistically update
    queryClient.setQueryData(['todos'], (old: Todo[]) =>
      old.map(t => t.id === todoId ? { ...t, done: !t.done } : t)
    )

    // Return context for rollback
    return { previousTodos }
  },

  onError: (err, todoId, context) => {
    // Rollback on failure
    queryClient.setQueryData(['todos'], context?.previousTodos)
  },

  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

## Infinite Queries

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

function PostFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam }) =>
      fetch(`/api/posts?cursor=${pageParam}`).then(r => r.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  return (
    <div>
      {data.pages.map(page =>
        page.posts.map(post => <PostCard key={post.id} post={post} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load more
        </button>
      )}
    </div>
  )
}
```

## Prefetching (Next.js)

```tsx
// app/posts/page.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { PostsList } from './PostsList'

export default async function PostsPage() {
  const queryClient = new QueryClient()

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

```tsx
// app/posts/PostsList.tsx — Client Component
'use client'

import { useQuery } from '@tanstack/react-query'

export function PostsList() {
  // Uses prefetched data — no loading state on first render
  const { data } = useQuery({ queryKey: ['posts'], queryFn: fetchPosts })
  return data.map(post => <PostCard key={post.id} post={post} />)
}
```

## Combining with Server Actions

```tsx
// Use Server Actions for mutations, TanStack Query for reads:

'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPost } from './actions'  // Server Action

function PostsPage() {
  const queryClient = useQueryClient()

  // Read — TanStack Query
  const posts = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('/api/posts').then(r => r.json()),
  })

  // Write — Server Action + cache revalidation
  const mutation = useMutation({
    mutationFn: (data: FormData) => createPost(null, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  return (
    <form action={mutation.mutate}>
      <input name="title" />
      <button>Create</button>
    </form>
  )
}
```

## staleTime vs gcTime

| Setting | What it controls | Recommended |
|---------|-----------------|-------------|
| `staleTime` | How long before data is considered stale and refetched | 30s–5min depending on update frequency |
| `gcTime` | How long inactive data stays in cache before garbage collection | 5–30min (longer than staleTime) |

```tsx
// Static data — rarely changes
staleTime: Infinity, gcTime: 30 * 60 * 1000,

// Dashboard — updates every few minutes
staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000,

// Real-time feed — updates frequently
staleTime: 30 * 1000, gcTime: 5 * 60 * 1000,
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using TanStack Query in Server Components | Move to `'use client'` component |
| `queryKey` as `['posts']` everywhere — no granularity | Use structured keys: `['posts', 'list', filters]` |
| Not setting `staleTime` — defaults to 0 | Set sensible `staleTime` — default 0 refetches too often |
| Mixing `isLoading` and `isFetching` | `isLoading` = first load; `isFetching` = any fetch including background |
| `useQuery` for mutations | `useQuery` is for reads; use `useMutation` for writes |
| Mutating cache directly without rollback | Always implement `onMutate` snapshot + `onError` rollback |
| Missing `HydrationBoundary` for SSR | Server-prefetched data won't hydrate without it |
| `queryClient` recreated every render | Wrap in `useState(() => new QueryClient(...))` |

## Verification

- [ ] `QueryClientProvider` wraps the app in root layout
- [ ] `staleTime` and `gcTime` configured globally (not per-query unless needed)
- [ ] Query keys follow a structured pattern (all → lists → detail)
- [ ] Mutations call `invalidateQueries` or use optimistic updates
- [ ] Optimistic updates have rollback via `onError` + `onMutate` snapshot
- [ ] SSR pages use `HydrationBoundary` with `dehydrate`
- [ ] No `useQuery` in Server Components
- [ ] `isLoading` used for first-load skeleton; `isFetching` for background updates
