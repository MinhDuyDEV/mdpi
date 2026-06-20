---
name: shadcn-ui
description: Use when adding, configuring, or managing shadcn/ui components. Covers CLI v4, visual styles (Vega/Nova/Maia/Lyra/Mira), preset system, GitHub Registries, shadcn/skills AI prompt files, MCP registry, and component management. NOT a replacement for component API docs — see frontend-design's shadcn references for that.
---

# shadcn/ui

## When to Use

- Adding shadcn/ui components to a project (`npx shadcn add`)
- Initializing shadcn/ui in a new project (`npx shadcn init` / `npx shadcn create`)
- Choosing a visual style (Vega, Nova, Maia, Lyra, Mira)
- Configuring via the preset system or `components.json`
- Using shadcn/skills for AI-driven component generation
- Inspecting installed components (`shadcn info --json`)
- Previewing component changes before applying (`--dry-run`, `--diff`, `--view`)
- Setting up custom component registries

## When NOT to Use

- When you need component API documentation (use `frontend-design` → `./references/shadcn/*.md`)
- When theming with CSS variables (use `frontend-design` → `./references/shadcn/theming.md`)
- When building plain UI without shadcn/ui components
- When the task is about v0 generation (use the `v0` skill instead)

## Relationship to `frontend-design` References

This skill covers **shadcn/ui tooling and workflow** — CLI commands, presets, registries, skills, and configuration management.

For **component API documentation** (Button props, Card subcomponents, Dialog patterns, Select usage), see:
- `frontend-design` → `./references/shadcn/setup.md` — Installation, visual styles, component list
- `frontend-design` → `./references/shadcn/core-components.md` — Button, Card, Dialog, Select, Tabs, Toast, Command, Sidebar, Table
- `frontend-design` → `./references/shadcn/form-components.md` — Form, Field, InputGroup
- `frontend-design` → `./references/shadcn/theming.md` — CSS variables, OKLCH, dark mode
- `frontend-design` → `./references/shadcn/accessibility.md` — ARIA, keyboard, screen reader

## CLI v4 (current: shadcn@4.11.0)

### Starting Projects

```bash
# Interactive project creation (recommended)
npx shadcn create

# This walks through:
# - Framework (Next.js, Vite, Remix, etc.)
# - Visual style (Vega, Nova, Maia, Lyra, Mira)
# - Component library backend (Radix UI or Base UI)
# - Icon library (including Phosphor)
# - TypeScript, Tailwind CSS, CSS variables setup
```

### Adding Components to Existing Projects

```bash
# Initialize shadcn in existing project
npx shadcn@latest init

# Add specific components
npx shadcn@latest add button card dialog

# Add all components
npx shadcn@latest add --all

# Add from GitHub Registry
npx shadcn@latest add <username>/<repo>/<item>
```

### Safety & Inspection

```bash
# Preview what will change (no writes)
npx shadcn@latest add button dialog --dry-run

# Show exact diff for a component
npx shadcn@latest add button --diff

# Open component in browser for review
npx shadcn@latest add button --view

# Inspect installed components as JSON
npx shadcn info --json

# Check version
npx shadcn --version
```

### `shadcn info --json`

Outputs structured data about installed components, useful for CI and tooling:

```json
{
  "version": "4.11.0",
  "components": [
    {
      "name": "button",
      "installed": true,
      "version": "4.11.0",
      "path": "components/ui/button.tsx",
      "dependencies": ["@radix-ui/react-slot"],
      "registrySource": "default"
    }
  ],
  "style": "vega",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils"
  }
}
```

## Visual Styles

| Style | Vibe | Use Case |
|-------|------|----------|
| **Vega** | Classic shadcn — balanced, familiar | Default. Good for most projects. |
| **Nova** | Compact, reduced padding | Data-heavy dashboards, admin panels |
| **Maia** | Soft, rounded, generous padding | Consumer apps, marketing sites |
| **Lyra** | Boxy, sharp corners, monospace fonts | Developer tools, technical interfaces |
| **Mira** | Dense, efficient, minimal chrome | Internal tools, complex workflows |

Set during `npx shadcn create` or override per-component with `--style <name>`.

## Preset System

Presets pack your entire design system config into a reproducible short code:

```bash
# Export your design system as a preset code
npx shadcn preset export

# Init a new project with a preset
npx shadcn init --preset a1Dg5eFl
```

A preset captures: visual style (Vega/Nova/Maia/Lyra/Mira), component library (Radix/Base UI), colors, theme, icons, fonts, radius, spacing — everything needed to reproduce the exact design system.

## GitHub Registries (June 2026)

Any public GitHub repo with a `registry.json` can be a component registry.

```bash
# Pull from a GitHub registry
npx shadcn@latest add <username>/<repo>/<item>

# Example
npx shadcn@latest add shadcn-ui/ui/data-table
```

No build step needed — CLI reads `registry.json` directly. Distribute: components, hooks, utilities, design tokens, feature kits, project conventions, CI workflows, templates.

### Registry Structure

```json
// registry.json (in any GitHub repo root)
{
  "name": "my-components",
  "items": [
    {
      "name": "data-table",
      "type": "registry:component",
      "files": [{ "path": "components/data-table.tsx" }],
      "dependencies": ["@tanstack/react-table"]
    }
  ]
}
```

## MCP Registry Server

