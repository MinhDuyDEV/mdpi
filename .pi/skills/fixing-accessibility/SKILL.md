---
name: fixing-accessibility
description: Actionable WCAG 2.1 AA accessibility fixes — not just audit, but concrete code fixes with before/after examples
---

# Fixing Accessibility

## When to Use

- After building UI components — run this as a quality gate before merging
- When fixing accessibility issues found by axe-core, Lighthouse, or manual testing
- When adding keyboard navigation, ARIA labels, focus management, or screen reader support
- When retrofitting accessibility onto existing components
- During code review of UI changes — check for common accessibility regressions

## When NOT to Use

- For accessibility audits without implementation (use `ui-quality-audit` instead)
- When building non-interactive content (static markup with no dynamic behavior)
- When the only user of the application is yourself and you don't need assistive tech

---

## Priority Categories

### 1. Keyboard Navigation

**Why it matters:** ~25% of web users rely on keyboard navigation. If they can't tab through your interface, it's unusable.

**Common issues:**
- Interactive elements aren't focusable
- Custom components (select, dropdown, menu) trap or skip focus
- Tab order doesn't match visual order
- No visible focus indicator

**Fixes:**

```tsx
// BEFORE — custom dropdown not keyboard-accessible
<div className="relative">
  <div onClick={() => setOpen(!open)}>Select option</div>
  {open && items.map(item => (
    <div key={item} onClick={() => select(item)}>{item}</div>
  ))}
</div>

// AFTER — proper button + listbox pattern
<div className="relative">
  <button
    type="button"
    onClick={() => setOpen(!open)}
    aria-expanded={open}
    aria-haspopup="listbox"
    className="..."
  >
    {selected || 'Select option'}
  </button>
  {open && (
    <ul role="listbox" className="absolute ...">
      {items.map(item => (
        <li
          key={item}
          role="option"
          tabIndex={-1}
          onClick={() => select(item)}
          onKeyDown={(e) => { if (e.key === 'Enter') select(item); }}
          aria-selected={item === selected}
          className="..."
        >
          {item}
        </li>
      ))}
    </ul>
  )}
</div>
```

```tsx
// BEFORE — missing focus indicator on interactive card
<div onClick={() => navigate(id)} className="rounded-lg p-4 cursor-pointer">
  <h3>{title}</h3>
  <p>{desc}</p>
</div>

// AFTER — focusable with visible ring
<button
  type="button"
  onClick={() => navigate(id)}
  className="rounded-lg p-4 text-left w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  <h3>{title}</h3>
  <p className="text-muted-foreground">{desc}</p>
</button>
```

**Quick check:** Tab through the entire page. Every interactive element should receive focus in a logical order. You should never get stuck in a focus trap.

---

### 2. Focus Management

**Why it matters:** Users must know where they are at all times. Lost focus = lost user.

**Common issues:**
- Focus doesn't move to newly opened modal/dialog
- Focus gets reset to top of page after dynamic content change
- Focus outline is removed via `outline: none` without alternative

**Fixes:**

```tsx
// BEFORE — modal opens, focus stays on trigger button
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="...">
        {children}
      </div>
    </div>
  );
}

// AFTER — auto-focus dialog and Escape to close (for full focus-trap, see `frontend-design` interaction patterns)
function Modal({ open, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Focus the dialog container
      dialogRef.current?.focus();
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-white rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}
```

```css
/* BEFORE — removes focus outline entirely (DO NOT DO THIS) */
*:focus {
  outline: none;
}

/* AFTER — custom focus ring that's visible */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove outline only for mouse clicks, keep keyboard focus visible */
*:focus:not(:focus-visible) {
  outline: none;
}
```

---

### 3. ARIA Labels

**Why it matters:** ARIA labels provide screen reader context that visual users take for granted.

**Common issues:**
- Icon-only buttons without labels
- Dynamic content changes not announced
- Incorrect or redundant ARIA (overriding semantic HTML)

**Fixes:**

