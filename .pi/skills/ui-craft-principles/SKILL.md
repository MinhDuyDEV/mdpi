---
name: ui-craft-principles
description: 16 craft principles for UI polish — concentric border-radius, optical alignment, interruptible animations, tabular numbers, and more
---

# UI Craft Principles

## When to Use

- When polishing UI after the basic implementation is working
- During code review to catch craft-level issues
- When building design-system components that need production-grade polish
- When the UI looks "good enough" but not "pixel-perfect"

## When NOT to Use

- Quick prototypes where craft polish is premature
- Non-visual backend work (APIs, data processing, CLI tools)
- When the layout is still being iterated on (apply after layout is stable)

---

## The 16 Craft Principles

### 1. Concentric Border-Radius

**Rule:** When nesting a container inside another, the inner radius should be `outer radius - padding`. This creates concentric curves.

```tsx
// BEFORE — both have same radius, creates "fattened" corners on inner element
<div className="rounded-xl p-4 bg-zinc-100">
  <div className="rounded-xl bg-white">...</div>
</div>

// AFTER — inner radius = outer radius - padding (16px - 16px = 0, or use rounded-md)
<div className="rounded-xl p-4 bg-zinc-100">
  <div className="rounded-lg bg-white">...</div>
  {/*    ^^^ rounded-xl(12px) - p-4(16px) = too small, use rounded-lg(8px) */}
</div>

// Better formula: rounded-lg(8px) p-4 => inner uses rounded-md(6px) or rounded(4px)
<div className="rounded-lg p-4 bg-zinc-100">
  <div className="rounded-md bg-white">...</div>
</div>
```

**Formula:** `innerRadius = outerRadius - padding`. If result is negative, use 0. Minimum inner radius is 0 (sharp corners).

---

### 2. Optical Alignment

**Rule:** Text always needs a slight left offset to appear visually centered. Font glyphs have inherent left-side bearing that makes them look off-center.

```css
/* BEFORE */
.headline {
  margin-left: 0;
}

/* AFTER — compensate for glyph bearing */
.headline {
  margin-left: -0.05em;
}

/* For icons next to text: */
.icon-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375em;  /* not px — use em so it scales with font */
}

.icon-label svg {
  /* Icons appear smaller than text at same size — bump up slightly */
  width: 1.1em;
  height: 1.1em;
}
```

---

### 3. Multi-Shadow Layering

**Rule:** Use 2-3 shadows to create realistic depth instead of a single heavy box-shadow.

```css
/* BEFORE — single heavy shadow looks cheap */
.card {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* AFTER — layered shadows for realistic depth */
.card {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),     /* contact shadow */
    0 4px 8px rgba(0,0,0,0.06),     /* mid elevation */
    0 12px 24px rgba(0,0,0,0.08);   /* far falloff */
}

/* Tinted shadows — match the background hue */
.card-dark {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.2),
    0 4px 8px rgba(0,0,0,0.25),
    0 12px 24px rgba(0,0,0,0.3);
}
```

---

### 4. Interruptible Animations

**Rule:** Animations should use spring-based physics (interruptible, natural-feeling) not duration-based linear easing.

```tsx
// BEFORE — fixed duration, cannot be interrupted
const animation = useSpring({
  opacity: isOpen ? 1 : 0,
  config: { duration: 300 },
});

// AFTER — spring-based, interruptible
import { useSpring, animated } from '@react-spring/web';

const animation = useSpring({
  opacity: isOpen ? 1 : 0,
  config: { mass: 1, tension: 280, friction: 24 },
});
```

```css
/* If using CSS transitions instead of spring: */
.element {
  /* duration-only timing feels robotic */
  transition: transform 300ms ease, opacity 200ms ease;
  /* Better — still CSS but with natural easing */
  transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 200ms ease;
}

/* The "ease-out-forward" curve: cubic-bezier(0.22, 1, 0.36, 1) */
/* Fast start, gentle end — mimics spring behavior */
```

---

### 5. Scale on Press

**Rule:** Pressable elements should scale down slightly on `:active` to simulate physical depression.

```tsx
// BEFORE — no tactile feedback
<button className="bg-primary text-white rounded-md px-4 py-2">
  Click me
</button>

// AFTER — scale on press + hover elevation
<button className="
  bg-primary text-white rounded-md px-4 py-2
  transition-transform duration-100 ease-out
  hover:scale-[1.02]
  active:scale-[0.98]
">
  Click me
</button>
```

---

### 6. Tabular Numbers for Data

**Rule:** Numbers in tables, prices, stats, and data displays must use tabular figures (fixed-width numerals) to prevent visual jitter.

```css
/* BEFORE — proportional numbers jitter as values change */
.price {
  font-size: 1.5rem;
  font-weight: 600;
}

/* AFTER — tabular numbers stay aligned */
.price {
  font-variant-numeric: tabular-nums;
  /* Also good for data displays: */
  font-variant-numeric: tabular-nums lining-nums;
}

/* For monospace data, typical combo: */
.data-value {
  font-variant-numeric: tabular-nums slashed-zero;
}
```

