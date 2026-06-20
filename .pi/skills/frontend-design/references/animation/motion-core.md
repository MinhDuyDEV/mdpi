# Motion Core (motion/react)

**Package**: `motion` (v12.40.0). Formerly "framer-motion".
**Import**: `import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react'`

Framer Motion rebranded to **Motion** in November 2024. Both `motion` and `framer-motion` packages published in lockstep. New projects use `motion`. No breaking changes in v12 for React.

## Motion Principles

- Animate for clarity, not decoration
- Use motion to explain state change and hierarchy
- Prefer subtle distance (`8-16px`) and opacity shifts
- Use consistent timing/easing system across the app
- Let Tailwind handle static styles; Motion handles behavior
- **Remove `transition-*` Tailwind classes from motion elements** — they conflict

## Timing System

| Use Case                      | Duration   |
| ----------------------------- | ---------- |
| Instant feedback (hover/tap)  | 100-150ms  |
| State changes (menus/toggles) | 200-300ms  |
| Layout transitions            | 300-500ms  |
| Large entrances               | 500-800ms  |

**Rule**: exit duration = ~75% of enter duration.
**Never exceed 600ms for UI responsiveness.**

## Easing System

Use exponential easing by default:

```tsx
const EASING_ENTER = [0.16, 1, 0.3, 1];
const EASING_EXIT = [0.4, 0, 1, 1];
```

Avoid bounce/elastic easings for product UI. Motion's hybrid engine runs animations natively via Web Animations API (WAAPI) and ScrollTimeline for 120fps GPU performance, falling back to JS only for spring physics and gestures.

## Performance Rules

Animate only compositor-friendly properties:

- `transform` (x, y, scale, rotate, skew)
- `opacity`

Avoid animating:

- `width`, `height` — triggers layout recalculation
- `top`, `left` — use `x`/`y` instead
- `margin`, `padding`, `border`

## Basic Pattern

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
/>
```

## React 19 + Next.js 15/16

### Page Transitions (App Router)

**Critical**: Use `template.tsx`, NOT `layout.tsx`. Layout persists across routes and never remounts.

```tsx
// app/template.tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
        style={{ minHeight: 'var(--page-min-height, 100dvh)' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Dynamic Import (Performance)

```tsx
import dynamic from 'next/dynamic'

const AnimatedWrapper = dynamic(() => import('@/components/animated-wrapper'), {
  ssr: false,
  loading: ({ children }) => <>{children}</>,
})
```

### React 19.2 View Transitions

Next.js 16 + React 19.2 support native View Transitions via `experimental.viewTransition: true`. Motion's `AnimateView` (premium) builds on this.

## Integration with shadcn/ui

**Architecture**: shadcn/ui = structure + accessibility. Motion = behavior + animation. Wrap/extend shadcn components — don't replace.

```
src/
├── components/
│   ├── ui/              # shadcn generated (untouched)
│   └── animated/        # Motion-wrapped shadcn components
│       ├── AnimatedButton.tsx
│       ├── AnimatedDialog.tsx
│       └── ...
└── lib/
    └── animations.ts    # Shared variants & transition configs
```

### Shared Variants Pattern

```ts
// lib/animations.ts
import type { Variants, Transition } from 'motion/react'

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export const spring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
}
```

### Installation Order

1. `npx shadcn init` + add components
2. `npm install motion`
3. Create `lib/animations.ts` for shared variants
4. Create `components/animated/` directory for wrapped components

## Variants Pattern (Recommended)

```tsx
const card = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

<motion.div variants={card} initial="hidden" animate="visible" />
```

## Exit Animations (AnimatePresence)

```tsx
<AnimatePresence mode="wait">
  {open && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
    />
  )}
</AnimatePresence>
```

Always provide stable `key` values. Use `mode="wait"` to prevent overlapping DOM elements.

## Stagger Patterns

```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};
```

Cap total stagger windows to ~500ms.

## Layout Animations

```tsx
<motion.div layout />
```

Use `layout` for reordering and size changes. Add spring only when needed:

```tsx
<motion.div layout transition={{ type: 'spring', stiffness: 320, damping: 28 }} />
```

**New (v12.35+)**: Axis-locked layout: `layout="x"` or `layout="y"`.
**New (v12.38+)**: Custom anchor: `layoutAnchor={{ x: 0.5, y: 0.5 }}`.

## Gestures

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.12 }}
/>
```

Keep gesture amplitudes subtle (`0.98-1.03`). Available: `whileHover`, `whileTap`, `whileFocus`, `whileDrag`, `whileInView`.

## Height Expand/Collapse (No height animation)

Use CSS grid technique:

```css
.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1);
}

.accordion-content[data-open='true'] {
  grid-template-rows: 1fr;
}

.accordion-inner {
  overflow: hidden;
}
```

## Reduced Motion (Mandatory)

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

For motion/react, use `useReducedMotion()`:

```tsx
import { useReducedMotion } from 'motion/react'

const prefersReduced = useReducedMotion()

<motion.div
  animate={prefersReduced ? {} : { scale: 1.1 }}
/>
```

## Motion AI Kit

Official Motion AI tools (premium, Motion+ required):
```bash
npx motion-ai     # Install MCP server + skills for Claude Code, Cursor, Windsurf, etc.
```

Provides: 400+ premium examples, MotionScore runtime profiling, CSS spring generation, transition editing.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `layout.tsx` for AnimatePresence (CLS) | Use `template.tsx` with `mode="wait"` |
| `transition-*` classes on motion elements | Remove Tailwind transition classes |
| Animating `width`/`height` | Use `scaleX`/`scaleY` or grid technique |
| Missing `use client` in Next.js | Extract animation to client component |
| `mode="sync"` with page transitions | Use `mode="wait"` to prevent overlap |
| Duration > 600ms for UI | Cap at 600ms; reserve long durations for storytelling |

## Quick Checklist

- [ ] Uses `motion/react` import (not `framer-motion`)
- [ ] Timing follows 100/300/500ms system
- [ ] Exponential easing, no bounce/elastic
- [ ] Animates only `transform` and `opacity`
- [ ] Uses `AnimatePresence` for exit states
- [ ] Includes reduced motion support (CSS + `useReducedMotion()`)
- [ ] Stagger windows stay under 500ms
- [ ] Next.js: uses `template.tsx` not `layout.tsx`
- [ ] No `transition-*` classes on motion elements
- [ ] shadcn/ui: animated components in `components/animated/`
