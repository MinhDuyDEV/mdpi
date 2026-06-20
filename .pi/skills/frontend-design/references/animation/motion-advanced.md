# Motion Advanced

Scroll, orchestration, TypeScript, AnimateView, performance.

## Scroll Animations

```tsx
import { motion, useScroll, useTransform } from 'motion/react';

// Scroll progress (GPU-accelerated via ScrollTimeline API since v12.32)
const { scrollYProgress } = useScroll();
const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

<motion.div style={{ opacity }} />

// Element in view
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true, margin: '-100px' }}
/>
```

## Scroll-linked Animations

```tsx
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start end', 'end start']
});

const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
```

## AnimatePresence Modes

```tsx
// Wait for exit before enter (recommended for page transitions)
<AnimatePresence mode="wait">
  <motion.div key={currentPage} />
</AnimatePresence>

// Popover layout (no exit/enter overlap)
<AnimatePresence mode="popLayout">
  {items.map(item => <motion.div key={item.id} layout />)}
</AnimatePresence>

// Sync (default) - exit and enter simultaneously
<AnimatePresence mode="sync" />
```

## AnimateView (New — Motion+ Early Access)

View Transitions wrapper for React. Enter/exit/update/share animations for page transitions:

```tsx
import { AnimateView } from 'motion/react'

<AnimateView>
  <motion.div
    animate={{ opacity: 1, scale: 1 }}
    initial={{ opacity: 0, scale: 0.95 }}
  />
</AnimateView>
```

Built on React 19.2 `ViewTransition` component. Works alongside Next.js 16 `experimental.viewTransition`.

## arc() — Curved Motion Paths (v12.40+)

```tsx
import { arc } from 'motion/react'

<motion.div
  animate={{
    x: 200,
    y: -120,
    transition: { path: arc() }
  }}
/>
```

## Orchestration

```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.1,
      staggerDirection: -1,  // reverse
      when: 'beforeChildren'  // or 'afterChildren'
    }
  }
};
```

## TypeScript

```tsx
import type { Variants, Transition, MotionProps } from 'motion/react';

const variants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const transition: Transition = {
  type: 'spring',
  stiffness: 300
};

interface Props extends MotionProps {
  isOpen: boolean;
}
```

## useMotionValueEvent

```tsx
import { useMotionValue, useMotionValueEvent } from 'motion/react';

const x = useMotionValue(0);

useMotionValueEvent(x, 'change', (latest) => {
  console.log('x changed to', latest);
});
```

## useInView

```tsx
import { useInView } from 'motion/react';

const ref = useRef(null);
const isInView = useInView(ref, { once: true });

<div ref={ref}>
  {isInView && <motion.div animate={{ opacity: 1 }} />}
</div>
```

## Reorder (Drag to Reorder)

```tsx
import { Reorder } from 'motion/react';

const [items, setItems] = useState([1, 2, 3]);

<Reorder.Group values={items} onReorder={setItems}>
  {items.map(item => (
    <Reorder.Item key={item} value={item}>
      {item}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

## Performance

### Use transform properties
```tsx
// Good - GPU accelerated
animate={{ x: 100, scale: 1.1, rotate: 45, opacity: 0.5 }}

// Avoid - triggers layout
animate={{ width: 200, left: 100, marginTop: 20 }}
```

### Reduce motion
```tsx
import { useReducedMotion } from 'motion/react';

const prefersReduced = useReducedMotion();

<motion.div
  animate={prefersReduced ? {} : { scale: 1.1 }}
/>
```

### Layout animation performance
```tsx
// Add layoutId for better performance on shared layouts
<motion.div layoutId="card" />

// Use layoutRoot to isolate layout calculations
<motion.div layoutRoot />

// Axis-locked layout (v12.35+) — cheaper than full layout
<motion.div layout="x" />

// Custom anchor point (v12.38+)
<motion.div layoutAnchor={{ x: 0.5, y: 0.5 }} />
```

## CSS Color Support (v12.35+)

Motion now supports modern CSS color formats:
- `oklch()`, `oklab()`, `lab()`, `lch()`
- `color-mix()`, `light-dark()`

```tsx
<motion.div
  animate={{ backgroundColor: 'oklch(0.65 0.22 250)' }}
/>
```

## Common Patterns

### Fade in on scroll
```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
/>
```

### Page transitions (Next.js App Router)
```tsx
// app/template.tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname } from 'next/navigation'

export default function Template({ children }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  )
}
```

### Expandable card
```tsx
<motion.div layout onClick={() => setExpanded(!expanded)}>
  <motion.h2 layout="position">Title</motion.h2>
  <AnimatePresence>
    {expanded && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        Content
      </motion.p>
    )}
  </AnimatePresence>
</motion.div>
```

## When to Use anime.js Instead

anime.js v4 still appropriate for:
- Complex SVG morphing (`svg.morphTo`)
- SVG line drawing (`svg.createDrawable`)
- Timeline-heavy sequences in vanilla JS
- Non-React projects

```javascript
import { animate, svg } from 'animejs';
animate('#path1', { d: svg.morphTo('#path2'), duration: 1 });
```

## Library Comparison (2026)

| Library | Bundle | React DX | Scroll | Gestures | Layout Anim |
|---------|--------|----------|--------|----------|-------------|
| **Motion** | ~85KB | 🏆 Best | Built-in | Built-in | Built-in |
| GSAP | ~78KB | Imperative | ScrollTrigger | Draggable | Flip plugin |
| React Spring | ~45KB | Good | External | ❌ | ❌ |
| Anime.js | ~52KB | Imperative | External | ❌ | ❌ |
| TailwindCSS Motion | ~5KB | Good | Built-in | ❌ | ❌ |

**Verdict**: Motion for React-first projects with complex interactions. GSAP for marketing sites with complex timelines. React Spring for physics-driven natural motion. Anime.js for SVG path animations.

## Installation

```bash
npm install motion
# or migrate from framer-motion:
npm uninstall framer-motion && npm install motion
# swap imports: "framer-motion" → "motion/react"
```
