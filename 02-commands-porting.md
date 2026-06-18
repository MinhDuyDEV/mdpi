# 02 - Commands & Workflows Porting

## Tổng quan

`.opencode` có **9 slash commands** (`/init`, `/fix`, `/verify`, `/ship`, `/audit`, `/research`, `/gc`, `/create`, `/plan`) + **5 DAG workflows** (`audit-pattern`, `batch-implement`, `deep-research`, `garbage-collection`, `development-lifecycle`).

`.pi` **hiện tại không có** command dispatcher hay workflow executor. Tất cả delegation qua `pi-subagents` `task()` calls thủ công.

Phần này phân tích chi tiết từng command + workflow, đề xuất cách port sang `.pi`.

---

## A. Slash Commands (9 files)

### Tổng quan tất cả 9 commands

| Command | Agent | Purpose | Lines | Complexity |
|---|---|---|---|---|
| `/init` | build | Initialize project setup (AGENTS.md, tech-stack, user profile) | 313 | High (4 modes, brownfield detection) |
| `/fix` | build | Debug + fix bug (4-phase: reproduce→isolate→fix→verify) | ~50 | Low |
| `/verify` | review | Verify implementation (completeness, correctness, coherence) | ~100 | Medium (cache, modes) |
| `/ship` | build | Ship plan (6 phases: guards→route→execute→verify→review→close) | 498 | **Highest** |
| `/audit` | build | Audit codebase for pattern (invokes `audit-pattern` workflow) | ~80 | Low (wrapper) |
| `/research` | scout | Research topic (simple or `deep-research` workflow) | ~150 | Medium (complexity detection) |
| `/gc` | build | Garbage collection (Fallow + quality grades) | ~80 | Low |
| `/create` | build | Create spec (PRD) + workspace setup + tasks | 256 | High (lite/full PRD auto-detect) |
| `/plan` | plan | Create detailed impl plan with TDD steps | 406 | **High** (constitutional compliance gate) |

---

### 1. `/init` (313 lines) — Initialize project

**Trigger:** `/init [--deep] [--context|--user|--all]`
**Agent:** `build`
**Skills:** `brainstorming`, `verification-before-completion`
**Modes:**
- Default: Core setup (AGENTS.md + tech-stack.md)
- `--context`: Planning context (roadmap.md, state.md)
- `--user`: User profile (user.md)
- `--all`: Everything
- `--deep`: Comprehensive research (~100+ tool calls)

**Phases:**
1. Detect project (package manager, deps, build commands)
2. Preview detection (ask user confirmation)
3. Create AGENTS.md
4. Create tech-stack.md
5. Setup Fallow
6. (if --context) Discovery + requirements gathering
7. (if --user) User preferences gathering

**Idempotency:**
- AGENTS.md: improve in-place
- tech-stack.md: overwrite
- roadmap.md/state.md: skip if exists, ask before overwrite
- user.md: skip if exists, ask before overwrite

**Brownfield auto-detection:** Existing src/, lib/, app/ with .ts/.js/.tsx/.jsx/.py/.go/.rs files

**Pi porting strategy:**
- Frontmatter: `description`, `argument-hint`, `agent: build` (or general)
- Body: 4 mode handlers
- Delegate to `pi-subagents` for brownfield exploration (using explore agent)
- Write to `/Users/minhduydev/.pi/agent/templates/` (copy từ opencodekit)

---

### 2. `/fix` (~50 lines) — Debug + fix

**Trigger:** `/fix <description of bug or error>`
**Agent:** `build`
**Skills:** `root-cause-tracing`, `verification-before-completion`

**Phases:**
1. **Reproduce** — exact steps or command
2. **Isolate** — search error message, trace execution path, read 2-4 most relevant files, distinguish symptom from root cause
3. **Fix** — minimal fix for root cause, no speculative guards, no defensive copies
4. **Verify** — `npm run typecheck && npm run lint && npm test` (or vitest)

**Rule:** "If verification fails twice on the same approach, escalate with learnings"

**Output:** Root cause (with file:line), fix applied, verification results, alternatives considered + rejected

**Pi porting strategy:** Rất đơn giản — wrap 4 phases vào 1 pi command, delegate to `general` agent.

---

### 3. `/verify` (~100 lines) — Verify implementation