```tsx
// BEFORE — icon button with no label
<button onClick={onDelete}>
  <TrashIcon className="h-5 w-5" />
</button>

// AFTER — labeled for screen readers
<button onClick={onDelete} aria-label="Delete item">
  <TrashIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

```tsx
// BEFORE — dynamic content without announcement
<div>
  {items.length === 0 && <p>No results found</p>}
</div>

// AFTER — announces content changes
<div aria-live="polite" aria-atomic="true">
  {items.length === 0 && <p>No results found</p>}
</div>
```

**Rule of thumb:** If it has no visible text label, it needs `aria-label`. If it has a visible label, use `aria-labelledby` pointing to the label's `id`.

---

### 4. Color Contrast

**Why it matters:** WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular).

**Common issues:**
- Gray text on white backgrounds (e.g., `text-gray-400` on white)
- Low-contrast placeholder text
- Links that only differ by color
- Disabled buttons with insufficient contrast

**Fixes:**

```tsx
// BEFORE — insufficient contrast
<p className="text-gray-400 text-sm">Supporting text</p>

// AFTER — meets 4.5:1
<p className="text-gray-600 text-sm">Supporting text</p>
```

```tsx
// BEFORE — link only distinguishable by color
<span className="text-gray-600">
  Terms of <a href="/service" className="text-blue-500">Service</a>
</span>

// AFTER — link has underline (non-color cue)
<span className="text-gray-600">
  Terms of <a href="/service" className="text-blue-500 underline">Service</a>
</span>
```

**Quick check:** Use the browser DevTools color picker — it shows contrast ratio. Check body text first, then small text, then placeholder text.

---

### 5. Heading Hierarchy

**Why it matters:** Screen reader users navigate pages by heading structure. Bad hierarchy means they can't understand the page layout.

**Common issues:**
- Skipping levels (h1 → h3)
- Multiple h1s on one page
- Headings selected by visual size, not semantic level
- No h1 on the page

**Fixes:**

```tsx
// BEFORE — skipped level, no h1
<div className="text-3xl font-bold">Product Page</div>
<h3 className="text-xl">Reviews</h3>
<h4 className="text-lg">User Review</h4>

// AFTER — proper hierarchy
<h1 className="text-3xl font-bold">Product Page</h1>
<h2 className="text-xl">Reviews</h2>
<h3 className="text-lg">User Review</h3>
```

**Quick check:** Run the WAVE browser extension or use your browser's accessibility panel to view heading structure. It should read like a table of contents: one h1, logical nesting.

---

### 6. Form Labels

**Why it matters:** Every form input needs an associated label for screen readers and click target expansion.

**Common issues:**
- Placeholder as label (disappears on input)
- Missing `for`/`id` association
- Error messages not associated with inputs
- Required fields not indicated programmatically

**Fixes:**

```tsx
// BEFORE — placeholder-only label
<input
  type="email"
  placeholder="Email address"
  className="..."
/>

// AFTER — proper label association
<label htmlFor="email" className="block text-sm font-medium">
  Email address
</label>
<input
  id="email"
  type="email"
  placeholder="you@example.com"
  aria-required="true"
  className="mt-1 ..."
/>
```

```tsx
// BEFORE — error message not associated
<div>
  <label htmlFor="name">Name</label>
  <input id="name" />
  <p className="text-red-500">Name is required</p>
</div>

// AFTER — error message linked via aria-describedby
<div>
  <label htmlFor="name">Name</label>
  <input
    id="name"
    aria-invalid={!!error}
    aria-describedby={error ? 'name-error' : undefined}
  />
  {error && (
    <p id="name-error" className="text-red-500 text-sm" role="alert">
      {error}
    </p>
  )}
</div>
```

---

### 7. Image Alt Text

**Why it matters:** Without alt text, screen readers read the image filename or say "image" — zero information.

**Common issues:**
- Missing `alt` on informative images
- Redundant `alt=""` on images that should be described
- Alt text that duplicates adjacent text
- Decorative images missing `alt=""`

**Fixes:**

```tsx
// BEFORE — informative image without alt
<img src="/team/maria.jpg" className="rounded-full" />