Connect AI editors to your custom shadcn/ui registry:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn@canary", "registry:mcp"],
      "env": {
        "REGISTRY_URL": "https://your-registry.vercel.app/r/registry.json"
      }
    }
  }
}
```

This allows AI agents (Cursor, Windsurf, Claude Desktop) to query and pull components from your custom design system registry.

## shadcn/skills — AI Agent Prompt File

A machine-readable skills file that gives AI coding agents accurate, project-aware context about shadcn/ui.

### Setup

```bash
npx skills add shadcn/ui
```

Creates `.shadcn/skills.md` — automatically injected into AI agent context.

### What It Provides

- **Project context** — framework, aliases, installed components (via `shadcn info --json`)
- **CLI commands** — all flags, smart merge, presets, templates
- **Theming** — CSS vars, OKLCH, dark mode, Tailwind v3/v4
- **Registry authoring** — `registry.json` format, item types, dependencies
- **Pattern enforcement** — `FieldGroup` for forms, `ToggleGroup` for options, semantic colors

### Measured Impact

| Metric | Before Skills | After Skills |
|--------|--------------|-------------|
| API errors | 34% | 3% |
| Correct variants | 61% | 98% |
| First-try success | 45% | 89% |

### Critical Workflows

```bash
# Install
npx skills add shadcn/ui

# Regenerate after adding components (CRITICAL!)
npx shadcn skills generate

# Update monthly to stay current
npx shadcn skills update
```

### Pitfalls

| Mistake | Fix |
|---------|-----|
| Not regenerating after adding components | Add `shadcn skills generate` to post-install script |
| Skills getting cut off from context limit | Reference file path; don't paste contents |
| Using outdated skills (3+ months old) | Run `shadcn skills update` monthly |
| Ignoring the preset system | Use presets; customize through Tailwind config, not per-component CSS |

## Components (2026)

### New in 2026

| Component | Description |
|-----------|-------------|
| **Field** | Form field wrapper with label, description, error message |
| **InputGroup** | Grouped inputs with addons (prefix/suffix) |
| **Spinner** | Loading spinner with size variants |
| **Kbd** | Keyboard shortcut display |
| **ButtonGroup** | Grouped button toolbar |
| **Item** | Generic list item with icon, text, and actions |
| **Empty** | Empty state with illustration, text, and action |

### Component Installation

```bash
npx shadcn@latest add field input-group spinner kbd button-group item empty
```

### Quick Reference — New Components

#### Field

```tsx
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field"

<Field>
  <FieldLabel>Email</FieldLabel>
  <Input placeholder="you@example.com" />
  <FieldDescription>We'll never share your email.</FieldDescription>
  <FieldError>{errors.email}</FieldError>
</Field>
```

#### InputGroup

```tsx
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"

<InputGroup>
  <InputGroupAddon>https://</InputGroupAddon>
  <Input placeholder="example.com" />
  <InputGroupAddon>.com</InputGroupAddon>
</InputGroup>
```

#### Spinner

```tsx
import { Spinner } from "@/components/ui/spinner"

<Spinner />
<Spinner size="sm" />
<Spinner className="text-primary" />
```

#### Kbd

```tsx
import { Kbd } from "@/components/ui/kbd"

<Kbd>⌘K</Kbd>
<Kbd variant="outline">Ctrl + S</Kbd>
```

#### ButtonGroup

```tsx
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"

<ButtonGroup>
  <Button variant="outline">Day</Button>
  <Button variant="outline">Week</Button>
  <Button variant="outline">Month</Button>
</ButtonGroup>
```

#### Item

```tsx
import { Item, ItemIcon, ItemText, ItemAction } from "@/components/ui/item"

<Item>
  <ItemIcon><SettingsIcon /></ItemIcon>
  <ItemText primary="Settings" secondary="Manage preferences" />
  <ItemAction><ChevronRight /></ItemAction>
</Item>
```

#### Empty

```tsx
import { Empty } from "@/components/ui/empty"

<Empty
  title="No results"
  description="Try adjusting your filters."
  action={<Button>Clear filters</Button>}
/>
```

## Configuration

### `components.json`

The central configuration file:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide",
  "registries": [
    {
      "name": "team",
      "url": "gh:my-org/shadcn-registry"
    }
  ]
}
```

## Anti-Patterns

| Anti-Pattern | Why | Correct |
|---|---|---|
| Manually editing component primitives | Upstream updates become impossible to merge | Extend with wrapper components instead |
| Importing from shadcn as a package | shadcn/ui is copy-paste, not an npm package | Components live in your `components/ui/` directory |
| Adding `--all` without reviewing | Installs 50+ components, most unused | Only install what you need |
| Using hard-coded Tailwind values | Breaks theming and dark mode | Reference CSS variable tokens |
| Overriding `@theme` without preserving shadcn tokens | Breaks component styling | Extend `@theme`, don't replace it |
| Editing CSS variables inline | Hard to maintain theme switching | Define variables once, reference by semantic name |

## Verification

After working with shadcn/ui:

- [ ] `components.json` exists and is configured correctly
- [ ] Only needed components are installed (no `--all` waste)
- [ ] CSS variables are used for colors (no hard-coded hex/rgb in components)
- [ ] Dark mode works via CSS variable overrides
- [ ] Components compile with TypeScript strict mode
- [ ] `npx shadcn info --json` shows expected installed components
- [ ] Preset saved if project has custom styling
- [ ] `shadcn/skills/` directory exists if project has custom conventions
- [ ] Aliases match project structure (`@/components/ui/`, `@/lib/utils`)
- [ ] No manually edited primitives that would conflict with updates