---

### 7. `will-change` Sparingly

**Rule:** Only use `will-change` immediately before an animation starts, and remove it after. Never leave it on permanently — it wastes GPU memory.

```tsx
// BEFORE — will-change permanently applied
<div className="will-change-transform" />

// AFTER — apply before animation, clean up after
const [animating, setAnimating] = useState(false);

useEffect(() => {
  if (animating) {
    const timer = setTimeout(() => setAnimating(false), 300);
    return () => clearTimeout(timer);
  }
}, [animating]);

// In component:
<div
  className={animating ? 'will-change-transform' : ''}
  style={{ transition: 'transform 300ms ease' }}
/>
```

---

### 8. Hit Areas ≥ 44px

**Rule:** Every interactive element must have a minimum 44×44px hit area — even if the visual element is smaller.

```tsx
// BEFORE — icon-only button, 24×24 visual, tiny hit area
<button className="p-0" aria-label="Close">
  <XIcon className="h-6 w-6" />
</button>

// AFTER — padded to 44px minimum
<button
  className="p-2.5"
  style={{ minWidth: '44px', minHeight: '44px' }}
  aria-label="Close"
>
  <XIcon className="h-6 w-6" aria-hidden="true" />
</button>

// For inline links — use larger padding on the link itself
<a href="/docs" className="inline-block py-2 px-1 -mx-1">
  Documentation
</a>
```

---

### 9. Skeleton Specificity

**Rule:** Skeleton loaders must match the exact layout of the real content — not generic bars.

```tsx
// BEFORE — generic skeleton, doesn't match layout
{loading && (
  <div className="space-y-3">
    <div className="h-4 rounded bg-zinc-200 animate-pulse" />
    <div className="h-4 rounded bg-zinc-200 animate-pulse" />
    <div className="h-4 rounded bg-zinc-200 animate-pulse" />
  </div>
)}
{!loading && (
  <div className="flex gap-4">
    <img className="w-16 h-16 rounded-full" />
    <div>
      <h3 className="text-lg font-semibold">Name</h3>
      <p className="text-sm text-gray-500">Description</p>
    </div>
  </div>
)}

// AFTER — skeleton matches exact real layout
{loading ? (
  <div className="flex gap-4">
    <div className="w-16 h-16 rounded-full bg-zinc-200 animate-pulse shrink-0" />
    <div className="space-y-2 flex-1">
      <div className="h-5 w-32 rounded bg-zinc-200 animate-pulse" />
      <div className="h-4 w-48 rounded bg-zinc-200 animate-pulse" />
    </div>
  </div>
) : (
  <div className="flex gap-4">
    <img className="w-16 h-16 rounded-full" />
    <div>
      <h3 className="text-lg font-semibold">Name</h3>
      <p className="text-sm text-gray-500">Description</p>
    </div>
  </div>
)}
```

---

### 10. Text Balance

**Rule:** Use `text-wrap: balance` on headlines to prevent uneven line breaks (one word on the last line).

```css
/* BEFORE — "rag" with one word on last line */
.headline {
  font-size: 2.5rem;
  line-height: 1.1;
}

/* AFTER — balanced wrapping */
.headline {
  font-size: 2.5rem;
  line-height: 1.1;
  text-wrap: balance;
}

/* For short content, also consider pretty for justified: */
.hero-tagline {
  text-wrap: pretty;
}
```

---

### 11. Scroll Margin for Anchor Links

**Rule:** Anchor links should have scroll margin so the target isn't hidden behind fixed headers.

```css
/* BEFORE — anchor links scroll target to top of viewport */
#section-target {
  /* target is hidden under fixed header */
}

/* AFTER — reserve space above the target */
#section-target,
[id] {
  scroll-margin-top: 6rem; /* match fixed header height */
}

/* In Tailwind: */
/* <div id="section" className="scroll-mt-24"> */
```

```tsx
// For smooth scrolling:
<nav>
  <a href="#pricing" className="scroll-smooth">
    Pricing
  </a>
</nav>

// Enable on the document:
// html { scroll-behavior: smooth; }
```

---

### 12. Focus Ring Offset

**Rule:** When using `outline` for focus rings, always add `outline-offset` so the ring doesn't get clipped by borders or shadows.

```css
/* BEFORE — outline clips on bordered elements */
*:focus-visible {
  outline: 2px solid var(--color-primary);
}

/* AFTER — offset keeps the ring visible */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* For buttons with borders: */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  /* ring sits outside the border, fully visible */
}
```

---

### 13. Animation Duration Hierarchy

**Rule:** Maintain a strict duration scale so animations feel coherent.