**Trigger:** `/verify [path|all] [--quick] [--full] [--fix] [--no-cache]`
**Agent:** `review`
**Skill:** `verification-before-completion`

**Phases:**
0. **Check verification cache** (compute fingerprint = commit hash + diff)
1. **Gather context** (read spec.md, plan.md, etc.)
2. **Completeness** (extract requirements, verify each, score X/Y)
3. **Correctness** (parallel typecheck + lint, then test, then build)
4. **Coherence** (cross-reference PRD vs implementation, plan vs impl, research vs approach)
5. **Report** (READY TO SHIP / NEEDS WORK / BLOCKED + completeness score + gate results + blocking issues)

**Cache stamp:** `.opencode/artifacts/verify.log` (line format: `<stamp> <ISO-date> <PASS|FAIL>`)

**Pi porting strategy:** Trung bình — cần wrap cache logic + multiple modes. Delegate to `review` agent.

---

### 4. `/ship` (498 lines) — Ship plan

**Trigger:** `/ship` (no args, uses `.active` slug)
**Agent:** `build`
**Skill:** `verification-before-completion`

**Phases:**
1. **Guards** — memory search, plan validation, workspace setup
2. **Route to execution** — complexity detection (direct vs `batch-implement` workflow)
3. **Wave-based execution** (depends on routing)
4. **Verification** (after each task)
5. **Review** (5 parallel agents OR iterative quality loop)
6. **Close** (per-task commits, user confirmation)

**Goal-backward 3-level verification:**
- Level 1: Exists
- Level 2: Substantive (not stub)
- Level 3: Wired (connected, used)

**Per-task commits required:** "don't ship without git history"

**Pi porting strategy:** **PHỨC TẠP NHẤT** — đây là command khó port nhất. Cần:
- Memory search (nếu có pi-memory) hoặc vcc_recall
- Plan validation (parse `tasks.json` hoặc `plan.md`)
- Workspace setup (git branch)
- Complexity detection logic
- Wave-based execution (parallel via pi-subagents)
- Verification gates
- 5 parallel review agents (or iterative quality loop)
- User confirmation before close

**Đề xuất:** Tách `/ship` thành 2-3 sub-commands:
- `/ship` — wrapper, just runs the pipeline
- Logic internal gọi `pi-workflows` `batch-implement` + `pi-workflows` `audit-pattern` (5 parallel reviewers)

---

### 5. `/audit` (~80 lines) — Audit codebase for pattern

**Trigger:** `/audit <pattern>`
**Agent:** `build`
**Execution:** Invokes `audit-pattern` workflow

**Output:**
1. Pattern + occurrences found + files affected
2. Issues by severity (critical/important/minor)
3. Recommended fixes
4. Correct patterns (preserved)

**Pi porting strategy:** Rất đơn giản — thin wrapper gọi `pi-workflows` `audit-pattern`.

---

### 6. `/research` (~150 lines) — Research topic

**Trigger:** `/research <topic> [--quick|--thorough]`
**Agent:** `scout`
**Skill:** none explicit

**Complexity detection:**
- **Simple research** (direct execution): single factual question, one specific API, narrow scope
- **Complex research** (invoke `deep-research` workflow): multi-angle, broad scope, "best practices", "compare", "approaches"

**Direct execution depth:**
- `--quick`: ~10 tool calls
- Default: ~30 tool calls
- `--thorough`: 100+ calls

**Source priority:**
1. Codebase patterns (`explore` agent)
2. Official docs (`context7`)
3. Source code (`opensrc`)
4. GitHub examples (`codesearch`, `grepsearch`)
5. Web search (last resort)

**Confidence levels:** High (multiple sources), Medium (single good source), Low (discard without corroboration)

**Pi porting strategy:** Trung bình — wrap complexity detection + depth tiers. Delegate to `scout` agent.

---

### 7. `/gc` (~80 lines) — Garbage collection

**Trigger:** `/gc` (no args)
**Agent:** `build`
**Skills:** `fallow`, `verification-before-completion`

**Phases:**
1. Run `npx fallow --format json --quiet` (extract dead code, dupes, complexity, boundary violations)
2. Read existing quality grades
3. Grade each domain (Plugins/Commands/Skills/Docs) A-D
4. Open cleanup PRs for P0/P1 findings (spawn `@general` per finding)
5. Report (quality grades + issues + PRs + recommendations)

