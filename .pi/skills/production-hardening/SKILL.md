---
name: production-hardening
description: Production hardening checklist for UI — i18n, error states, edge cases, loading states, empty states, validation, accessibility resilience
---

# Production Hardening

## When to Use

- Before deploying any user-facing UI to production
- When adding components to an existing production application
- During code review — check for edge cases and error states
- After initial implementation is working, before merging to main
- When building SaaS products, public websites, or any UI with real users

## When NOT to Use

- Early prototypes or throwaway demos
- Internal tools with no production exposure
- Non-UI code (backend services, CLIs, data pipelines)

---

## Text & Content

### Text Overflow & Truncation

Every text element must handle content that's longer than expected.

```tsx
// BEFORE — long text breaks layout
<div className="grid grid-cols-3 gap-4">
  {items.map(i => (
    <div className="p-4 border rounded">
      <h3>{i.title}</h3>
    </div>
  ))}
</div>

// AFTER — content bounded
<div className="grid grid-cols-3 gap-4">
  {items.map(i => (
    <div className="p-4 border rounded min-w-0">
      <h3 className="truncate">{i.title}</h3>
    </div>
  ))}
</div>
```

```css
/* Common text overflow patterns */
.single-line-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.multi-line-truncate {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Long words/URLs — break them */
.long-word {
  overflow-wrap: break-word;
  word-break: break-word;  /* legacy support */
  hyphens: auto;           /* adds hyphens at break points */
}
```

### Empty States

Never show a blank container. Every data-display component needs an empty state.

```tsx
// BEFORE — blank container when no items
<div className="grid grid-cols-3 gap-4">
  {items.map(i => <Card key={i.id} item={i} />)}
</div>

// AFTER — meaningful empty state
<div>
  {items.length === 0 ? (
    <div className="py-16 text-center">
      <InboxIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">No items yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Get started by creating your first item.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <PlusIcon className="h-4 w-4" />
        Create item
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-3 gap-4">
      {items.map(i => <Card key={i.id} item={i} />)}
    </div>
  )}
</div>
```

### Error States

Every data-fetching or stateful component needs an error state: what happened + why + how to fix.

```tsx
// BEFORE — generic error, no recovery
{error && <p className="text-red-500">Something went wrong</p>}

// AFTER — actionable error with retry
{error && (
  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
    <div className="flex items-start gap-3">
      <AlertCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-medium text-red-800">
          Failed to load items
        </h4>
        <p className="mt-1 text-sm text-red-700">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-red-800 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
)}
```

### i18n Readiness

Even if your app is English-only now, design for internationalization.

```tsx
// BEFORE — English-specific patterns
<p>You have {count} items</p>           // Pluralization hardcoded
<p>Posted on {date.toLocaleDateString()}</p>  // Loses date format control
<input placeholder="Search..." />        // Placeholder as label

// AFTER — i18n-ready
<p>{t('items.count', { count })}</p>    // Use i18n library with plural rules
<p>{new Intl.DateTimeFormat(locale).format(date)}</p>  // Respects locale
<label htmlFor="search">{t('search.label')}</label>
<input id="search" placeholder={t('search.placeholder')} />
```

```css
/* Allow 30% text expansion for translations */
.fixed-width-button {
  min-width: 120px;          /* English: "Save" */
  padding: 0.5rem 1rem;      /* German: "Speichern" — needs ~2x width */
}
.flexible-layout {
  /* Use min-width/max-width, not fixed width, so text can expand */
  min-width: 80px;
  padding-inline: 1rem;
}
```

**i18n checklist:**

| Concern | Check |
|---------|-------|
| Text expansion | UI handles 30%+ longer text in other languages |
| RTL support | Layout uses logical properties (`margin-inline-start` not `margin-left`) |
| Date/number formatting | Uses `Intl.DateTimeFormat`, `Intl.NumberFormat` |
| String concatenation | No `"Hello " + name` — use template strings or i18n library |
| Pluralization | Uses CLDR plural rules (one, few, many, other) |
| Sorting | Uses `localeCompare` for language-aware sorting |
| Currency | Uses `Intl.NumberFormat` with `style: 'currency'` |

---

## Interaction

### Loading States

Every async operation needs a loading state. Use skeleton loaders for content, spinners only for actions.

