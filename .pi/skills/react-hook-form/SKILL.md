---
name: react-hook-form
description: Use when building forms with React Hook Form v7 and Zod v3. Covers useForm, controlled vs uncontrolled, zodResolver, conditional fields, field arrays, Server Actions integration. MUST load before any form implementation.
---

# React Hook Form + Zod

## When to Use

- Building complex forms with many fields and validation rules
- Integrating Zod schemas for type-safe form validation
- Handling conditional fields and dynamic field arrays
- Optimizing form performance (uncontrolled inputs, minimal re-renders)
- Integrating forms with Server Actions in Next.js
- Field-level and form-level validation with custom error messages

## When NOT to Use

- Simple forms with 1-2 fields (use plain Server Actions)
- Read-only data display (no form needed)
- Forms that must work without JavaScript (use progressive enhancement Server Actions)

## Setup

```bash
npm install react-hook-form @hookform/resolvers zod
```

## Basic Form

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().min(18, 'Must be 18 or older'),
})

type FormData = z.infer<typeof schema>

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', age: 0 },
  })

  const onSubmit = async (data: FormData) => {
    await createUser(data)  // Server Action or API call
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('name')} placeholder="Name" />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <input {...register('email')} placeholder="Email" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <input type="number" {...register('age')} placeholder="Age" />
        {errors.age && <p className="text-red-500">{errors.age.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

## Controlled Components (shadcn/ui + Zod)

React Hook Form is uncontrolled by default. Use `Controller` for controlled UI libraries:

```tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
})

export function PlanForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="plan"
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
    </form>
  )
}
```

## Zod Schema Patterns

```tsx
// Refinement — cross-field validation
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],  // Attach error to confirmPassword field
})

// SuperRefine — complex logic
const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
}).superRefine((data, ctx) => {
  if (data.email === data.username) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email and username must be different',
      path: ['username'],
    })
  }
})

// Coercion — convert string inputs
z.coerce.number()    // "42" → 42
z.coerce.boolean()   // "true" → true
z.coerce.date()      // "2024-01-01" → Date

// Preprocess — custom coercion
z.preprocess((val) => {
  if (typeof val === 'string') return val.trim()
  return val
}, z.string().min(1))
```

## Conditional Fields

```tsx
const schema = z.discriminatedUnion('accountType', [
  z.object({
    accountType: z.literal('personal'),
    name: z.string().min(2),
  }),
  z.object({
    accountType: z.literal('business'),
    companyName: z.string().min(2),
    vatNumber: z.string().regex(/^[A-Z]{2}\d{8,12}$/),
  }),
])

type FormData = z.infer<typeof schema>

export function AccountForm() {
  const { register, watch, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const accountType = watch('accountType')

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('accountType')}>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>

      {accountType === 'personal' && (
        <input {...register('name')} />
      )}
      {accountType === 'business' && (
        <>
          <input {...register('companyName')} />
          <input {...register('vatNumber')} />
        </>
      )}
    </form>
  )
}
```

## Field Arrays (Dynamic Fields)

```tsx
import { useFieldArray } from 'react-hook-form'

const schema = z.object({
  emails: z.array(
    z.object({ value: z.string().email() })
  ).min(1, 'At least one email required'),
})

export function EmailListForm() {
  const { register, control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { emails: [{ value: '' }] },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'emails',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`emails.${index}.value`)} placeholder="Email" />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ value: '' })}>
        Add Email
      </button>
    </form>
  )
}
```

## Integration with Server Actions

React Hook Form can delegate submission to a Server Action:

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUser } from './actions'
import { useActionState } from 'react'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export function UserForm() {
  const [serverState, formAction] = useActionState(createUser, null)

  const { register, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form action={formAction}>
      <input {...register('name')} />
      {errors.name?.message || serverState?.errors?.name?.[0]}

      <input {...register('email')} />
      {errors.email?.message || serverState?.errors?.email?.[0]}

      <button type="submit">Create</button>
    </form>
  )
}
```

**Decision guide:**
- **Plain Server Actions** → Simple forms, progressive enhancement needed
- **React Hook Form** → Complex forms, dynamic fields, client-side validation UX
- **Combined** → RHF for client UX + Server Action for submission

## Form State Reference

```tsx
const { formState } = useForm()

formState.isDirty       // User modified any field
formState.isValid       // All fields pass validation
formState.isSubmitting  // Currently submitting
formState.isSubmitted   // Form was submitted at least once
formState.isSubmitSuccessful  // Last submit succeeded
formState.errors        // Field-level errors object
formState.dirtyFields   // Which fields were modified
formState.touchedFields // Which fields gained and lost focus
```

## Performance: `useForm` Options

```tsx
const { register } = useForm({
  mode: 'onBlur',          // Validate on blur (default: onSubmit)
  reValidateMode: 'onChange', // Re-validate after first submit
  shouldFocusError: true,  // Focus first field with error after submit
  criteriaMode: 'all',     // Show all validation errors per field
  delayError: 500,         // Delay error display (ms) for async validation
})
```

## Debounced Validation (Async)

```tsx
const schema = z.object({
  username: z.string().min(3).refine(
    async (username) => {
      const available = await checkUsername(username)
      return available
    },
    { message: 'Username is already taken' }
  ),
})

// React Hook Form debounces the refine call
// Add throttle via watch + useEffect if needed
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Mixing `register` and `Controller` for same field | Pick one — use `Controller` for UI libraries, `register` for native inputs |
| Forgetting `defaultValues` shape | `defaultValues` must match schema shape — otherwise fields are undefined |
| `watch` in render causing loops | Use `watch` sparingly; prefer `getValues()` in callbacks |
| `setValue` without `shouldDirty`/`shouldValidate` | `setValue('field', val, { shouldDirty: true, shouldValidate: true })` |
| Zod `refine` on field that doesn't exist yet | Use `superRefine` and `addIssue` with explicit `path` |
| Not forwarding `ref` in custom components | Use `React.forwardRef` or Controller for custom inputs |
| `handleSubmit` not wrapping async handler | Always `async (data) => { await ... }` — unhandled promise rejections crash |
| `useFieldArray` `key` using index | Always use `field.id` as key (not index) — stable across add/remove |

## When to Use React Hook Form vs Server Actions Only

| React Hook Form | Server Actions Only |
|-----------------|-------------------|
| Complex validation UX (real-time errors) | Simple forms (2-3 fields) |
| Dynamic field arrays | Progressive enhancement required |
| Conditional fields that affect validation | No client-side validation needed |
| Multi-step wizards | Static forms that rarely change |
| shadcn Select/DatePicker/Combobox | Native inputs only |
| Field-level async validation (username check) | Server-only validation |

## Verification

- [ ] `zodResolver(schema)` configured — links Zod to RHF
- [ ] `defaultValues` match the schema structure
- [ ] All controlled components use `Controller` or `useController`
- [ ] `useFieldArray` keys use `field.id` (not index)
- [ ] Conditional fields use `watch` with `z.discriminatedUnion` or `z.union`
- [ ] `handleSubmit` wraps async function
- [ ] Field-level errors displayed via `formState.errors`
- [ ] `isSubmitting` disables submit button during submission
- [ ] Cross-field validation uses `.refine()` or `.superRefine()` with `path`