// AFTER — describes the image content
<img src="/team/maria.jpg" alt="Maria Chen, Head of Design" className="rounded-full" />
```

```tsx
// BEFORE — decorative icon without alt="" (screen reader reads filename)
<img src="/decorative-divider.svg" className="h-4 w-full" />

// AFTER — explicitly decorative
<img src="/decorative-divider.svg" alt="" role="presentation" className="h-4 w-full" />
```

**Rule of thumb:**
- Informative → describe the content/function
- Decorative → `alt=""` (empty string)
- Link → describe the link destination
- Complex (chart/diagram) → link to a text description nearby

---

### 8. Touch Targets

**Why it matters:** WCAG 2.1 requires touch targets ≥ 44×44px. Small targets frustrate all users, especially on mobile.

**Common issues:**
- Small icon buttons (24×24 or smaller)
- Closely packed links in nav or footer
- Small form inputs on mobile

**Fixes:**

```tsx
// BEFORE — 28×28 icon button, hard to tap
<button className="p-1">
  <XIcon className="h-5 w-5" />
</button>

// AFTER — padded to 44×44 minimum
<button
  className="p-2.5"
  style={{ minWidth: '44px', minHeight: '44px' }}
  aria-label="Close"
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

```css
/* BEFORE — nav links with no spacing */
.nav-link { display: inline; }

/* AFTER — each link has 44px minimum hit area */
.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 12px;
}
```

**Quick check:** On mobile viewport (375px), try tapping each interactive element. If you miss or hit the wrong thing, the target is too small or too close.

---

### 9. Screen Reader Content

**Why it matters:** Screen readers linearize content. Off-screen content, live regions, and status messages must be handled explicitly.

**Common issues:**
- Loading states not announced
- Sort/filter changes not announced
- Off-screen/navigable content not hidden from screen readers
- Status messages without `role="status"` or `aria-live`

**Fixes:**

```tsx
// BEFORE — loading not announced
{loading && <Spinner />}
{!loading && <DataGrid data={items} />}

// AFTER — loading announced via aria-live
<div aria-live="polite" aria-atomic="true">
  {loading && (
    <div role="status">
      <span className="sr-only">Loading data...</span>
      <Spinner aria-hidden="true" />
    </div>
  )}
  {!loading && <DataGrid data={items} />}
</div>
```

```tsx
// BEFORE — sort change not announced
<button onClick={() => setSort('date')}>Sort by date</button>

// AFTER — sort change announced
<button onClick={() => { setSort('date'); setAnnounce(`Sorted by date`); }}>
  Sort by date
</button>
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

---

## Tool Boundaries

| Tool | Can detect | Cannot detect |
|------|-----------|---------------|
| **axe-core / Lighthouse** | Missing alt text, color contrast, heading gaps, missing labels, ARIA errors | Focus order correctness, screen reader flow, real-world keyboard usability |
| **Manual keyboard test** | Tab order, focus traps, focus visibility | ARIA correctness, label quality, contrast ratios |
| **Screen reader (VoiceOver/NVDA)** | Announcement quality, label clarity, live region behavior | Color contrast (programmatic), specific WCAG violations |
| **Color contrast analyzer** | Exact contrast ratios, WCAG pass/fail | Functional usability, real-world readability |

**Recommended workflow:**

1. Run `axe-core` / Lighthouse — fix all detected issues
2. Tab through the page — fix focus order and visibility
3. Test with screen reader on — fix announcement quality
4. Check contrast on all text/background pairs — fix failures
5. Zoom to 200% / 400% — fix content reflow issues

## Verification

- [ ] Tab through every interactive element — logical order, visible focus, no traps
- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated `<label>` elements
- [ ] All images have appropriate `alt` text (informative or decorative `alt=""`)
- [ ] No `outline: none` without `:focus-visible` fallback
- [ ] Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] Heading hierarchy is logical (single h1, no skipped levels)
- [ ] Touch targets ≥ 44×44px on all interactive elements
- [ ] Dynamic content changes are announced via `aria-live` regions
- [ ] Modals/dialogs trap focus and return focus on close
- [ ] Error messages associated with inputs via `aria-describedby`
- [ ] Page works zoomed to 200% without horizontal scroll or content loss
