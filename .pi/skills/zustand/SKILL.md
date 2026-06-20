---
name: zustand
description: Use when implementing global or shared state management in React with Zustand v5. Covers store creation, slices pattern, middleware, selective subscriptions, React 19 + SSR integration. MUST load before any state management implementation.
---

# Zustand v5

## When to Use

- Managing global or shared client-side state in React
- Replacing Redux, Jotai, or Context for state management
- Creating stores that are used across multiple components
- Implementing slices for domain-separated state
- Persisting state to localStorage or sessionStorage
- Using middleware (immer, devtools, persist)

## When NOT to Use

- Server state (use TanStack Query or Server Components)
- Form state (use React Hook Form or Server Actions)
- Single-component local state (use `useState` or `useReducer`)
- Server Components (Zustand is client-only)

## Setup

```bash
npm install zustand
```

## Basic Store

```tsx
// stores/counter.ts
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))
```

```tsx
// components/Counter.tsx
'use client'

import { useCounterStore } from '@/stores/counter'

export function Counter() {
  const { count, increment, decrement } = useCounterStore()

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

## Slices Pattern

Split store into domain slices:

```tsx
// stores/index.ts
import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './slices/auth'
import { createCartSlice, type CartSlice } from './slices/cart'

type Store = AuthSlice & CartSlice

export const useStore = create<Store>()((...args) => ({
  ...createAuthSlice(...args),
  ...createCartSlice(...args),
}))
```

```tsx
// stores/slices/auth.ts
import type { StateCreator } from 'zustand'

export interface AuthSlice {
  user: User | null
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  login: async (credentials) => {
    const user = await api.login(credentials)
    set({ user })
  },
  logout: () => set({ user: null }),
})
```

## Selective Subscriptions

Zustand re-renders only when **used** state changes:

```tsx
// ❌ Whole store — re-renders on any change
const { count, name } = useStore()

// ✅ Selective — re-renders only when count changes
const count = useStore((state) => state.count)
const increment = useStore((state) => state.increment) // Stable reference

// ✅ Multiple values — useShallow for objects
import { useShallow } from 'zustand/react/shallow'

const { name, email } = useStore(
  useShallow((state) => ({ name: state.user.name, email: state.user.email }))
)
```

`useShallow` does shallow equality — avoids re-render when both values are the same.

## Middleware

### Persist (localStorage)

```tsx
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme: 'light' | 'dark') => set({ theme }),
    }),
    {
      name: 'app-settings',  // localStorage key
      partialize: (state) => ({ theme: state.theme }),  // Only persist theme
    }
  )
)
```

### Immer (Immutable Updates)

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useTodoStore = create(
  immer((set) => ({
    todos: [] as Todo[],
    addTodo: (text: string) =>
      set((state) => {
        state.todos.push({ id: crypto.randomUUID(), text, done: false })
      }),
    toggleTodo: (id: string) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id)
        if (todo) todo.done = !todo.done
      }),
  }))
)
```

### DevTools

```tsx
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 }), false, 'increment'),
    }),
    { name: 'AppStore' }  // Name in Redux DevTools
  )
)
```

### Combining Multiple Middleware

```tsx
import { create } from 'zustand'
import { devtools, persist, immer } from 'zustand/middleware'

export const useStore = create(
  devtools(
    persist(
      immer((set) => ({
        // store...
      })),
      { name: 'app-storage' }
    ),
    { name: 'AppStore' }
  )
)
```

## React 19 + Server Components

Zustand is **client-only**. Pattern for Next.js App Router:

```tsx
// stores/useStore.ts
import { create } from 'zustand'

export const useStore = create<Store>((set) => ({
  // ...
}))
```

```tsx
// components/ClientWrapper.tsx
'use client'

import { useStore } from '@/stores/useStore'

export function ClientWrapper({ children }) {
  const data = useStore((s) => s.data)

  return <div>{children}</div>
}
```

**Rules**:
- Stores are defined outside components (module scope)
- Store consumers must be in `'use client'` components
- Server Components can import the store type but cannot `useStore()`
- Use React Context to provide a store instance if you need SSR hydration

## SSR Hydration Pattern

```tsx
// app/providers.tsx
'use client'

import { type ReactNode, createContext, useContext, useRef } from 'react'
import { type StoreApi, useStore } from 'zustand'

// Create context for store
const StoreContext = createContext<StoreApi<AppStore> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StoreApi<AppStore>>()

  if (!storeRef.current) {
    storeRef.current = createAppStore()
  }

  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  )
}

// Hook to use the store
export function useAppStore<T>(selector: (state: AppStore) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Missing StoreProvider')
  return useStore(store, selector)
}
```

## Async Actions

```tsx
// Async actions are just async functions in the store:
interface UserStore {
  user: User | null
  loading: boolean
  error: Error | null
  fetchUser: (id: string) => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (id) => {
    set({ loading: true, error: null })
    try {
      const user = await api.getUser(id)
      set({ user, loading: false })
    } catch (error) {
      set({ error: error as Error, loading: false })
    }
  },
}))
```

## When to Use Zustand vs Context vs TanStack Query

| Tool | Best for |
|------|----------|
| **Zustand** | Global client state: theme, auth, cart, UI preferences |
| **React Context** | Dependency injection, theming, auth provider — static values that rarely change |
| **TanStack Query** | Server state: data fetching, caching, mutations |
| **useState/useReducer** | Local component state |

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using Zustand for server state | Use TanStack Query for fetched data — Zustand for client-only state |
| `useStore()` without selector — re-renders on any change | Always use selectors: `useStore(s => s.count)` |
| Multiple values returned as new object every render | Use `useShallow` for object selectors |
| Store in Server Component | Move store usage to `'use client'` |
| `getState()` in render | `getState()` is for callbacks/outside React, not render |
| Large stores with everything in one file | Use slices pattern to separate domains |
| Recreating store on every render | Define store outside component or use `useRef` for context pattern |

## Verification

- [ ] Store defined outside component (module scope) or via `useRef` in provider
- [ ] All store consumers are in `'use client'` components
- [ ] Selectors used for granular subscriptions — no destructured `useStore()`
- [ ] `useShallow` used for multi-value object selectors
- [ ] Server state (fetched data) managed by TanStack Query, not Zustand
- [ ] Slices pattern used for stores with multiple domains
- [ ] `persist` middleware configured with `partialize` to avoid storing sensitive data
- [ ] DevTools middleware enabled (development only)
