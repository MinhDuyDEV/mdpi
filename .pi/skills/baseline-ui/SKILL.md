---
name: baseline-ui
description: Auto-load when editing *.tsx,*.jsx,*.css — quick deslop pass that fixes common AI-generated UI anti-patterns before any design work begins
---

# Baseline UI

## When to Use

- Auto-load when editing `*.tsx`, `*.jsx`, `*.css`, `*.scss` — runs a quick deslop pass first
- Before loading any aesthetic overlay (`design-taste-frontend`, `minimalist-ui`, etc.)
- When reviewing or cleaning up existing UI that looks "AI-generated"
- First step in any frontend implementation pipeline

## When NOT to Use

- When `design-taste-frontend` or a specific aesthetic overlay is already loaded (they supersede these rules)
- When building non-UI code (backend, CLI, data processing, APIs)
- When working with an established design system that already bakes in these rules

---

## Quick Deslop Pass — Three Rule Tiers

Apply these rules in order. **MUST** rules are hard errors — fix before proceeding. **SHOULD** rules are warnings — fix unless there's a deliberate exception. **NEVER** rules are blocking patterns — rewrite entirely.

### MUST Rules (Hard Errors)

Patterns that are never acceptable in production UI. Fix before any other work.

| Rule | Anti-pattern | Fix |
|------|-------------|-----|
| **No purple gradients** | `bg-gradient-to-r from-purple-500 to-indigo-600` | Use a single flat accent color from the project palette, or a subtle tonal gradient within the same hue |
| **No Inter/Roboto/Arial** | `font-['Inter']`, `font-['Roboto']`, or bare `sans-serif` fallback to Arial | Use `Geist`, `Outfit`, `Satoshi`, `Cabinet Grotesk`, or system font stack (`-apple-system, BlinkMacSystemFont`) |
| **No emojis in code** | `🎉`, `🚀`, `✨` in React components, headings, or alt text | Replace with SVG icons (Phosphor, Radix) or clean primitives |
| **No `h-screen`** | `h-screen` on hero sections or full-page layouts | Use `min-h-[100dvh]` to prevent mobile browser chrome layout jump |
| **No `div` onClick as button** | `<div onClick={...} className="cursor-pointer">` | Use `<button type="button">` or `<button type="submit">` with proper styling |

**Before/After examples:**

```tsx
// BEFORE — MUST fix: purple gradient + emoji + h-screen
<section className="h-screen bg-gradient-to-r from-purple-500 to-indigo-600">
  <h1>🚀 Launch Your App</h1>
</section>

// AFTER
<section className="min-h-[100dvh] bg-zinc-900">
  <h1 className="text-white">Launch Your App</h1>
</section>
```

```tsx
// BEFORE — MUST fix: div as button
<div onClick={handleSubmit} className="cursor-pointer rounded px-4 py-2 bg-blue-500 text-white">
  Submit
</div>

// AFTER
<button type="button" onClick={handleSubmit} className="rounded px-4 py-2 bg-blue-500 text-white">
  Submit
</button>
```

---

### SHOULD Rules (Warnings)

Patterns that signal low-quality AI output. Fix unless you have a specific reason not to.

| Rule | Anti-pattern | Fix |
|------|-------------|-----|
| **Use 4pt spacing scale** | Arbitrary spacing: `p-3`, `gap-3`, `m-5` | Use 4pt increments: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px) |
| **Use semantic color tokens** | Raw hex: `text="#3B82F6"`, `bg="#1E40AF"` | Use Tailwind semantic tokens: `text-primary`, `bg-primary-700`, `text-muted-foreground` |
| **Max 1 accent color** | Two+ accent colors competing: blue buttons + green badges + orange links | Pick one accent hue. Use it for all interactive elements. Use neutrals for everything else. |
| **Skeleton loaders, not spinners** | Full-page spinner: `<div className="flex justify-center"><Spinner /></div>` | Match the layout with skeleton bars: `<div className="space-y-4"><div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />...` |
| **Left-align content by default** | Every section centered (`text-center`, `mx-auto`) | Left-align content blocks. Reserve center for short hero headlines only. |
| **Use CSS Grid for layouts** | `flex-wrap` with `w-[calc(33%-1rem)]` math | Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| **Consistent border-radius** | Mixed: `rounded-sm` on cards, `rounded-2xl` on inputs, `rounded-full` on buttons | Pick one radius tier: `rounded-md` (6px) for cards/buttons, `rounded-lg` (8px) for modals. Don't mix. |

