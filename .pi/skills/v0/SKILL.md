---
name: v0
description: Use when generating UI with v0 (Vercel's AI-powered generator). Covers prompt engineering, CLI/SDK/MCP integration, shadcn/ui-aware patterns. MUST load before any v0 workflow.
---

# v0 — Vercel AI UI Generator

## Overview

v0 (v0.app) is Vercel's AI-powered UI and application generator. It generates React components using **shadcn/ui** primitives + **Tailwind CSS**, targeting **Next.js App Router** by default.

In February 2026, v0 evolved to **v2.0** — a full production development platform. Beyond UI generation, it now supports: importing GitHub repos into sandboxes, git branching/PRs/merging from the browser, database integrations (Snowflake, AWS DBs), enterprise SSO, and agent-based workflows.

v0 generates "code that looks like a senior frontend engineer wrote it."

## When to Use

- Generating shadcn/ui components or pages with AI
- Writing effective v0 prompts using the 5-block brief
- Adding v0-generated code to projects via CLI or SDK
- Integrating v0 with IDEs via MCP (`https://mcp.v0.dev`)
- Building programmatic UI generation workflows with the v0 SDK
- Designing brand-aware v0 output via custom shadcn/ui registries

## When NOT to Use

- Plain UI without AI generation (use `frontend-design` skill)
- Backend-only or non-UI tasks
- When you already have the component and only need manual edits

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| `shadcn-ui` | Upstream — ensures shadcn/ui is configured correctly before v0 generation |
| `frontend-design` | Downstream — use for manual refinement of v0 output, design system application |
| `design-taste-frontend` | Aesthetic baseline applied to v0 generations |

**Pipeline**: `shadcn-ui` → `v0` → `frontend-design`

## Prompt Engineering: The 5-Block Component Brief

Every v0 prompt should include these 5 blocks. Missing blocks = v0 guesses = expensive iterations.

| # | Block | Question | Example |
|---|-------|----------|---------|
| 1 | **What it is** | What component? | "A subscription pricing card for a SaaS dashboard" |
| 2 | **Behavior** | How does it work? | "Three tiers (Free/Pro/Enterprise), monthly/yearly toggle switches pricing, clicking a tier highlights it" |
| 3 | **States** | What states? | "Loading spinner while pricing loads, error state if fetch fails, empty state if no tiers returned" |
| 4 | **Props / Data Shape** | What's the contract? | "`tiers: Tier[]`, `billing: 'monthly' | 'yearly'`, `onSelect: (tier) => void`" |
| 5 | **Visual Intent** | What should it look like? | "shadcn Card layout, data-first, accent color on recommended tier, generous whitespace, no shadows" |

### Prompt Patterns

| Pattern | Example | Why |
|---------|---------|-----|
| **Constraint anchoring** | "Use only shadcn/ui primitives and Tailwind classes" | Prevents unknown imports |
| **Negative instruction** | "Do not use inline styles or external CSS files" | Eliminates anti-patterns |
| **Type contract** | "Define TypeScript interface for all props first" | Forces explicit API surface |
| **Responsive breakpoints** | "Mobile-first: stack on sm, 2-col on md, 3-col on lg" | Correct Tailwind prefixes |
| **State specification** | "Lift filter state to the parent via onFilterChange" | Proper unidirectional data flow |
| **System context** | "You are generating for Next.js App Router with shadcn/ui Vega style..." | Foundation for consistency |

### Anti-Patterns in Prompts

| Anti-Pattern | Fix |
|-------------|-----|
| One-word prompt ("Pricing page") | Write a 5-block brief |
| Generating full pages | Generate component by component, compose pages manually |
| Hard-coded data | Generate data-less components, wire real data separately |
| "Make it look like Stripe" | Describe visual intent concretely, not by brand reference |
| 10+ refinements in one follow-up | 1-2 changes per loop; rewrite brief from scratch if complex |
| UI-first architecture | Design API/schema first, then generate UI that matches it |
| Passing API secrets through prompts | Never send secrets through v0 chat |

## Integration Paths

### Path A — shadcn CLI Pull (Recommended)

1. Generate UI on [v0.app](https://v0.app)
2. Click **"Add to Codebase"** → copy the command:
   ```bash
   npx shadcn@latest add "https://v0.dev/chat/b/<project_id>?token=<token>"
   ```
3. Run in your project root — pulls component + installs deps

### Path B — v0 CLI

```bash
# One-time setup in existing Next.js project
npx v0@latest init

# Add specific generated component by ID
npx v0@latest add <id>
```

The `v0` CLI (v2.2.5) installs deps: `@radix-ui/react-icons`, `clsx`, `lucide-react`.

### Path C — SDK (Programmatic)

```bash
npm install v0-sdk
```

```typescript
import { v0 } from 'v0-sdk'

const client = v0.createClient({ apiKey: process.env.V0_API_KEY })

// Create a chat
const chat = await client.chats.create({
  message: "Build a pricing card with three tiers and monthly/yearly toggle"
})

// Stream the response
for await (const chunk of chat.stream()) {
  console.log(chunk)
}

// Initialize with existing files
await client.chats.init({
  files: [{ path: 'components/ui/button.tsx', content: '...' }]
})
```

### v0 SDK Ecosystem

| Package | Version | Purpose |
|---------|---------|---------|
| `v0-sdk` | 0.16.4 | Core TypeScript SDK — chats, projects, deployments |
| `@v0-sdk/react` | 0.5.0 | Headless React components for v0 content |
| `@v0-sdk/ai-tools` | 0.3.8 | AI SDK tools for agents (~20 tools) |
| `create-v0-sdk-app` | 0.2.1 | Scaffold SDK-powered apps |

### Path D — MCP Server

Connect IDEs to v0 via MCP:

```json
{
  "mcpServers": {
    "v0": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.v0.dev", "--header", "Authorization: Bearer ${V0_API_KEY}"]
    }
  }
}
```

Supports: Cursor, Claude Desktop, VS Code, Windsurf, any MCP-compatible IDE.

## Platform API (Public Beta)

REST API at `https://api.v0.dev/v1`. Covers: chats, projects, deployments, users, webhooks, MCP servers.

```typescript
// Direct REST
const res = await fetch('https://api.v0.dev/v1/chats', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.V0_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "Build a login form with email/password fields"
  })
})
```

## Integration with shadcn/ui

v0 generates code using shadcn/ui by default. Key integration points:

- **Before generating**: Run `npx shadcn init` in your project
- **Custom design systems**: Publish a shadcn/ui Registry with your design tokens → v0 generates brand-consistent output
- **Registry MCP**: Connect your registry to v0 for design-aware generation
- **`components.json`**: v0 respects your project's aliases and style config
- **Check deps**: After pulling v0 code, verify all shadcn components are installed

### Design System Integration

```json
// components.json — exposed to v0 for brand-aware generation
{
  "style": "vega",
  "tsx": true,
  "tailwind": { "cssVariables": true },
  "aliases": { "components": "@/components", "ui": "@/components/ui" }
}
```

## v0 2.0 Platform (Feb 2026)

Key capabilities beyond UI generation:

- **Import any GitHub repo** into sandbox with auto-pulled Vercel env vars
- **Git panel** — branching, PRs, merging from the browser
- **DB integrations** — Snowflake, AWS databases, Neon + Drizzle scaffolding
- **Enterprise** — deployment protection, access controls, SSO, signed Git commits
- **Agents** — plan and build end-to-end agentic workflows
- **Design Mode** — floating toolbar, layers viewer, measure overlay
- **Cmd+K** — command palette navigation
- **Shopify integration** — storefront building
- **Auto merge conflict resolution**

## Best Patterns

### Component-First Decomposition

Instead of: "Build a dashboard page"

Do:
1. Generate `StatCard` → pull → verify
2. Generate `DataTable` → pull → verify
3. Generate `ChartWidget` → pull → verify
4. Compose in the page manually

### System Prompt Template

When using the SDK or Platform API, set a system prompt:

```
You are a shadcn/ui component generator.
Framework: Next.js 15+ App Router.
Language: TypeScript strict mode.
Styling: Tailwind CSS v4 with CSS variables.
Imports: use @/ path alias.
Data: accept via props, never hard-code.
States: loading, empty, error, normal.
Accessibility: ARIA labels, keyboard nav, focus management.
Dark mode: CSS variable overrides.
```

### v0 → Production Workflow

1. **Spec** → Define data model, user flow, design tokens
2. **Generate** → v0 with 5-block brief for each component
3. **Pull** → Add to codebase via CLI
4. **Review** → Check TypeScript types, accessibility, theme compliance
5. **Wire** → Connect real data sources, auth, API routes
6. **Harden** → Loading states, error boundaries, edge cases
7. **Deploy** → Vercel preview + production

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Treating v0 output as production-ready | v0 handles presentation only — you need auth, data, logic |
| Letting v0 define your data model | Your domain expertise defines the model; v0 adapts |
| Client-only generation | Plan SSR boundaries; v0 generates client components by default |
| Not checking shadcn deps before pulling | `npx shadcn info --json` to verify installed components |
| Generating without design tokens | Set system prompt with CSS variable references |
| Skipping review | Every v0 component needs human review for correctness |

## Verification

- [ ] Generated components use project design tokens (CSS variables, not hard-coded hex)
- [ ] All components accept typed props (no hard-coded data)
- [ ] Loading, empty, error states handled
- [ ] Required shadcn/ui primitives installed (`npx shadcn info --json`)
- [ ] TypeScript compiles without errors
- [ ] Keyboard navigation and ARIA labels verified
- [ ] Light and dark mode both render correctly
- [ ] Components refactored for reusability (not page-specific)