```
100ms — micro-interactions (hover, press, color change)
200ms — small transitions (opacity, small transforms)
300ms — medium transitions (panel slide, fade-in)
500ms — large transitions (page transitions, modals)
```

```css
:root {
  --duration-micro: 100ms;
  --duration-small: 200ms;
  --duration-medium: 300ms;
  --duration-large: 500ms;
}

.button {
  transition: background-color var(--duration-micro) ease,
              transform var(--duration-small) ease;
}

.panel {
  transition: transform var(--duration-medium) ease,
              opacity var(--duration-medium) ease;
}

.modal-backdrop {
  transition: opacity var(--duration-medium) ease;
}
```

---

### 14. `prefers-reduced-motion` (Mandatory)

**Rule:** Every animation must respect the user's motion preference. No exceptions.

```css
/* BEFORE — animation plays regardless */
.fade-in {
  animation: fadeIn 300ms ease-out;
}

/* AFTER — disabled when user prefers reduced motion */
.fade-in {
  animation: fadeIn 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// In JavaScript/React:
import { useReducedMotion } from 'framer-motion'; // or:

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

---

### 15. Image Aspect-Ratio Reservation

**Rule:** Reserve space for images before they load to prevent layout shift.

```tsx
// BEFORE — image causes layout shift on load
<div className="grid grid-cols-3 gap-4">
  {images.map(src => <img key={src} src={src} />)}
</div>

// AFTER — aspect ratio reserved, no layout shift
<div className="grid grid-cols-3 gap-4">
  {images.map(src => (
    <div className="aspect-[4/3] relative overflow-hidden bg-zinc-100">
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  ))}
</div>

// Alternative: using aspect-ratio directly on img
<img
  src={src}
  alt=""
  className="w-full aspect-video object-cover"
  loading="lazy"
/>
```

---

### 16. Color Gamut Awareness

**Rule:** Use OKLCH for colors that extend beyond sRGB, and provide sRGB fallbacks for older browsers.

```css
/* BEFORE — sRGB only, losing gamut range */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* AFTER — OKLCH for wider gamut, sRGB fallback */
.hero {
  /* Fallback for older browsers */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* OKLCH for wider gamut displays */
  background: linear-gradient(
    135deg,
    oklch(0.6 0.2 280) 0%,
    oklch(0.5 0.25 310) 100%
  );
}

/* Detection via @supports */
@supports (color: oklch(0 0 0)) {
  .hero {
    background: linear-gradient(135deg,
      oklch(0.6 0.2 280) 0%,
      oklch(0.5 0.25 310) 100%
    );
  }
}
```

---

## Don't

| Pattern | Replacement | Because |
|---------|-------------|---------|
| Same border-radius on nested containers | Apply concentric formula: `innerRadius = outerRadius - padding` | Same radius creates "fattened" corner look on inner element |
| Single heavy `box-shadow` | 2-3 layered shadows with decreasing opacity | Layered shadows create realistic depth |
| Fixed-duration CSS transitions | Spring-based physics or natural easing curves | Fixed duration can't be interrupted mid-animation |
| No `:active` state on pressable elements | `active:scale-[0.98]` for physical push feedback | Missing tactile feedback makes UI feel flat |
| Proportional numbers in data displays | `font-variant-numeric: tabular-nums` | Proportional numbers jitter as values change |
| Permanent `will-change` on animated elements | Apply before animation, remove after | Permanent will-change wastes GPU memory |
| Generic skeleton bars not matching layout | Skeleton matching exact real content layout | Generic skeletons don't provide useful placeholder |
| `outline: none` without `:focus-visible` fallback | `outline: 2px solid` with `outline-offset: 2px` using `:focus-visible` | Removing outlines breaks keyboard navigation |
| No `prefers-reduced-motion` handling | Always respect user motion preferences with media query | Animations can cause discomfort for vestibular disorders |

## Verification

- [ ] Concentric radius formula applied to all nested containers
- [ ] Text elements have optical alignment compensation (`margin-left: -0.05em`)
- [ ] All shadows use 2-3 layer multi-shadow syntax (not single box-shadow)
- [ ] Animations use spring/physics-based parameters, not just duration
- [ ] Pressable elements have `active:scale-[0.98]` or equivalent
- [ ] Numeric data displays use `font-variant-numeric: tabular-nums`
- [ ] No permanent `will-change` properties in CSS/JSX
- [ ] All interactive elements have ≥ 44×44px hit area
- [ ] Skeleton loaders match final layout structure (not generic bars)
- [ ] Headlines use `text-wrap: balance`
- [ ] Anchor-linked elements have `scroll-margin-top`
- [ ] Focus rings have `outline-offset: 2px`
- [ ] Animation durations follow the 100/200/300/500ms scale
- [ ] `prefers-reduced-motion` media query present for all animations
- [ ] Images have reserved aspect-ratio containers to prevent layout shift
- [ ] OKLCH colors used with sRGB fallback where gamut extension matters