```tsx
// BEFORE — content flashes on load
{data && <DataTable data={data} />}

// AFTER — skeleton while loading, content when ready
{loading ? (
  <TableSkeleton rows={5} columns={4} />
) : error ? (
  <ErrorState error={error} onRetry={refetch} />
) : (
  <DataTable data={data} />
)}

// For action buttons:
<button
  type="button"
  disabled={isSubmitting}
  className="..."
>
  {isSubmitting ? (
    <>
      <SpinnerIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">Saving...</span>
      Saving
    </>
  ) : (
    'Save'
  )}
</button>
```

### Disabled States

Disabled states must communicate *why* something is disabled, not just gray it out.

```tsx
// BEFORE — just grayed out, no explanation
<button type="button" disabled={!canSubmit} className="opacity-50 cursor-not-allowed">
  Submit
</button>

// AFTER — with tooltip explaining why
<button
  type="button"
  disabled={!canSubmit}
  className="opacity-50 cursor-not-allowed"
  title={!canSubmit ? 'Complete all required fields first' : undefined}
  aria-disabled={!canSubmit}
>
  Submit
</button>
```

### Focus Visible

Never remove focus outlines entirely. Use `:focus-visible` for mouse/keyboard differentiation.

```css
/* Correct pattern */
*:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

/* Remove only for mouse focus (never for keyboard) */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### Keyboard Trap Prevention

Never trap keyboard focus without a documented escape mechanism.

```tsx
// In modals — always close on Escape
useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [open, onClose]);
```

---

## Data & Validation

### Input Validation

Every input needs validation at both the HTML5 level and JavaScript level.

```tsx
// BEFORE — no validation
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// AFTER — HTML5 + JS validation
<input
  type="email"
  value={value}
  onChange={handleChange}
  required
  maxLength={254}
  pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
  className={cn(
    'rounded-md border px-3 py-2',
    error ? 'border-red-500' : 'border-input'
  )}
/>
{error && (
  <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
    {error}
  </p>
)}
```

**Validation rules by type:**

| Input Type | Validation |
|-----------|------------|
| Email | RegExp pattern + maxLength 254 |
| URL | URL parser + protocol check (http/https) |
| Phone | Strip formatting, validate digits only |
| Number | min/max + step if decimal |
| Text | maxLength + sanitize HTML |
| Password | minLength 8 + complexity rules |

### Input Sanitization

Never trust user input — sanitize before rendering.

```tsx
// BEFORE — XSS risk
<div>{userProvidedContent}</div>

// AFTER — sanitize HTML content
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userProvidedContent) }} />

// Better — avoid dangerouslySetInnerHTML entirely if possible
// Most content can be rendered as text:
<div>{escapeHtml(userProvidedContent)}</div>
```

### Max Lengths

Every text input needs a maximum length — database columns aren't infinite.

```tsx
// Show character count for textual inputs
<div className="relative">
  <textarea
    maxLength={500}
    value={bio}
    onChange={handleBioChange}
    className="..."
  />
  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
    {bio.length}/500
  </span>
</div>
```

### Offline States

Detect and handle offline/network issues gracefully.

```tsx
function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="alert" className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      You're offline. Some features may be unavailable.
    </div>
  );
}
```

---

## Edge Cases

### Zero Items

```tsx
// Empty state (described above)
{items.length === 0 && <EmptyState />}
```

### Single Item

```tsx
// BEFORE — single-item layout breaks grid
<div className="grid grid-cols-3 gap-4">
  {items.map(i => <Card key={i.id} item={i} />)}
</div>

// AFTER — auto-fill handles any count
<div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
  {items.map(i => <Card key={i.id} item={i} />)}
</div>
```

### Many Items (Performance)

```tsx
// Virtualize long lists — use react-virtuoso or tanstack-virtual
import { Virtuoso } from 'react-virtuoso';

// BEFORE — renders all 10,000 items
<div>
  {items.map(i => <Row key={i.id} item={i} />)}
</div>

// AFTER — only renders visible items
<Virtuoso
  totalCount={items.length}
  itemContent={(index) => <Row item={items[index]} />}
  style={{ height: '600px' }}
/>
```

### Very Long Names

```tsx
// BEFORE — long name breaks layout
<UserCard>
  <Avatar />
  <span>{user.name}</span>   {/* "Dr. Maximilian von Schtuffenheimer III" */}
