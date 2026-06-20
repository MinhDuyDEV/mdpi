---
name: react-server-actions
description: Use when building forms, mutations, or data writes in React 19 + Next.js. Covers Server Actions, useActionState, useOptimistic, useFormStatus, progressive enhancement, Zod validation, error handling. MUST load before any form or mutation implementation.
---

# React Server Actions & Forms (React 19)

## When to Use

- Building forms that submit data to the server
- Handling mutations (create, update, delete) in React 19
- Adding optimistic updates to improve perceived performance
- Integrating Zod validation with Server Actions
- Migrating from API routes or tRPC to Server Actions
- Implementing progressive enhancement (forms work without JS)

## When NOT to Use

- Read-only data fetching (use Server Components, `use()`, or TanStack Query)
- Client-only state management (use Zustand or context)
- Non-Next.js React projects without Server Action support

## Core Pattern: Server Action + useActionState

```tsx
// app/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function createUser(prevState: unknown, formData: FormData) {
  // 1. Parse and validate
  const raw = Object.fromEntries(formData)
  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 2. Mutate (database call)
  await db.user.create({ data: parsed.data })

  // 3. Revalidate and redirect
  revalidatePath('/users')
  return { success: true }
}
```

```tsx
// app/new/page.tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createUser } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create User'}
    </button>
  )
}

export default function NewUserForm() {
  const [state, formAction] = useActionState(createUser, null)

  return (
    <form action={formAction}>
      <input name="name" required />
      {state?.error?.name && <p>{state.error.name[0]}</p>}

      <input name="email" type="email" required />
      {state?.error?.email && <p>{state.error.email[0]}</p>}

      <SubmitButton />
      {state?.success && <p className="text-green-600">User created!</p>}
    </form>
  )
}
```

## Hook Reference

### `useActionState(action, initialState, permalink?)`

```tsx
const [state, formAction, isPending] = useActionState(action, null)
```

- Replaces `useFormState` (deprecated in React 19)
- `state` — return value from your Server Action
- `formAction` — pass as `<form action={formAction}>`
- `isPending` — convenient boolean for loading state
- `permalink` — optional URL for progressive enhancement fallback

### `useFormStatus()`

```tsx
const { pending, data, method, action } = useFormStatus()
```

- **Must be used inside a `<form>` child component** — not in the component that renders `<form>`
- Extract `<SubmitButton>` as a separate component
- `pending` — true while form is submitting
- `data` — the FormData being submitted

### `useOptimistic(initialValue, reducer)`

```tsx
const [optimisticTodos, addOptimistic] = useOptimistic(
  todos,
  (state, newTodo: Todo) => [...state, newTodo]
)

// In event handler:
addOptimistic({ id: crypto.randomUUID(), text, pending: true })
await addTodoOnServer(formData)
```

- Shows UI change immediately, reverts on error
- `reducer` signature: `(currentState, optimisticValue) => newState`
- Good for: like counters, comment posting, toggle states

## Zod Integration

```tsx
'use server'

import { z } from 'zod'

const SignupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  age: z.coerce.number().min(18, 'Must be 18+'),
  plan: z.enum(['free', 'pro', 'enterprise']),
})

export async function signup(prev: unknown, formData: FormData) {
  const result = SignupSchema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    // Return flattened errors keyed by field
    return {
      errors: result.error.flatten().fieldErrors,
      inputs: Object.fromEntries(formData) // preserve user input
    }
  }

  await createAccount(result.data)
  return { success: true }
}
```

## Progressive Enhancement

Server Actions support HTML form fallback — forms work without JavaScript:

```tsx
// The form works even if JS fails to load:
<form action={createUser}>
  <input name="name" required />
  <button type="submit">Submit</button>
</form>
```

For the JS-enhanced version, use `useActionState` which wraps the same Server Action.

