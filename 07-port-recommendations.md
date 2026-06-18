# 07 - Port Recommendations (Final Roadmap)

## Tổng quan

File này tổng hợp tất cả phân tích từ 00-06 thành một **execution roadmap cụ thể**, ưu tiên rõ ràng, effort estimate chính xác.

---

## TL;DR — Kết luận cuối cùng

### Bạn đang ở đâu?

`.pi/agent/` của bạn đã có **6 agents production-ready** + **13 npm extensions mạnh mẽ**. Về infrastructure, bạn **không thua** `.opencode` ở bất kỳ điểm nào quan trọng:
- Code-intel: `pi-srcwalk` > opencodekit's srcwalk (5 tools, BM25 + RRF)
- External research: `pi-search` > opencodekit's tools (5 tools, Exa web + grep.app + context7)
- Subagent delegation: `pi-subagents` (maxConcurrent=99) > opencodekit's `task()` (giới hạn)
- Compaction: `pi-vcc` (deterministic) > opencodekit's DCP (LLM cost) cho 95% use case

### Cơ hội lớn nhất

**Content porting + UX layer + Long-term memory.**

| Phase | Nội dung | Effort | Value |
|-------|----------|--------|-------|
| **Phase 1** | AGENTS.md + 4 Tier-1 skills + 10 templates | 1-2 ngày | 🟢 Foundation |
| **Phase 2A** | `pi-commands` + `pi-workflows` packages | 1-1.5 tuần | 🟢 UX layer |
| **Phase 2B** | `pi-memory` package | 1-2 tuần | 🟢 Largest gap |
| **Phase 2C** | `pi-guard` + `pi-session-summary` + `pi-skill-mcp` | 1 tuần | 🟡 Polish |
| **Phase 3** | Tier-2 skills + `pi-dcp` | Tùy nhu cầu | 🟠 Long-tail |

**Total: 4-5 tuần → 90% value parity với `.opencode`, một số điểm vượt trội.**

---

## Phase 1: Foundation (1-2 ngày, 2100 lines content)

> **Goal:** Behavioral rules + project templates + working AGENTS.md
> **Effort:** 4-8 giờ
> **Value:** 🟢 Rất cao — foundation cho mọi phase sau

### 1.1. Tạo `/Users/minhduydev/.pi/agent/AGENTS.md`

**Source:** `/tmp/opencodekit-template/.opencode/AGENTS.md` (đã đọc 200 lines)

**Steps:**

1. Copy `AGENTS.md` từ opencodekit → `/Users/minhduydev/.pi/agent/AGENTS.md`
2. Sửa references:
   - `opencode` → `pi`
   - `task({ subagent_type })` → `pi-subagents` `task()`
   - `srcwalk` → `pi-srcwalk`
   - `webclaw` → bỏ (pi-search covers)
   - `observation`/`memory-search` → bỏ (no pi-memory yet) HOẶC dùng `vcc_recall` thay thế
   - `compress` → bỏ (DCP not ported) HOẶC reference `pi-vcc` thay thế
   - `fallow` → giữ nguyên (CLI tool, language-agnostic)
   - `.opencode/artifacts/` → `/Users/minhduydev/.pi/agent/artifacts/`

3. **Quan trọng:** Giữ structure:
   - Priority Order
   - Behavioral Kernel (clarify/smallest/surgical/proof)
   - Hard Constraints table
   - Verification & Tool Discipline
   - Skills Protocol (sẽ reference Tier-1 skills bên dưới)
   - Edit Protocol
   - Context Management
   - Output Style

**Effort:** 1-2 giờ (copy + adjust)

### 1.2. Inline 4 Tier-1 Skills vào AGENTS.md

**Source:** `/tmp/opencodekit-template/.opencode/skill/{behavioral-kernel,defense-in-depth,incremental-implementation,verification-before-completion}/SKILL.md`

**Steps:**

1. Tạo section trong AGENTS.md cho mỗi Tier-1 skill
2. Copy content từ `03-skills-inventory.md` (Section F) — đã viết sẵn condensed version
3. Hoặc copy full từ opencodekit (300 lines total) — recommend condensed

