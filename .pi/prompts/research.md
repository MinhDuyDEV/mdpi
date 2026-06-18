---
description: Research a topic before implementation
argument-hint: "<topic> [--quick|--thorough]"
---

# Research: $ARGUMENTS

Gather information before implementation. Find answers, document findings, stop when done.

> Research can happen at any phase when you need external information or codebase understanding.

## Complexity Detection

Before starting, analyze the research topic complexity:

**Simple research** (execute directly):
- Single factual question
- One specific API or library
- Narrow scope with clear boundaries

**Complex research** (invoke workflow):
- Multi-angle topic requiring cross-checking
- Broad scope with multiple perspectives
- Requires verification from multiple sources

### Decision Logic

1. **Parse the topic** from $ARGUMENTS
2. **Assess complexity:**
   - Contains "best practices", "compare", "approaches", "strategies" → Complex
   - Contains "how does", "what is", "explain" → Simple
   - Topic spans multiple domains or technologies → Complex
3. **Route accordingly:**
   - Simple → Execute directly (see "Direct Execution" below)
   - Complex → Invoke `deep-research` workflow (see `.pi/workflows/deep-research.md`)

## Workflow Execution (Complex Research)

If complexity is detected as complex, use the `subagent` tool:

```typescript
// Phase 1: Spawn multiple scout agents (dynamic count based on angles)
subagent({
  agent: "scout",
  task: "Search for different perspectives on: ${ARGUMENTS}. Cover opposing viewpoints, authoritative sources, and recent developments. Return findings with URLs and confidence levels."
});

// Then cross-check findings with review agents, synthesize
```

**Announce:** "This is complex research requiring multi-angle analysis. Invoking deep-research workflow."

## Direct Execution (Simple Research)

### Parse Arguments

| Argument         | Default  | Description                         |
| ---------------- | -------- | ----------------------------------- |
| Topic            | required | What to research                    |
| `--quick`        | false    | ~10 tool calls, single question     |
| `--thorough`     | false    | ~100+ calls, comprehensive analysis |

Default depth: ~30 tool calls for moderate exploration.

### Before You Research

- **Be certain**: Only research what you need for implementation
- **Don't over-research**: Stop when you have enough to proceed
- **Use source priority**: Codebase → Docs → Source → GitHub → Web
- **Verify confidence**: Medium+ confidence required before stopping

### Available Tools

| Tool         | Use When                        |
| ------------ | ------------------------------- |
| `explore`    | Codebase patterns, structure    |
| `scout`      | External docs, best practices   |
| `context7`   | Official API references         |
| `codesearch` | Real-world usage examples       |
| `grepsearch` | GitHub code search              |

### Source Priority

1. **Codebase patterns** — delegate to `explore` agent
2. **Official docs** — `context7` for API references
3. **GitHub examples** — `codesearch` / `grepsearch` for real-world patterns
4. **Web search** — only if tiers 1-3 don't answer

### Confidence Levels

- **High**: Multiple authoritative sources agree, verified in codebase
- **Medium**: Single good source, plausible but unverified
- **Low**: Conflicting info, speculation — discard without corroboration

### Stop When

- All questions answered with medium+ confidence
- Tool budget exhausted for depth level
- Last 5 tool calls yielded no new insights

## Output

1. **Execution mode:** Direct or Workflow
2. Depth level and tool call count (if direct)
3. Questions with answer status and confidence
4. Key insights (bullet points)
5. Open items remaining
6. Next step suggestion

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create + start | `/create`    |
| Plan details   | `/plan`      |
| Pick up work   | `/ship`      |
| Audit codebase | `/audit`     |