**Pi porting strategy:** Đơn giản — bash + JSON parse + update QUALITY.md. Có thể dùng `pi-lint` thay thế `structural-check.sh`.

---

### 8. `/create` (256 lines) — Create spec (PRD)

**Trigger:** `/create <description>`
**Agent:** `build`
**Tools:** `explore`, `scout`

**Phases:**
1. **Duplicate check** — memory search, existing work check
2. ~~(skipping to Phase 3)~~
3. **Choose research depth** (Deep/Standard/Minimal/Skip)
4. **Gather context** (spawn N agents based on depth)
5. **Initialize plan** (derive kebab-case slug, mkdir, set .active)
6. **Determine PRD rigor** (Lite vs Full, auto-detect from signals)
7. **Write PRD** (lite or full template)
8. **Validate PRD** (no placeholders, verify commands, no [NEEDS CLARIFICATION])
9. **Prepare workspace** (git status check, branch, worktree option)
10. **Convert PRD to tasks** (prd.json)
11. **Report** (summary, branch, next step)

**Lite PRD format:** Problem + Solution + Affected Files + Tasks + Success Criteria
**Full PRD format:** Full Beads PRD template (`templates/prd.md`)

**Pi porting strategy:** Trung bình-cao — cần:
- Kebab-case slug generation
- Brownfield detection
- PRD rigor detection logic
- Template instantiation (copy từ `pi-templates`)
- Git workspace setup (dùng `using-git-worktrees` skill)
- Tasks.json conversion

---

### 9. `/plan` (406 lines) — Detailed implementation plan

**Trigger:** `/plan` (no args, uses `.active` spec)
**Agent:** `plan`
**Tools:** explore, scout, ls, read

**Phases:**
0. **Institutional research (mandatory)** — memory search, git log mine, spawn learnings-researcher
1. **Guards** — spec.md exists, plan.md not exists
2. **Discovery assessment** — Level 0/1/2/3
3. **Research** (if Level 1-3) — spawn parallel explore + scout
4. **Goal-backward analysis** — truth → artifacts → wiring → key links
5. **Decompose with context budget** — target ~50% per plan, 2-3 tasks max
6. **Dependency graph & wave assignment** — needs/creates/has_checkpoint
7. **Write plan** (full template format)
8. **Constitutional compliance gate** — scan for `git add .`, `--force`, `as any`, etc.
9. **Report** (discovery level, must-haves, context budget, dependency waves, task count, plan location)

**Constitutional compliance gate:** CRITICAL patterns (git add ., --force, --no-verify, reset --hard, checkout ., clean -fd, secret patterns), WARNING patterns (as any, @ts-ignore, new dep without approval, >3 file modifications)

**Pi porting strategy:** Trung bình — port khá straightforward, dùng `plan` agent hiện tại (đã có goal-backward methodology), bổ sung constitutional compliance gate.

---

## B. Workflows (5 files)

### Tổng quan tất cả 5 workflows

| Workflow | Phases | Pattern | Use Case |
|---|---|---|---|
| `audit-pattern` | 3 | Explore → Review (N) → Main synthesize | Cross-cutting pattern audit |
| `batch-implement` | 3 | Plan review → General implement (N) → Review verify (N) | Multi-file parallel implementation |
| `deep-research` | 2 | Scout research (N) → Review cross-check → Main synthesize | Multi-angle web research |
| `garbage-collection` | 5 | Fallow scan → Grade → Prioritize → Fix PRs → Report | Codebase health check |
| `development-lifecycle` | 5 | Scout research → Review validate → Plan → batch-implement → Review (3) | Full feature dev with parallelism |

### Schema chung

```markdown
# <workflow-name>

Brief description.

## Args
- `arg1` (required) — description
- `arg2` (optional) — description

## Phases

### Phase 1: <name>
- **Agent:** @<type>
- **Concurrency:** <N | Dynamic (rule)>
- **Prompt:**
  
  The prompt for this phase. Can use {arg} or {phase_N_output} placeholders.

### Phase 2: <name>
- **Depends on:** Phase 1
- **Agent:** @<type>
- **Concurrency:** ...
- **Prompt:**
  ...

## Final Synthesis (Main Agent)
After Phase N completes, synthesize the output from {phase_N_output}...
```