**Requirements for progressive enhancement:**
- Use native `<form>` and `<button type="submit">`
- Use `required` attribute for client-side validation
- All form fields must have `name` attributes
- Server Action must accept `FormData` as second argument

## Error Handling Pattern

```tsx
type ActionState = {
  error?: string              // General error
  errors?: Record<string, string[]>  // Field-level errors
  success?: boolean           // Success flag
  data?: unknown              // Return data on success
}

// In Server Action:
try {
  await db.user.create({ data: parsed.data })
  return { success: true }
} catch (err) {
  if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
    return { errors: { email: ['Email already registered'] } }
  }
  return { error: 'Something went wrong. Please try again.' }
}
```

## Redirect After Success

```tsx
'use server'

import { redirect } from 'next/navigation'

export async function createPost(prev: unknown, formData: FormData) {
  const post = await db.post.create({ data: { title: formData.get('title') } })
  revalidatePath('/posts')
  redirect(`/posts/${post.id}`)
}
```

**Important**: `redirect()` throws a `NEXT_REDIRECT` error — call it after all mutations. Cannot be inside try/catch.

## Avoiding Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `useFormStatus()` in the form component itself | Extract `<SubmitButton>` to its own component |
| Not calling `revalidatePath` after mutation | Always revalidate the affected path |
| Using `redirect()` inside try/catch | Move redirect outside try/catch |
| Passing sensitive data as hidden inputs | Validate on server — never trust client data |
| Server Action not at top of file | `'use server'` directive must be first line |
| Mutating in Server Components | Server Components are read-only; use `'use client'` + action |
| Zod `safeParse` then ignoring errors | Always return errors to the form |
| Multiple forms on one page sharing action | Each form gets its own action or use a field to discriminate |

## Multiple Actions Per Form

```tsx
<form>
  <button formAction={saveDraft}>Save Draft</button>
  <button formAction={publish}>Publish</button>
</form>
```

Each button can have its own `formAction` pointing to a different Server Action.

## Non-Form Mutations (Calling Actions Programmatically)

```tsx
// For button clicks, toggles, etc. — import and call:
'use client'

import { toggleLike } from './actions'

function LikeButton({ postId }: { postId: string }) {
  const [optimistic, addOptimistic] = useOptimistic(
    false,
    (_, liked: boolean) => liked
  )

  return (
    <button
      onClick={async () => {
        addOptimistic(!optimistic)
        await toggleLike(postId)
      }}
    >
      {optimistic ? '❤️' : '🤍'}
    </button>
  )
}
```

## Integration with Other Skills

| Skill | Relationship |
|-------|-------------|
| `react-hook-form` | Alternative form approach (client-side state) — use when you need complex field interactions or field arrays |
| `nextjs-cache` | After mutation, `revalidatePath` / `revalidateTag` to invalidate cache |
| `nextjs-app-router` | Form pages use App Router conventions (loading.tsx for submit state) |
| `tanstack-query` | For GET/read operations — Server Actions are for mutations only |

## When to Use Server Actions vs API Routes

| Use Server Actions for | Use API Routes for |
|-----------------------|-------------------|
| Forms with progressive enhancement | Public APIs consumed by external clients |
| Mutations tightly coupled to UI | Webhooks / third-party callbacks |
| When you want co-located data flow | When you need cache headers, CORS, streaming |
| Optimistic updates | File uploads (use `multipart/form-data`) |

## Verification

- [ ] `'use server'` is the first line of the action file
- [ ] Server Action accepts `(prevState, formData)` matching `useActionState` signature
- [ ] `useFormStatus` is in a child component (not the form itself)
- [ ] All form fields have `name` attributes (for FormData extraction)
- [ ] Zod validation returns field-level errors
- [ ] `revalidatePath` / `revalidateTag` called after mutations
- [ ] `redirect()` outside try/catch blocks
- [ ] Progressive enhancement: form works with JS disabled
- [ ] Optimistic updates use `useOptimistic` with clean revert on error