**Sections to add vào AGENTS.md:**
- `## Behavioral Kernel` (80 lines, condensed to 30)
- `## Defense-in-Depth Validation` (200 lines, condensed to 40)
- `## Incremental Implementation` (170 lines, condensed to 50)
- `## Verification Before Completion` (250 lines, condensed to 70)

**Effort:** 2-3 giờ (copy + format)

### 1.3. Tạo `/Users/minhduydev/.pi/agent/templates/` với 10 files

**Source:** `/tmp/opencodekit-template/.opencode/templates/*.md` (10 files, ~1500 lines)

**Steps:**

```bash
mkdir -p /Users/minhduydev/.pi/agent/templates
cp /tmp/opencodekit-template/.opencode/templates/*.md /Users/minhduydev/.pi/agent/templates/
```

10 files:
- `prd.md` (Beads PRD, full)
- `project.md` (Project vision)
- `state.md` (Current state)
- `tech-stack.md` (Tech stack)
- `tasks.md` (Task schema)
- `roadmap.md` (Phased roadmap)
- `user.md` (User profile)
- `design.md` (Design doc)
- `proposal.md` (Lightweight proposal)
- `adr.md` (ADR)

**Adjustments:**
- Update `updated:` dates to `2026-06-16`
- Add comment ở đầu mỗi file: "Adapted from opencodekit-template for .pi"

**Effort:** 30 phút

### 1.4. Tạo `/Users/minhduydev/.pi/agent/context/` với 2 files

**Source:** `/tmp/opencodekit-template/.opencode/context/*.md` (2 files, ~300 lines)

**Steps:**

```bash
mkdir -p /Users/minhduydev/.pi/agent/context
cp /tmp/opencodekit-template/.opencode/context/architecture.md /Users/minhduydev/.pi/agent/context/
cp /tmp/opencodekit-template/.opencode/context/fallow.md /Users/minhduydev/.pi/agent/context/
```

**Adjustments for `architecture.md`:**
- Adapt 6 layers từ opencodekit sang pi:
  - Instructions (AGENTS.md, skills)
  - Agents (`agents/*.md`)
  - Templates (`templates/*.md`)
  - Extensions (npm packages)
  - Tools (built-in + extension-provided)
  - SDK (extension SDK)
- File size limits có thể giữ tương tự

**Effort:** 30 phút

### 1.5. Add "Load Templates" instruction to AGENTS.md

```markdown
## Project Context Loading

Before non-trivial work, check `/Users/minhduydev/.pi/agent/templates/`:
- `project.md` — project vision, success criteria, target users
- `tech-stack.md` — framework, dependencies, verification commands
- `state.md` — current position, recent work, blockers
- `roadmap.md` — phases, milestones

Read these with `read` tool to inject project context into your thinking.
If templates are not filled, prompt user to run `/init` to bootstrap.
```

**Effort:** 15 phút

### 1.6. (Optional) Create `QUALITY.md` với initial grades

**Path:** `/Users/minhduydev/.pi/agent/QUALITY.md`

**Initial grades (từ opencodekit's format):**

| Domain | Grade | Notes |
|---|---|---|
| Agents (`agents/`) | A | 6 production-ready personas |
| Extensions (npm/) | A | 13 packages, code-intel + research + subagents + compaction |
| Skills (none) | — | No skills system yet |
| Templates (`templates/`) | A | 10 files, all ported from opencodekit |
| Configuration (`settings.json`) | A | Valid JSON, well-organized |

**Effort:** 30 phút

### Phase 1 Deliverables

✅ `/Users/minhduydev/.pi/agent/AGENTS.md` (200-300 lines, behavioral rules + 4 Tier-1 skills)
✅ `/Users/minhduydev/.pi/agent/templates/` (10 files, ~1500 lines)
✅ `/Users/minhduydev/.pi/agent/context/` (2 files, ~300 lines)
✅ (Optional) `/Users/minhduydev/.pi/agent/QUALITY.md` (initial grades)

**Total Phase 1: ~2100 lines content thuần, không có TS code mới.**

---

## Phase 2A: UX Layer — Commands + Workflows (1-1.5 tuần)

> **Goal:** Slash command dispatcher + DAG executor
> **Effort:** 5-7 ngày
> **Value:** 🟢 Cao — replicate opencodekit's command UX

### 2A.1. Tạo `pi-commands` extension

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-commands/`
**Implementation:** ~300 lines TS
**Content:** 9 commands (~1500 lines markdown)

**Package structure:**

```
pi-commands/
├── package.json
├── index.ts                 ← entry: register `run_command` tool
├── dispatcher.ts            ← parse /command args, route to agent
├── parser.ts                ← YAML frontmatter parser
├── README.md
└── commands/                ← command definitions (9 files)
    ├── init.md
    ├── fix.md
    ├── verify.md
    ├── ship.md
    ├── audit.md
    ├── research.md
    ├── gc.md
    ├── create.md
    └── plan.md
```

**Core implementation (`index.ts`):**

```typescript
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { task } from '@tintinweb/pi-subagents';  // pseudo API

interface Command {
  name: string;
  description: string;
  argumentHint?: string;
  agent: 'build' | 'general' | 'review' | 'scout' | 'plan' | 'vision';
  body: string;
}

function loadCommands(dir: string): Command[] {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSync(path.join(dir, f), 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      return {
        name: path.basename(f, '.md'),
        description: frontmatter.description,
        argumentHint: frontmatter['argument-hint'],
        agent: frontmatter.agent,
        body
      };
    });
}