</UserCard>

// AFTER — constrained
<UserCard className="min-w-0">
  <Avatar />
  <span className="truncate" title={user.name}>{user.name}</span>
</UserCard>
```

### Missing Images

```tsx
// BEFORE — broken image icon when src fails
<img src={user.avatar} alt={user.name} />

// AFTER — fallback for broken image
<img
  src={user.avatar}
  alt={user.name}
  onError={(e) => {
    e.currentTarget.src = '/avatars/default.svg';
    e.currentTarget.onerror = null; // prevent infinite loop
  }}
/>
```

### Slow Network

```tsx
// Show loading state immediately, even on fast connections
// Use React.Suspense + streaming where possible
// Never show blank page while data loads

// Loading skeleton that appears instantly:
const { data, isLoading } = useQuery({
  queryKey: ['items'],
  queryFn: fetchItems,
  staleTime: 30_000,
});

if (isLoading) return <ItemsSkeleton />;
```

### JS Disabled

```html
<!-- In the <head> of your HTML -->
<noscript>
  <div style="padding: 2rem; text-align: center;">
    <p>This application requires JavaScript to function.</p>
    <p>Please enable JavaScript in your browser settings.</p>
  </div>
</noscript>
```

---

## Cross-Browser

### `-webkit-appearance`

```css
/* BEFORE — native styling differs across browsers */
select, input[type="search"] {
  /* no reset */
}

/* AFTER — consistent cross-browser base */
select, input[type="search"], input[type="number"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Restore arrow for select if desired */
select {
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.5em;
  padding-right: 2.5rem;
}
```

### Scrollbar Styling

```css
/* Consistent scrollbar across browsers */
.custom-scrollbar {
  scrollbar-width: thin;            /* Firefox */
  scrollbar-color: hsl(0 0% 60%) transparent;  /* Firefox */
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(0 0% 60%);
  border-radius: 3px;
}
```

### Font Smoothing

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### Safe Area Insets

```css
/* For notched devices (iOS) */
.safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* For fixed bottom bars */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

---

## Don't

| Pattern | Replacement | Because |
|---------|-------------|---------|
| Long text breaking layout | Apply `truncate`, `overflow-wrap: break-word`, or `-webkit-line-clamp` | Unbounded text breaks grid layouts |
| Blank container when no items | Meaningful empty state with icon, message, and CTA | Blank screens confuse users |
| Generic error ("Something went wrong") | Actionable error: what happened + why + how to fix | Users need to know what to do next |
| Content flash on load (no loading state) | Skeleton loaders matching final layout | Instant skeleton prevents layout shift |
| Just grayed-out disabled button | Tooltip explaining why it's disabled | Users need to know why they can't proceed |
| No input validation | HTML5 + JS validation with `aria-describedby` for errors | Unvalidated input causes data integrity issues |
| No fallback for broken image src | `onError` handler to swap to default image | Broken image icons look unprofessional |
| Unsanitized user content rendering | `DOMPurify.sanitize()` or text-only rendering | Raw user content is an XSS vulnerability |

## Verification

- [ ] All text content handles overflow — truncation or word-break applied
- [ ] Every data-display component has an empty state (not blank container)
- [ ] Every async operation has loading state (skeleton preferred)
- [ ] Every async operation has error state (what + why + fix/retry)
- [ ] All form inputs have maxLength bounds
- [ ] All user-provided content is sanitized before rendering
- [ ] Disabled states explain *why* the element is disabled
- [ ] `:focus-visible` is implemented on all interactive elements
- [ ] No keyboard traps — all modals close on Escape
- [ ] Input validation at HTML5 level + JavaScript level
- [ ] Offline state is detected and communicated to user
- [ ] Single-item layouts don't break (use auto-fill grid)
- [ ] Long lists (100+ items) use virtualization or pagination
- [ ] Very long names/words are truncated or broken
- [ ] Images have `onError` fallback for broken src
- [ ] Safe area insets applied to fixed-position elements
- [ ] `-webkit-appearance` reset on form elements for cross-browser consistency
- [ ] Font smoothing applied to body
- [ ] i18n-ready: text allows 30% expansion, uses logical properties, uses `Intl.*` for dates/numbers
- [ ] `noscript` fallback present in HTML
