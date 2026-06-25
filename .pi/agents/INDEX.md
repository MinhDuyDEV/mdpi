---
purpose: Index of subagent personas with tools, model, and routing
---

# Agents Index

6 subagent personas. Each is a focused, single-purpose agent invoked via the `subagent` (or `Agent`) tool with `subagent_type`. The main session agent (the one you chat with) is the primary orchestrator and delegates to these subagents; users can also invoke any directly.

## Routing Table

| Agent | Model | Tools | Purpose | Invoked for |
|-------|-------|-------|---------|-------------|
| `explore` | haiku-4-5 | read-only + semantic_* | Read-only codebase cartographer | "find/locate/where is/trace usage" |
| `general` | sonnet-4-5 | full (no `subagent`) | Surgical implementer (1-3 files) | "implement/fix/add/modify" small tasks |
| `plan` | opus-4-1 | read + semantic_* + websearch/codesearch/context7 | Architecture & decomposition | "plan/design/architecture/how should I" |
| `review` | sonnet-4-5 | read-only + semantic_* | Code review, debugging, security audit | "review/check for bugs/audit/is this correct" |
| `scout` | haiku-4-5 | read + websearch/codesearch/context7/grepsearch/web_fetch | External research | "research/investigate/compare/what is/how does" |
| `vision` | sonnet-4-5 | read + bash + find + ls | Visual UI/UX & accessibility | "inspect UI/screenshot/visual/accessibility/design review" |

## Notation (canonical)

Reference agents in prompts/docs as `Agent: <type>` or `subagent({ agent: "<type>", prompt: "..." })`. Do **not** use the legacy `@<type>` notation.

## Tool tiers

- **Read-only** (no edit/write): `explore`, `review`, `vision` — safe for analysis, never mutate.
- **Web-capable**: `scout` (websearch/codesearch/context7/web_fetch), `plan` (websearch/codesearch/context7).
- **Full edit**: `general`.
- **Delegation**: the main session agent holds the `Agent`/`subagent` tool and dispatches these personas; subagents do not chain-spawn by default.

## How the primary agent routes (no command)

| User says | Routes to |
|-----------|-----------|
| "find X" / "where is X" | `explore` + semantic_* |
| "research X" / "best practice" | `scout` + pi-search |
| "review this code" | `review` |
| "implement X" (small, ≤3 files) | `general` |
| "implement X" (large/unclear) | `plan` first, then `general` per task |
| "design X" / "UI review" | `vision` |
| Multi-step / orchestration | Do it yourself (main agent) — orchestration is not delegated |

## Relationship to commands & workflows

- Commands (`/audit`, `/ship`, `/research`, `/gc`) invoke workflows via `run_workflow`, which dispatch these agents per phase.
- `/fix` uses `review` + `general` patterns (root-cause → fix).
- Workflows' `Agent: <type>` fields map 1:1 to the personas above.

## Related

- `prompts/INDEX.md` — 11 commands that invoke workflows using these agents
- `workflows/INDEX.md` — 6 DAG workflows whose phases dispatch these agents
- `skills/INDEX.md` — 67 skills loaded by these agents contextually