**Placeholder substitution:**
- `{arg}` → argument value
- `{phase_N_output}` → actual output from completed phase N
- `**Workflow:** <name>` → sub-workflow composition (chỉ trong development-lifecycle)

---

### 1. `audit-pattern` (3 phases)

**Args:** `pattern` (required)

**Phase 1: discover** — `@explore`, Concurrency 1
- Prompt: "Search the codebase for the pattern: {pattern}. Use grep or csearch to find every occurrence..."

**Phase 2: audit** — `@review`, Concurrency Dynamic (~10 per agent, min 2, max 15)
- Depends on Phase 1
- Prompt: "Review the following files for the pattern '{pattern}': {phase_1_output}. For each occurrence check: correctness, edge cases, security..."

**Final Synthesis (Main Agent):**
- Issues ranked by severity, affected scope, recommended fixes, correct patterns
- Group by subdirectory, keep < 1500 words

**Pi porting:** Trung bình — cần DAG executor hiểu Concurrency = "Dynamic" + parse rule.

---

### 2. `batch-implement` (3 phases)

**Args:** `plan` (required)

**Phase 1: plan-review** — `@review`, Concurrency 1
- Prompt: "Review this implementation plan for task independence: {plan}. Verify tasks don't edit same files. Flag conflicts..."

**Phase 2: implement** — `@general`, Concurrency Dynamic (1 per task, min 2, max 10)
- Depends on Phase 1
- Prompt: "Implement the following task from the plan: {phase_1_output}. Write production-quality code..."

**Phase 3: verify** — `@review`, Concurrency Dynamic (~3 per agent, min 2, max 8)
- Depends on Phase 2
- Prompt: "Review this implementation: {phase_2_output}. Check: correctness, test coverage, edge cases..."

**Final Merge (Main Agent):**
- Ensure no duplicate imports, consistent naming, proper module boundaries, no broken imports
- Report merge summary: tasks merged, files modified, integration issues, next steps

**Pi porting:** Trung bình — DAG executor + dynamic concurrency.

---

### 3. `deep-research` (2 phases)

**Args:** `question` (required)

**Phase 1: research** — `@scout`, Concurrency Dynamic (1 per angle, min 3, max 10)
- Prompt: "Search for different perspectives on the question: {question}. Cover opposing viewpoints, authoritative sources..."

**Phase 2: cross-check** — `@review`, Concurrency Dynamic (~5 findings per agent, min 2, max 10)
- Depends on Phase 1
- Prompt: "Cross-check these findings: {phase_1_output}. Flag contradictions, identify confirmable facts..."

**Final Synthesis (Main Agent):**
- Cited report: Executive Summary, Key Findings, Contradictions & Uncertainties, Sources
- Each claim annotated with confidence level
- Keep < 2000 words

**Pi porting:** Đơn giản — wrap trong `/research --complex` mode.

---

### 4. `garbage-collection` (5 phases)

**Args:** (none)

**Phase 1: Fallow Scan** — bash
- `npx fallow --format json --quiet > .opencode/artifacts/gc-fallow.json`
- Extract dead code, dupes, complexity hotspots, boundary violations

**Phase 2: Quality Grade Update** — bash + manual
- For each domain (Plugin/Command/Skill/Docs), assign A/B/C/D
- Update `.opencode/QUALITY.md`

**Phase 3: Prioritize Findings** — bash + table
- P0/P1/P2/P3 criteria

**Phase 4: Open Cleanup PRs (Optional)** — `@general`, dynamic
- Spawn 1 agent per P0/P1 finding
- Each: understand finding → branch → fix → verify → open PR

**Phase 5: Report** — main agent
- Grade table + issues + PRs + recommendations

**Pi porting:** Trung bình — cần JSON parsing + grading logic. Mostly bash + light pi-subagents usage.

---

### 5. `development-lifecycle` (5 phases, includes nested workflow)

**Args:** `feature` (required)

**Phase 1: Research Approaches** — `@scout`, Concurrency Dynamic (1 per approach, min 2, max 5)
- Prompt: "Research different approaches to implementing: {feature}. Analyze feasibility, trade-offs, complexity, dependencies..."

**Phase 2: Validate Requirements** — `@review`, Concurrency Dynamic (1 per approach, min 1, max 5)
- Depends on Phase 1
- Prompt: "Review these approaches: {phase_1_output}. Validate requirements, check technical accuracy, feasibility, alignment..."