export const CommandsExtension = async ({ directory, client }) => {
  const commandsDir = path.join(directory, 'commands');
  const commands = loadCommands(commandsDir);
  
  return {
    tool: {
      run_command: {
        description: 'Execute a slash command (e.g., /init, /fix, /verify, /ship, etc.)',
        args: {
          name: 'string (required)',
          arguments: 'string (optional)'
        },
        handler: async ({ name, arguments: args }) => {
          const cmd = commands.find(c => c.name === name);
          if (!cmd) return `Unknown command: /${name}. Available: ${commands.map(c => '/' + c.name).join(', ')}`;
          
          const prompt = cmd.body
            .replace(/\$ARGUMENTS/g, args ?? '')
            .replace(/\{arg\}/g, args ?? '');
          
          // Delegate to specified agent via pi-subagents
          return await task({
            subagent_type: cmd.agent,
            prompt
          });
        }
      }
    },
    
    // Optional: register slash command shortcut
    'keybind.leader+c': async () => {
      // Show command picker UI
      const choices = commands.map(c => ({
        label: `/${c.name}`,
        description: c.description
      }));
      // Call TUI picker
    }
  };
};

export default CommandsExtension;
```

**Content porting:** Copy 9 files từ `/tmp/opencodekit-template/.opencode/command/*.md` → `/Users/minhduydev/.pi/agent/npm/pi-commands/commands/`

**Adjustments:**
- Replace `task({ subagent_type: "explore" })` → `pi-subagents task({ subagent_type: "explore" })`
- Replace `observation({ ... })` → remove (no pi-memory yet) HOẶC dùng `vcc_recall` as substitute
- Replace `srcwalk` → `pi-srcwalk` (semantic_query/inspect/grep/show)
- Replace `.opencode/artifacts/` → `~/.pi/agent/artifacts/`
- Replace `fallow` → keep as-is (CLI tool)

**Effort:** 2-3 ngày (code + content porting + testing)

### 2A.2. Tạo `pi-workflows` extension

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-workflows/`
**Implementation:** ~500 lines TS
**Content:** 5 workflows (~800 lines markdown)

**Package structure:**

```
pi-workflows/
├── package.json
├── index.ts                 ← entry: register `run_workflow` tool
├── executor.ts              ← DAG executor with concurrency
├── parser.ts                ← workflow markdown parser
├── concurrency.ts           ← dynamic concurrency resolver
├── README.md
└── workflows/               ← workflow definitions (5 files)
    ├── audit-pattern.md
    ├── batch-implement.md
    ├── deep-research.md
    ├── garbage-collection.md
    └── development-lifecycle-workflow.md
```

**Core implementation (`executor.ts`):**

```typescript
import { task } from '@tintinweb/pi-subagents';

interface WorkflowPhase {
  num: number;
  name: string;
  agent?: string;
  workflow?: string;          // for sub-workflow composition
  concurrency: number | { rule: string };  // Dynamic(rule)
  dependsOn?: number[];
  prompt: string;
}

interface Workflow {
  name: string;
  args: Record<string, string>;
  phases: WorkflowPhase[];
}

async function executePhase(phase: WorkflowPhase, ctx: {
  args: Record<string, string>;
  results: Record<string, any>;
  workflow: Workflow;
}): Promise<any> {
  // Sub-workflow composition
  if (phase.workflow) {
    return await executeWorkflow(phase.workflow, ctx.args, ctx.results);
  }
  
  // Substitute placeholders
  const prompt = substitute(phase.prompt, {
    ...ctx.args,
    ...Object.fromEntries(
      Object.entries(ctx.results).map(([k, v]) => [`phase_${k}_output`, v])
    )
  });
  
  // Resolve concurrency
  const concurrency = resolveConcurrency(phase.concurrency, ctx);
  
  // Spawn N tasks in parallel
  const tasks = Array.from({ length: concurrency }, () =>
    task({
      subagent_type: phase.agent,
      prompt
    })
  );
  
  return await Promise.all(tasks);
}

async function executeWorkflow(
  name: string,
  args: Record<string, string>,
  priorResults: Record<string, any> = {}
): Promise<any> {
  const workflow = loadWorkflow(name);
  const results = { ...priorResults };
  
  // Topological sort
  const phases = topologicalSort(workflow.phases);
  
  for (const phase of phases) {
    results[phase.num] = await executePhase(phase, {
      args,
      results,
      workflow
    });
  }
  
  return synthesize(results);
}
```

**Concurrency resolution logic:**

```typescript
function resolveConcurrency(
  spec: number | { rule: string },
  ctx: { results: Record<string, any> }
): number {
  if (typeof spec === 'number') return spec;
  
  // Parse rules like "min 2, max 10, 1 per task"
  const rule = spec.rule;
  const minMatch = rule.match(/min (\d+)/);
  const maxMatch = rule.match(/max (\d+)/);
  const perMatch = rule.match(/(\d+) per (\w+)/);
  
  const min = minMatch ? parseInt(minMatch[1]) : 1;
  const max = maxMatch ? parseInt(maxMatch[1]) : 10;
  
  let count = min;
  if (perMatch) {
    const [, n, target] = perMatch;
    // E.g., "1 per task" → 1 per task in dependent phase
    const targetCount = countFromResults(target, ctx.results);
    count = targetCount * parseInt(n);
  }
  
  return Math.max(min, Math.min(max, count));
}
```

**Content porting:** Copy 5 files từ opencodekit → `pi-workflows/workflows/`

**Adjustments:**
- Replace `task({ subagent_type: "@explore" })` → `pi-subagents task({ subagent_type: "explore" })`
- Keep DAG structure (Phases, Concurrency, Depends on, Prompt)

**Effort:** 3-4 ngày (code + content porting + DAG testing)

### 2A.3. Update settings.json

Add extensions:

```json
{
  "extensions": [
    "pi-commands",
    "pi-workflows",
    "pi-srcwalk",
    "pi-search",
    "pi-vcc",
    "pi-subagents",
    "pi-tasks",
    "pi-augment",
    "pi-boomerang"
  ]
}
```

**Effort:** 5 phút

### 2A.4. Testing

Test cases:
1. `/init` — verify tạo AGENTS.md + tech-stack.md
2. `/fix "TypeError in handleSubmit"` — verify 4-phase debug
3. `/verify all --quick` — verify gates + cache
4. `/audit console.log` — verify audit-pattern workflow
5. `/research "React Server Components best practices"` — verify deep-research workflow

**Effort:** 1-2 ngày

### Phase 2A Deliverables

✅ `/Users/minhduydev/.pi/agent/npm/pi-commands/` (300 lines TS + 9 commands)
✅ `/Users/minhduydev/.pi/agent/npm/pi-workflows/` (500 lines TS + 5 workflows)
✅ Updated `settings.json` with new extensions
✅ Working test suite for top 5 commands

**Total Phase 2A: ~1-1.5 tuần (5-7 ngày)**

---

## Phase 2B: Long-Term Memory (1-2 tuần) — **LARGEST GAP**

> **Goal:** 4-tier LTM (Capture → Distill → Curate → Inject)
> **Effort:** 1-2 tuần
> **Value:** 🟢 **Cao nhất** — lấp gap lớn nhất

### 2B.1. Tạo `pi-memory` extension

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-memory/`
**Implementation:** ~2000 lines TS

**Reference:** `/tmp/opencodekit-template/.opencode/plugin/memory.ts` (18 files)

**Package structure:**

```
pi-memory/
├── package.json
├── index.ts                 ← entry: register tools + hooks
├── tools.ts                 ← observation, memory-search
├── admin.ts                 ← memory-admin
├── hooks.ts                 ← event hooks + transforms
├── db/
│   ├── schema.sql           ← SQLite + FTS5 schema
│   ├── main.ts              ← DB connection
│   ├── observations.ts      ← CRUD for observations
│   └── maintenance.ts       ← cleanup, archival
├── capture.ts               ← message capture (session start, etc.)
├── distill.ts               ← TF-IDF compression
├── curator.ts               ← pattern-matched observation creation
├── inject.ts                ← system.transform relevance scoring
├── context.ts               ← token budget enforcement
├── helpers.ts               ← shared utilities
├── validate.ts              ← input validation
├── README.md
└── tests/
    ├── capture.test.ts
    ├── distill.test.ts
    ├── curator.test.ts
    ├── inject.test.ts
    └── integration.test.ts
```

**Schema (SQLite + FTS5):**

```sql
-- Observations (durable knowledge)
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,        -- 'decision' | 'bugfix' | 'feature' | 'discovery' | 'warning'
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,
  concepts TEXT,              -- comma-separated tags
  confidence TEXT,            -- 'high' | 'medium' | 'low'
  feedback_score REAL DEFAULT 0,
  retrieval_count INTEGER DEFAULT 0,
  source TEXT,                -- 'manual' | 'auto-curator' | 'auto-distill'
  session_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE VIRTUAL TABLE observations_fts USING fts5(
  title, narrative, concepts,
  content='observations',
  content_rowid='id'
);

-- Sessions (metadata)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  message_count INTEGER,
  summary TEXT
);

-- Distillations (compressed sessions)
CREATE TABLE distillations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  compressed_at INTEGER NOT NULL,
  summary TEXT NOT NULL,
  token_count INTEGER,
  tfidf_terms TEXT             -- JSON array of TF-IDF weighted terms
);
```

**Core tools:**

```typescript
// tools.ts
export const observation = tool({
  description: 'Create an observation OR give feedback on existing one',
  args: {
    id: 'number (optional, for feedback)',
    type: '"decision" | "bugfix" | "feature" | "discovery" | "warning"',
    title: 'string (required for new)',
    narrative: 'string (required for new)',
    concepts: 'string (comma-separated, optional)',
    confidence: '"high" | "medium" | "low"',
    feedback: '"helpful" | "unhelpful" (optional, for existing)'
  },
  handler: async (args, ctx) => {
    if (args.id && args.feedback) {
      // Feedback mode
      return await recordFeedback(args.id, args.feedback, ctx);
    } else {
      // Create mode
      return await createObservation(args, ctx);
    }
  }
});

export const memorySearch = tool({
  description: 'Search observations by text OR read memory files by path',
  args: {
    query: 'string (optional, for text search)',
    file: 'string (optional, for file read)',
    limit: 'number (default 10)'
  },
  handler: async (args, ctx) => {
    if (args.file) {
      return await getMemoryFile(args.file, ctx);
    } else {
      return await searchObservationsFTS(args.query, args.limit, ctx);
    }
  }
});

// admin.ts
export const memoryAdmin = tool({
  description: 'Admin operations: list, archive, restore, stats',
  args: {
    operation: '"list" | "archive" | "restore" | "stats" | "export"',
    filter: 'object (optional)'
  },
  handler: async (args, ctx) => {
    // ...
  }
});
```

**Hooks:**

```typescript
// hooks.ts
export const hooks = {
  // Capture: tool.execute.after
  'tool.execute.after': async (input, output, ctx) => {
    await captureToolCall(input, output, ctx);
  },
  
  // Distillation + Curator: session.idle
  'session.idle': async (sessionId, ctx) => {
    await distillSession(sessionId, ctx);
    await curateObservations(sessionId, ctx);
  },
  
  // LTM Injection: system.transform
  'experimental.chat.system.transform': async (system, ctx) => {
    const relevantObservations = await injectRelevantObservations(ctx);
    return `${system}\n\n## Relevant Past Observations\n\n${relevantObservations}`;
  },
  
  // Context Management: messages.transform
  'experimental.chat.messages.transform': async (messages, ctx) => {
    return await enforceContextBudget(messages, ctx);
  },
  
  // Compaction: persist observations before compaction
  'experimental.session.compacting': async (sessionId, ctx) => {
    await persistObservations(sessionId, ctx);
  }
};
```

**Effort:** 1-2 tuần (large package, but well-defined scope)

### Phase 2B Deliverables

✅ `/Users/minhduydev/.pi/agent/npm/pi-memory/` (2000 lines TS + tests)
✅ SQLite schema with FTS5
✅ 3 tools (observation, memory-search, memory-admin)
✅ 5 hooks (capture, distill, curate, inject, compact)
✅ Integration with existing agents (AGENTS.md, plan, general)

**Total Phase 2B: ~1-2 tuần**

---

## Phase 2C: Polish Packages (1 tuần)

> **Goal:** Safety hooks + session summary + skill-MCP bridge
> **Effort:** 5-7 ngày
> **Value:** 🟡 Medium

### 2C.1. `pi-guard` (2-3 giờ)

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-guard/`
**Implementation:** ~150 lines TS

**Reference:** `/tmp/opencodekit-template/.opencode/plugin/guard.ts` (60 lines core)

**Features:**
- Block `curl/wget | bash` patterns
- Enforce Conventional Commits on `git commit`
- Optional: block `rm -rf`, `git push --force`, `git add .`

**Effort:** 2-3 giờ

### 2C.2. `pi-session-summary` (3-5 ngày)

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-session-summary/`
**Implementation:** ~400 lines TS

**Reference:** `/tmp/opencodekit-template/.opencode/plugin/session-summary.ts` + `session-summary/` directory

**Features:**
- Track file artifact trail (read/edit/write)
- Track decisions (manual + auto-detect)
- Persist to `/Users/minhduydev/.pi/agent/state/session-summary.md`
- Inject into system prompt on session start
- Integrate with pi-vcc compaction (persist before compact)

**Effort:** 3-5 ngày

### 2C.3. `pi-skill-mcp` (1-2 ngày, optional)

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-skill-mcp/`
**Implementation:** ~300 lines TS

**Reference:** `/tmp/opencodekit-template/.opencode/plugin/skill-mcp.ts`

**Features:**
- Per-skill MCP server loading
- `includeTools` filtering
- Lifecycle management

**Effort:** 1-2 ngày (chỉ làm nếu cần)

### Phase 2C Deliverables

✅ `pi-guard` (150 lines TS)
✅ `pi-session-summary` (400 lines TS)
✅ (Optional) `pi-skill-mcp` (300 lines TS)

**Total Phase 2C: ~5-7 ngày (không tính pi-skill-mcp)**

---

## Phase 3: Long-tail (tùy nhu cầu)

> **Goal:** Tier-2 skills + DCP enhancement + niche features
> **Effort:** Tùy nhu cầu
> **Value:** 🟠 Lower

### 3.1. Port Tier-2 Skills (8 high-value skills)

**Effort:** 1-2 ngày mỗi skill
**Value:** 🟡 Medium

**Recommended skills (nếu cần):**
1. `test-driven-development` — RED-GREEN-REFACTOR
2. `root-cause-tracing` — Trace bugs backward
3. `git-workflow-and-versioning` — Atomic commits
4. `documentation-and-adrs` — Tech docs
5. `subagent-driven-development` — Dispatch + review gates
6. `spec-driven-development` — Vague → concrete spec
7. `brainstorming` — Refine ideas
8. `api-and-interface-design` — REST/GraphQL contracts

**Path:** `/Users/minhduydev/.pi/agent/skills/<name>/SKILL.md`

**Loading mechanism:** Có thể dùng `pi-skills` extension (tự build) hoặc `/skill <name>` command thủ công.

### 3.2. `pi-dcp` extension (1 tuần, optional)

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-dcp/`
**Implementation:** ~600 lines TS

**Features:**
- 2 zero-cost strategies (deduplication, purgeErrors) — adapt vào pi-vcc
- Turn/iteration/context-limit nudges
- Skip LLM-invoked `compress` tool (giữ algorithmic)

**Value:** 🟠 Thấp — chỉ hữu ích cho sessions >50 turns

### 3.3. Add 2 zero-cost strategies vào `pi-vcc` (4-6 giờ)

**Path:** Edit `/Users/minhduydev/.pi/agent/npm/@sting8k/pi-vcc/` (hoặc fork)

**Features:**
- `deduplication` — remove duplicate tool calls
- `purgeErrors` — prune inputs from errored tool calls

**Value:** 🟡 Medium

### 3.4. Tier-2 skills pack (3-5 ngày)

Port toàn bộ 55 skills thành 1 package `pi-skills`:

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-skills/`
**Implementation:** ~200 lines TS (loader) + 55 SKILL.md files

**Features:**
- Tool: `load_skill`
- Hook: `before_agent_start` (auto-detect từ user prompt)
- Tier-1 auto-load, Tier-2 on-demand

**Value:** 🟠 Lower (rất nhiều content)

---

## Summary: Phased Delivery Plan

| Phase | Effort | Deliverables | Value |
|-------|--------|--------------|-------|
| **Phase 1** | 1-2 ngày | AGENTS.md + 4 Tier-1 skills + 10 templates + 2 context files | 🟢 Foundation |
| **Phase 2A** | 1-1.5 tuần | `pi-commands` + `pi-workflows` (commands + workflows UX) | 🟢 UX layer |
| **Phase 2B** | 1-2 tuần | `pi-memory` (4-tier LTM) | 🟢 **Largest gap** |
| **Phase 2C** | 1 tuần | `pi-guard` + `pi-session-summary` (+ optional `pi-skill-mcp`) | 🟡 Polish |
| **Phase 3** | Tùy nhu cầu | Tier-2 skills + `pi-dcp` + zero-cost strategies | 🟠 Long-tail |
| **TOTAL** | ~4-5 tuần (Phases 1-2C) | **90% value parity với `.opencode`, một số điểm vượt trội** | — |

---

## Khuyến nghị thực thi

### Bắt đầu từ đâu?

**Hôm nay → 1-2 ngày tới:** Phase 1 (AGENTS.md + templates)
- Lowest risk, highest immediate value
- 0 TS code, 100% content porting
- Có thể dùng ngay sau khi xong

**Tuần sau:** Phase 2A (commands + workflows)
- Cần TS code, nhưng well-defined scope
- UX layer rõ ràng, dễ test

**Sau 2 tuần:** Phase 2B (pi-memory)
- Largest gap, nhưng effort lớn
- Có thể ship Phase 1+2A trước, dùng 1-2 tuần rồi mới build pi-memory

**Optional:** Phase 2C + 3 (polish + long-tail)

### Dừng ở đâu?

- **Sau Phase 1:** Có `.pi` với behavioral kernel + templates (foundation vững)
- **Sau Phase 2A:** Có slash commands + workflows (UX layer giống opencodekit)
- **Sau Phase 2B:** Có long-term memory (gap lớn nhất filled)
- **Sau Phase 2C:** Polish (safety + session summary)
- **Phase 3:** Tùy nhu cầu

**Sweet spot:** Phase 1 + 2A + 2B = 90% value trong ~3 tuần.

---

## Cuối cùng

Mapping `.opencode` → `.pi` của bạn cho thấy:

1. **`.pi` đã có infrastructure tốt** (pi-srcwalk, pi-search, pi-subagents, pi-vcc)
2. **Content porting = ROI cao nhất** (AGENTS.md, skills, templates)
3. **Largest gap = pi-memory** (4-tier LTM)
4. **UX layer missing = pi-commands + pi-workflows**
5. **Polish = pi-guard + pi-session-summary**

Không cần port tất cả. Tập trung vào:
- Phase 1 (1-2 ngày) → foundation
- Phase 2A (1-1.5 tuần) → UX
- Phase 2B (1-2 tuần) → memory gap

**Total: ~4-5 tuần → `.pi` của bạn mạnh hơn `.opencode` ở nhiều điểm.**
