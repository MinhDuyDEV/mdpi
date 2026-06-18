---
description: Research a topic before implementation
argument-hint: "<topic> [--quick|--thorough] [--dry-run] [--help]"
---

# Research: $ARGUMENTS

Gather information before implementation. Find answers, document findings, stop when done.

> Research can happen at any phase when you need external information or codebase understanding.

## Parse Arguments

| Argument      | Default  | Description                         |
| ------------- | -------- | ----------------------------------- |
| `<topic>`     | required | What to research                    |
| `--quick`     | false    | ~10 tool calls, single question     |
| `--thorough`  | false    | ~100+ calls, comprehensive analysis |
| `--dry-run`   | false    | Report research plan without executing |
| `--help`      | false    | Show this usage                     |

Default depth: ~30 tool calls for moderate exploration.

## Guard Phase

Before researching:
- Check `.pi/artifacts/.active` — if active slug exists, write findings to `.pi/artifacts/$SLUG/research.md`
- If no active slug, report findings inline
- Assess complexity to choose Direct vs Workflow execution

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
3. **If ambiguous**, ask user: "Is this a quick look-up or deep investigation?"
4. **Route accordingly:**
   - Simple → Direct Execution (Phase 1-3)
   - Complex → Workflow Execution (read `.pi/workflows/deep-research.md`)

## Load Skills

| Skill | When | Why |
|-------|------|-----|
| `source-driven-development` | Always | Ground findings in official docs, source code, and cited references |
| `srcwalk` | Codebase research | Navigate codebase with repo maps, symbol search, callers/callees |
| `opensrc` | Researching dependencies | Inspect library source for internal behavior |
| `gemini-large-context` | Large codebase or multi-repo | Analyze beyond typical context limits |

## Direct Execution (Simple Research)

### Phase 1: Search

Follow source priority:
1. **Codebase patterns** — delegate via `subagent({ agent: "explore" })`. Never escalate to web if codebase has answer.
2. **Official docs** — `context7` for API references
3. **Real-world examples** — `codesearch` / `grepsearch`
4. **Web search** — only if tiers 1-3 don't answer

### Phase 2: Verify

Cross-check findings:
- Multiple authoritative sources agree → High confidence
- Single good source, plausible but unverified → Medium confidence
- Conflicting info, speculation → discard without corroboration

### Phase 3: Synthesize

If within active work, write findings to `.pi/artifacts/$SLUG/research.md`. Otherwise report inline.

## Workflow Execution (Complex Research)

**Announce:** "This is complex research requiring multi-angle analysis. Invoking deep-research workflow."

1. Read `.pi/workflows/deep-research.md`
2. Spawn multiple `scout` agents for different perspectives
3. Cross-check findings with `review` agents
4. Synthesize into report

## Stop Conditions

- All questions answered with medium+ confidence → stop research, proceed
- Tool budget exhausted for depth level → stop, report findings
- Last 5 tool calls yielded no new insights → stop, avoid diminishing returns
- Network/API repeatedly unavailable → stop, report partial results

## Failure Handling

| Scenario | Action |
|----------|--------|
| Subagent returns failure | Retry once with adjusted prompt, then escalate |
| Network/API error | Cache findings so far, retry with degraded mode |
| No results found | Report empty result set, suggest broader search terms |
| Tool budget exhausted | Report findings so far, note what remains unexplored |

## Output

1. **Execution mode:** Direct or Workflow
2. Depth level and tool call count (if direct)
3. Questions with answer status and confidence
4. Key insights (bullet points)
5. Artifact location: `.pi/artifacts/$SLUG/research.md` (if active work) or inline
6. Next step suggestion

## Related Commands

| Need           | Command      |
| -------------- | ------------ |
| Create spec    | `/create`    |
| Plan details   | `/plan`      |
| Ship feature   | `/ship`      |
| Audit codebase | `/audit`     |

## Related Skills

- `source-driven-development` — doc-backed research methodology (all phases)
- `srcwalk` — codebase symbol navigation and call tracing
- `opensrc` — library source inspection for dependency research
- `gemini-large-context` — large codebase analysis