**Before/After examples:**

```tsx
// BEFORE — SHOULD fix: arbitrary spacing, raw hex, flex percentage
<div className="flex flex-wrap p-3 gap-3">
  {items.map(i => (
    <div className="w-[calc(50%-6px)] bg="#F3F4F6" p-2.5">
      {i.name}
    </div>
  ))}
</div>

// AFTER
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
  {items.map(i => (
    <div className="bg-muted p-4 rounded-md">
      {i.name}
    </div>
  ))}
</div>
```

```tsx
// BEFORE — SHOULD fix: spinner loading state
{loading && <div className="flex justify-center py-12"><Spinner /></div>}

// AFTER
{loading && (
  <div className="space-y-4 p-4">
    <div className="h-4 w-3/4 rounded bg-zinc-200 animate-pulse" />
    <div className="h-4 w-1/2 rounded bg-zinc-200 animate-pulse" />
    <div className="h-4 w-5/6 rounded bg-zinc-200 animate-pulse" />
  </div>
)}
```

---

### NEVER Rules (Blocking — Rewrite Entirely)

Patterns that signal complete design failure. Block the output and rewrite.

| Rule | Why it's blocked |
|------|-----------------|
| **Pure black `#000`** | Never looks good in UI. Destroys depth. Use `#111`, `#18181b`, or `#1c1c1e` instead. |
| **Centered hero with low variance** | When `DESIGN_VARIANCE <= 4` and layout is centered hero/H1 — forces boring landing pages. Use split-screen or left-aligned content. |
| **3-column identical cards** | Three identical feature cards is the #1 sign of AI-generated UI. Vary layout: 2-col then 1-col, or 4-col grid, or asymmetric bento. |
| **Glassmorphism as decoration** | `backdrop-blur-xl bg-white/10` applied to elements with no functional need for depth. Use flat surfaces or layered shadows instead. |
| **Bounce/elastic easing** | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` or CSS `bounce` animation on UI elements. Use `ease-out` or spring-based motion instead. |
| **Gray text on colored backgrounds** | White text on pastel backgrounds or gray text on white. Always meet 4.5:1 contrast. |

**Before/After examples:**

```tsx
// BEFORE — NEVER: pure black + 3 identical cards + glassmorphism
<div className="bg-black text-white">
  <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8">
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-6"><h3>Feature 1</h3><p>Description</p></div>
      <div className="text-center p-6"><h3>Feature 2</h3><p>Description</p></div>
      <div className="text-center p-6"><h3>Feature 3</h3><p>Description</p></div>
    </div>
  </div>
</div>

// AFTER
<div className="bg-[#111] text-zinc-100">
  <div className="max-w-7xl mx-auto px-6 py-24">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h3 className="text-xl font-semibold">Feature 1</h3>
        <p className="text-zinc-400 mt-2">Description</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h3 className="text-xl font-semibold">Feature 2</h3>
        <p className="text-zinc-400 mt-2">Description</p>
      </div>
    </div>
  </div>
</div>
```

---

## Pipeline Position

```
baseline-ui ──► design-taste-frontend ──► frontend-design ──► frontend-ui-engineering
   ↑
   Quick deslop pass before any design or implementation work
```

Run `baseline-ui` first when starting any frontend work. It catches the most common AI-generation artifacts so downstream skills can focus on real design quality.

## Verification

- [ ] No `h-screen` — all full-height containers use `min-h-[100dvh]`
- [ ] No `div` with `onClick` used as a button — all interactive elements use `<button>`, `<a>`, or proper ARIA roles
- [ ] No emojis in any JSX/TSX or CSS content
- [ ] No purple/indigo-blue gradients
- [ ] No Inter, Roboto, or Arial font references
- [ ] No pure black (`#000`/`#000000`) color values
- [ ] Spacing uses 4pt scale (multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)
- [ ] No 3-column identical card patterns
- [ ] No glassmorphism (`backdrop-blur` + semi-transparent bg) used purely decoratively
- [ ] No bounce/elastic CSS easing curves on UI elements
- [ ] Skeleton loaders used instead of spinners for content loading states
