---
name: oklch-color-workflow
description: Complete OKLCH color system workflow — syntax, thresholds, conversion, palette generation, contrast checking, gamut mapping, and Tailwind v4 migration
---

# OKLCH Color Workflow

## When to Use

- When defining design tokens or a color palette for a new project
- When migrating from HEX/RGB to OKLCH in Tailwind v4
- When needing wider-gamut colors for modern displays (P3, Rec.2020)
- When creating accessible color systems with predictable lightness and contrast
- When building design systems that need scientific, perceptually-uniform color

## When NOT to Use

- Projects not using CSS or design tokens (native mobile apps without color system migration)
- When a pre-built palette (Tailwind default colors, shadcn/ui defaults) is sufficient
- Quick prototypes where color system design is premature

---

## 1. OKLCH Syntax

OKLCH is a perceptually-uniform color space: equal changes in values produce equal changes in perceived color.

```css
/* Syntax: oklch(L C H / alpha) */
/* L: Lightness — 0 (black) to 1 (white) */
/* C: Chroma — 0 (gray) to ~0.37 (maximum) */
/* H: Hue — 0 to 360 degrees */
/* alpha: Optional — 0 to 1 */

oklch(0.5 0.2 280)             /* Medium purple-blue */
oklch(0.9 0.02 0)              /* Near-white (very low chroma) */
oklch(0.4 0.25 160 / 0.8)      /* Green with opacity */
oklch(0.5 0 0)                 /* Perfect neutral gray — C=0 means no hue */
```

**Key insight:** Unlike HSL where `hsl(0 0% 50%)` is medium gray, OKLCH gray is `oklch(0.5 0 0)` — and it's perceptually the same lightness regardless of hue. HSL's perceived lightness varies by hue (yellows look lighter than blues at the same HSL lightness).

### CSS OKLCH vs HSL comparison:

| Property | HSL | OKLCH |
|----------|-----|-------|
| Perceptual uniformity | No — lightness is hue-dependent | Yes — same L = same perceived lightness |
| Gray point | `hsl(0 0% X%)` — abstract | `oklch(L 0 H)` — C=0 at any hue = gray |
| Gamut | Always sRGB | Extends to P3, Rec.2020 |
| Browser support | Universal | 93%+ (Chrome 111+, Safari 15.4+, Firefox 113+) |

---

## 2. Threshold Values

| Range | Chroma (C) | Use |
|-------|-----------|-----|
| **Gray / Neutral** | `0` — `0.02` | Backgrounds, text, borders, dividers |
| **Subtle** | `0.02` — `0.08` | Tinted neutrals, subtle surfaces, muted text |
| **Accent** | `0.15` — `0.25` | Buttons, links, highlights, brand colors |
| **Vibrant** | `0.25` — `0.37` | Vibrant accents, marketing elements, illustrations |

**Lightness thresholds for text:**

| Use | L (Lightness) | Notes |
|-----|--------------|-------|
| Dark text on light bg | `0.15` — `0.4` | Below 0.15 is too close to black |
| Light text on dark bg | `0.7` — `0.95` | Above 0.95 is too close to white |
| Body text | `0.2` — `0.35` | Comfortable reading range |
| Muted/secondary | `0.4` — `0.6` | Lower contrast text |
| Surface backgrounds (light) | `0.95` — `1` | Near-white |
| Surface backgrounds (dark) | `0.1` — `0.2` | Near-black |

**Hue ranges for common colors:**

| Color | Hue (H) |
|-------|---------|
| Red | 20–40 |
| Orange | 50–75 |
| Yellow | 85–110 |
| Green | 130–160 |
| Teal | 170–200 |
| Blue | 220–270 |
| Purple | 280–310 |
| Pink | 320–350 |
| Neutral | 0 (any, C should be 0) |

---

## 3. Conversion

### HEX/RGB → OKLCH

Use `color-mix()` in CSS or a conversion function:

```ts
// JavaScript conversion using the CSS Color API
function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  
  // Convert sRGB linear → OKLab → OKLCH
  // Use a library instead of manual math for production
  return srgbToOklch([r / 255, g / 255, b / 255]);
}

// Recommended: use `culori` or `colorjs.io` library
import { rgb, oklch } from 'culori';

const color = oklch(rgb('#3B82F6'));
// → { L: 0.54, C: 0.18, H: 260, alpha: 1 }
```

