# shadcn/ui Setup

CLI v4.x (current: shadcn@4.11.0) — Copy-paste components, Radix UI / Base UI + Tailwind v4.

## Create a New Project

```bash
npx shadcn create
```

Interactive setup:
- **Visual style**: Vega, Nova, Maia, Lyra, Mira
- **Component library**: Radix UI or Base UI
- **Icon library** (Lucide, Phosphor, etc.)
- **Next.js 16**, Vite, Laravel, React Router, Astro, TanStack Start support
- **Template scaffolding** via `npx shadcn init --template`

## Existing Project

```bash
npx shadcn@latest init --preset <code>
npx shadcn@latest add button card dialog
npx shadcn@latest add --all
npx shadcn@latest add <username>/<repo>/<item>  # GitHub Registry
```

Components install to `components/ui/`.

## Key CLI v4 Commands

```bash
# Inspection
npx shadcn info                     # Full project config (for agent context)
npx shadcn info --json              # JSON output for programmatic use
npx shadcn docs <component>         # Docs, code, examples from CLI

# Preview changes before writing
npx shadcn add button --dry-run     # Show what will be installed
npx shadcn add button --diff        # Show diff against current
npx shadcn add button --view        # Open component in browser

# Project setup flags
npx shadcn init --preset a1Dg5eFl    # Pack entire design system into short code
npx shadcn init --template           # Scaffold project templates
npx shadcn init --monorepo           # Monorepo setup
npx shadcn init --base radix         # Choose primitives (radix | base)

# Skills (AI Agent)
npx skills add shadcn/ui             # Install agent prompt file
npx shadcn skills generate           # Regenerate after adding components
npx shadcn skills update             # Update monthly
```

## Visual Styles

| Style | Characteristics |
|-------|----------------|
| **Vega** | Classic shadcn look — balanced, versatile |
| **Nova** | Reduced padding, compact, space-efficient |
| **Maia** | Soft, rounded corners, generous spacing |
| **Lyra** | Boxy, sharp corners, monospace fonts |
| **Mira** | Compact, dense, data-heavy interfaces |

Styles rewrite component code, not just CSS — fonts, spacing, structure, primitives all adapt.

## Presets

Presets pack the entire design system into a reproducible short code:

```bash
# Export your preset
npx shadcn preset export

# Init a project with a preset
npx shadcn init --preset a1Dg5eFl
```

A preset includes: colors, theme, icons, fonts, radius, spacing — everything in one code.

## Component Libraries

- **Radix UI** (default): Full accessibility, React-only, battle-tested
- **Base UI**: MUI unstyled components, headless

Select during `npx shadcn create` or with `--base` flag. CLI auto-detects your library when pulling components.

## GitHub Registries (June 2026)

Any public GitHub repo with a `registry.json` can be a component registry:

```bash
npx shadcn@latest add <username>/<repo>/<item>
```

Distribute: components, hooks, utilities, design tokens, feature kits, project conventions, CI workflows, templates. No build step — CLI reads `registry.json` directly.

```json
// registry.json (in any GitHub repo)
{
  "name": "my-components",
  "items": [
    {
      "name": "data-table",
      "type": "registry:component",
      "files": [{ "path": "components/data-table.tsx" }]
    }
  ]
}
```

## shadcn/skills — AI Agent Bridge

```bash
npx skills add shadcn/ui
```

Creates `.shadcn/skills.md` — a machine-readable file that gives AI coding agents project-aware context:

- **Project context** — framework, aliases, installed components, icon library, base library (via `shadcn info --json`)
- **CLI command reference** — all flags, smart merge, presets, templates
- **Theming guidance** — CSS vars, OKLCH, dark mode, Tailwind v3/v4
- **Registry authoring** — `registry.json` format
- **Pattern enforcement** — FieldGroup for forms, ToggleGroup for options, semantic colors

**Measured impact**: API errors 34% → 3%, correct variants 61% → 98%, first-try success 45% → 89%.

**Critical workflows**:
- Re-generate after adding components: `npx shadcn skills generate`
- Update monthly: `npx shadcn skills update`
- Reference file path (don't paste into context — 4K cutoff)

## MCP Server Support

Connect AI editors to your registry:

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

Also: OpenCode MCP (v3.6.3), Codex MCP (v3.4.0).

## Registry System

- Registry Directory: https://ui.shadcn.com/docs/directory
- Custom registries via `components.json`
- Namespaced components
- `registry:base` — distribute entire design systems
- `registry:font` — distribute font packages

## Component List

**Layout**: Card, Sidebar, Separator, Resizable, Scroll Area

**Forms**: Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Form, Field, Input Group, Label

**Feedback**: Alert, Alert Dialog, Dialog, Drawer, Sheet, Toast (Sonner), Progress, Spinner, Skeleton

**Navigation**: Tabs, Accordion, Breadcrumb, Navigation Menu, Menubar, Pagination, Command

**Data Display**: Table, Avatar, Badge, Hover Card, Tooltip, Calendar, Carousel, Chart

**Overlay**: Dropdown Menu, Context Menu, Popover, Collapsible

**2026 New**: Spinner, Kbd, KbdGroup, Button Group, Input Group, Field, Item, Empty, Input OTP

**Other**: Toggle, Toggle Group