**Phase 3: Create Implementation Plan** — `@plan`, Concurrency 1
- Depends on Phase 2
- Prompt: "Based on validated requirements: {phase_2_output}, create detailed implementation plan for recommended approach. Break into independent tasks..."

**Phase 4: Parallel Implementation** — **Workflow: batch-implement** (composition by name!)
- Depends on Phase 3
- Args: plan from Phase 3
- Execute `batch-implement` workflow with the plan

**Phase 5: Verify Different Aspects** — `@review`, Concurrency 3 (one per aspect)
- Depends on Phase 4
- Prompt: "Verify implementation from different aspects: {phase_4_output}. Each reviewer: correctness, code-quality, performance-security..."

**Pi porting:** Trung bình-cao — cần hỗ trợ nested workflow composition (gọi `**Workflow:** <name>` để chạy sub-workflow).

---

## C. Implementation Plan: pi-commands + pi-workflows

### Package: `pi-commands`

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-commands/`
**Implementation:** ~300 lines TS
**Source content:** 9 commands từ `.opencode/command/*.md` (~1500 lines)

**Core logic:**
```typescript
// Pseudo-code
function handleCommand(input: string) {
  const [name, ...args] = input.slice(1).split(' ');  // /command args
  const commandFile = path.join(commandsDir, `${name}.md`);
  const { frontmatter, body } = parseMarkdown(commandFile);
  
  const agent = frontmatter.agent;  // 'build' | 'general' | 'review' | 'scout' | 'plan'
  const argsStr = args.join(' ');
  const prompt = body
    .replace(/\$ARGUMENTS/g, argsStr)
    .replace(/\{arg\}/g, argsStr);
  
  return piSubagents.task({
    subagent_type: agent,
    prompt: prompt
  });
}
```

**Settings.json addition:**
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

**Slash command registration:** Custom keybind in pi (e.g., `ctrl+x` leader + `c` for commands menu)

---

### Package: `pi-workflows`

**Path:** `/Users/minhduydev/.pi/agent/npm/pi-workflows/`
**Implementation:** ~500 lines TS
**Source content:** 5 workflows từ `.opencode/workflows/*.md` (~800 lines)

**Core logic:**
```typescript
// Pseudo-code
async function executeWorkflow(workflowName: string, args: object) {
  const wf = parseWorkflow(workflowPath);
  const results: Record<string, any> = {};
  
  // Topological sort by Depends on
  const phases = topologicalSort(wf.phases);
  
  for (const phase of phases) {
    if (phase.workflow) {
      // Sub-workflow composition
      results[`phase_${phase.num}_output`] = await executeWorkflow(phase.workflow, args);
    } else {
      // Spawn N agents in parallel
      const conc = resolveConcurrency(phase.concurrency, results);
      const tasks = Array.from({ length: conc }, (_, i) =>
        piSubagents.task({
          subagent_type: phase.agent,
          prompt: substitute(phase.prompt, { ...args, ...results })
        })
      );
      results[`phase_${phase.num}_output`] = await Promise.all(tasks);
    }
  }
  
  return synthesize(results);
}
```

**Concurrency resolution:**
- `1` → 1 task, sequential
- `N` → N tasks in parallel
- `Dynamic (rule)` → parse rule, e.g., "min 2, max 10, 1 per task" → N = clamp(taskCount, 2, 10)

---

## D. Effort & Value Summary

| Action | Effort | Value | Priority |
|---|---|---|---|
| Build `pi-commands` (300 lines TS) | 2-3 ngày | 🟢 Cao (UX layer) | Phase 2A |
| Build `pi-workflows` (500 lines TS) | 3-4 ngày | 🟢 Cao (DAG orchestration) | Phase 2A |
| Port 9 commands content (~1500 lines) | 1 ngày | 🟢 Cao | Phase 2A |
| Port 5 workflows content (~800 lines) | 1 ngày | 🟢 Cao | Phase 2A |
| Test end-to-end với 1-2 workflows | 1-2 ngày | — | Phase 2A |
| **Total Phase 2A** | **~1-1.5 tuần** | **~90% UX parity với opencodekit** | **HIGH** |

**Kết luận:** Phase 2A (commands + workflows) là ROI cao nhất sau Phase 1. Đây là layer UX opencodekit có mà pi thiếu hoàn toàn.