**Online tools:**
- [oklch.com](https://oklch.com) — interactive OKLCH picker
- [huetone.art](https://huetone.art) — palette generation in OKLCH
- [colourcontrast.cc](https://colourcontrast.cc) — contrast checking with OKLCH

### OKLCH → HEX (with gamut mapping)

```css
/* Direct — browser handles gamut mapping automatically */
color: oklch(0.5 0.3 280);

/* Fallback for older browsers */
color: #6b5ae8;
color: oklch(0.5 0.3 280);
```

```ts
import { oklch, rgb } from 'culori';

// Convert OKLCH to sRGB hex (gamut mapped automatically)
const hex = rgb(oklch('oklch(0.5 0.3 280)'));
// Or with explicit gamut mapping to sRGB:
import { clampChroma, toGamut } from 'culori';

const gamutMapped = toGamut('srgb', 'oklch')(oklch('oklch(0.5 0.3 280)'));
```

---

## 4. Palette Generation

### Single-hue palette (50–950 scale)

Given a hue and target lightnesses, vary L and C to create a consistent palette:

```css
/* Blue palette — single hue, varying lightness + chroma */
:root {
  --blue-50:  oklch(0.97 0.01 260);
  --blue-100: oklch(0.93 0.03 260);
  --blue-200: oklch(0.86 0.06 260);
  --blue-300: oklch(0.78 0.10 260);
  --blue-400: oklch(0.68 0.15 260);
  --blue-500: oklch(0.56 0.18 260);
  --blue-600: oklch(0.45 0.18 260);
  --blue-700: oklch(0.35 0.15 260);
  --blue-800: oklch(0.27 0.12 260);
  --blue-900: oklch(0.20 0.08 260);
  --blue-950: oklch(0.14 0.04 260);
}
```

**Chroma curve for natural palettes:**
- 50: C=0.01 (near gray)
- Peak C at 500–600 (the most "colorful")
- 950: C=0.02–0.05 (near gray again)

### Semantic tokens from primitives

```css
:root {
  /* Background */
  --bg-primary:     oklch(0.99 0 0);
  --bg-secondary:   oklch(0.96 0.02 260);
  --bg-muted:       oklch(0.94 0.01 260);

  /* Foreground */
  --fg-primary:     oklch(0.15 0 0);
  --fg-muted:       oklch(0.45 0.01 260);

  /* Brand */
  --color-primary:  oklch(0.56 0.18 260);
  --color-accent:   oklch(0.62 0.22 180);

  /* Borders */
  --border-default: oklch(0.88 0.01 260);
  --border-muted:   oklch(0.92 0.01 260);
}
```

---

## 5. Contrast (APCA / WCAG 3)

OKLCH makes contrast calculation perceptually accurate. Use the lightness difference (`ΔL`) for quick estimates.

```css
/* Quick contrast heuristic in OKLCH: */
/* WCAG 2.1 AA (4.5:1) ≈ |L₁ - L₂| ≥ 0.35 */
/* WCAG 2.1 AA Large (3:1) ≈ |L₁ - L₂| ≥ 0.25 */
/* WCAG 2.1 AAA (7:1) ≈ |L₁ - L₂| ≥ 0.50 */

/* Example: white text on blue button */
/* White: L=1, Blue-500: L=0.56, ΔL=0.44 → ≥ 0.35 ✓ AA pass */
button {
  background: oklch(0.56 0.18 260); /* Blue-500 */
  color: oklch(1 0 0);               /* White */
}

/* Example: gray text on white background — FAIL */
/* Gray-400: L=0.63, White: L=1, ΔL=0.37 → barely passes AA */
.text-muted {
  color: oklch(0.63 0.01 260);      /* Gray-400 */
}

/* Better: */
.text-muted {
  color: oklch(0.45 0.01 260);      /* Gray-600 — ΔL=0.55 ✓ */
}
```

**Contrast check recipe:**

```ts
function contrastRatio(L1: number, L2: number): number {
  // OKLCH-based APCA-like contrast
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  const contrast = (lighter + 0.1) / (darker + 0.1);
  return contrast;
}

// Use with culori for precise WCAG 3 APCA:
import { contrastAPCA } from 'culori';

const ratio = contrastAPCA('oklch(0.15 0 0)', 'oklch(0.97 0 0)');
// APCA values: 0-100+, 45+ = preferred for body text
```

---

## 6. Gamut Mapping

OKLCH colors can fall outside the sRGB gamut. Browsers automatically clip them, but you can control the mapping:

```css
/* This color is outside sRGB — vivid saturated blue-purple */
.vibrant-element {
  color: oklch(0.5 0.37 290);
  /* Browser clips to nearest sRGB color automatically */
  /* Result will be approximately #8855ff */
}
```

**Gamut mapping strategies:**

```ts
import { toGamut, clampChroma, oklch } from 'culori';

const outOfGamut = oklch('oklch(0.5 0.37 290)');

// Strategy 1: Clip chroma until color fits sRGB (preserves hue + lightness)
const strategy1 = toGamut('srgb', 'oklch', 'clip')(outOfGamut);

// Strategy 2: Gamut map with CSS-compatible algorithm
const strategy2 = toGamut('srgb', 'oklch')(outOfGamut);

// Strategy 3: Manual chroma reduction
const manual = { ...outOfGamut, c: 0.25 }; // Reduce chroma until in gamut
```

**Detection:**

```css
/* Use @supports to detect OKLCH support and provide fallback */
.hero {
  background: #6b5ae8;                     /* sRGB fallback */
  background: oklch(0.5 0.3 280);          /* OKLCH — wider gamut */
}

/* Also detect display gamut */
@media (color-gamut: p3) {
  .hero {
    background: oklch(0.5 0.3 280);
  }
}
```

---

## 7. Tailwind v4 Migration

### Tailwind v4 `@theme` with OKLCH

```css
/* app.css — Tailwind v4 theme with OKLCH */
@import "tailwindcss";

@theme {
  --color-primary-50:  oklch(0.97 0.01 260);
  --color-primary-100: oklch(0.93 0.03 260);
  --color-primary-200: oklch(0.86 0.06 260);
  --color-primary-300: oklch(0.78 0.10 260);
  --color-primary-400: oklch(0.68 0.15 260);
  --color-primary-500: oklch(0.56 0.18 260);
  --color-primary-600: oklch(0.45 0.18 260);
  --color-primary-700: oklch(0.35 0.15 260);
  --color-primary-800: oklch(0.27 0.12 260);
  --color-primary-900: oklch(0.20 0.08 260);
  --color-primary-950: oklch(0.14 0.04 260);

  --color-surface:     oklch(0.99 0 0);
  --color-surface-alt: oklch(0.96 0.02 260);
  --color-border:      oklch(0.88 0.01 260);
  --color-muted:       oklch(0.45 0.01 260);
}
```

### Dark mode with OKLCH

OKLCH makes dark mode trivial — just adjust L (lightness) while keeping H and C the same:

```css
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Light — high L for surfaces */
  --color-surface:     oklch(0.99 0 0);
  --color-surface-alt: oklch(0.96 0.02 260);

  /* Dark — low L for surfaces */
  --color-surface-dark:     oklch(0.12 0 0);
  --color-surface-alt-dark: oklch(0.15 0.02 260);
}

/* Or use CSS variables with media query: */
:root {
  --bg: oklch(0.99 0 0);
  --text: oklch(0.15 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(0.12 0 0);
    --text: oklch(0.88 0 0);
  }
}

/* The brand color stays the same — only background/text flip */
/* primary-500 remains oklch(0.56 0.18 260) in both modes */
```

### Tinted neutrals

Give your neutral tones a subtle brand hue by adding very low chroma:

```css
/* BEFORE — true neutral grays (bland) */
--gray-100: oklch(0.96 0 0);
--gray-500: oklch(0.55 0 0);

/* AFTER — tinted with brand hue (sophisticated) */
/* C=0.01 is imperceptible as "color" but reads as a richer neutral */
--gray-100: oklch(0.96 0.01 260);  /* Barely blue-tinted */
--gray-500: oklch(0.55 0.02 260);  /* Subtle warmth from brand hue */
```

### Migration from HEX/RGB

```css
/* BEFORE — Tailwind v3, HEX colors */
:root {
  --color-primary: #3B82F6;
  --color-surface: #FFFFFF;
  --color-muted: #6B7280;
}

/* AFTER — Tailwind v4, OKLCH */
:root {
  --color-primary: oklch(0.56 0.18 260);
  --color-surface: oklch(1 0 0);
  --color-muted: oklch(0.45 0.01 260);
}
```

**Migration checklist:**
1. Convert all HEX colors to OKLCH using a converter tool
2. Update Tailwind v4 `@theme` with OKLCH values
3. Keep HEX fallbacks for older browsers if needed
4. Adjust chroma values — high-chroma HEX colors may need C reduction
5. Verify contrast ratios — OKLCH reveals contrast issues that HEX masked
6. Test dark mode — OKLCH's uniform L makes this trivial

---

## Don't

| Pattern | Replacement | Because |
|---------|-------------|---------|
| C too high for text | Keep text C ≤ 0.15; reserve C≥0.2 for display/brand use | High chroma text is fatiguing at small sizes |
| Not checking gamut | Reduce C or use `toGamut()` for predictable clipping | Colors outside sRGB clip unpredictably |
| Mixing color spaces in palette | Use one color space for the entire palette | Mixed spaces make comparison impossible |
| C=0 for all grays | Use C=0.01 with brand hue for richer neutrals | True neutral grays can look sterile |
| No fallback for OKLCH | Use `color: #hex; color: oklch(...)` pattern | OKLCH unsupported in older browsers |

---

## Verification

- [ ] All colors use OKLCH syntax (`oklch(L C H / alpha)`)
- [ ] Grays and neutrals use C=0 to C=0.02 range
- [ ] Accent colors use C=0.15 to C=0.25 range
- [ ] Text colors do not exceed C=0.15 (readability)
- [ ] Contrast ratio checked: |ΔL| ≥ 0.35 for body text, ≥ 0.25 for large text
- [ ] Gamut checked: no colors outside sRGB without fallback
- [ ] HEX/RGB fallback provided for colors where gamut mapping matters
- [ ] Palette follows natural chroma curve (peak at 500/600, low at 50/950)
- [ ] Neutrals are tinted with brand hue (C ≥ 0.01) for richness
- [ ] Tailwind v4 `@theme` uses OKLCH values
- [ ] Dark mode flips L values while keeping H and C consistent
