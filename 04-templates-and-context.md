# 04 - Templates & Context Files

## Tổng quan

`.opencode` có:
- **10 templates** trong `templates/` (project context files)
- **2 context files** trong `context/` (architecture + fallow reference docs)
- **QUALITY.md** (A/B/C/D grading per domain)
- **.template-manifest.json** (SHA-256 hashes of all files)

`.pi` **hiện tại không có** templates hay context files. Phần này phân tích chi tiết từng file + đề xuất port.

---

## A. Templates (10 files, ~1500 lines)

### Tổng quan tất cả 10 templates

| # | Template | Purpose | Auto-injected? | Use Case |
|---|----------|---------|----------------|----------|
| 1 | `prd.md` | Full Beads PRD spec | ❌ Manual | Created by `/create`, used by `/ship` |
| 2 | `project.md` | Project vision + success criteria | ✅ Via `opencode.json` `instructions[]` | Always-on context |
| 3 | `state.md` | Current position, recent work, blockers | ❌ Manual | Multi-session continuity |
| 4 | `tech-stack.md` | Framework, deps, integrations | ✅ Via `instructions[]` | Always-on context |
| 5 | `tasks.md` | Task schema with YAML metadata | ❌ Manual | Output of `/plan` |
| 6 | `roadmap.md` | Phased roadmap with bead organization | ❌ Manual | Project planning |
| 7 | `user.md` | User identity, preferences | ❌ Manual (search on-demand) | Personalization |
| 8 | `design.md` | Design doc (problem, approaches, decision) | ❌ Manual | Created during planning |
| 9 | `proposal.md` | Lightweight change proposal | ❌ Manual | OpenSpec-flavored changes |
| 10 | `adr.md` | Architecture Decision Record | ❌ Manual | Long-term decision log |

**Effort port toàn bộ: 2-3 giờ (copy + minor adjustments)**

---

### 1. `prd.md` (Beads PRD, ~120 lines, đã đọc full)

**Purpose:** Full PRD spec for a feature/bead, with metadata YAML, problem/scope/solution/criteria/tasks

**Schema:**
- Frontmatter: `Bead:` (id), `Created:`, `Status:` (Draft/In Review/Approved)
- Bead Metadata: `depends_on`, `parallel`, `conflicts_with`, `blocks`, `estimated_hours`
- Problem Statement: What/Why/Who
- Scope: In-Scope / Out-of-Scope
- Proposed Solution: Overview + User Flow
- Requirements: Functional (with WHEN/THEN scenarios) + Non-Functional
- Success Criteria: bullet list with `Verify:` commands
- Technical Context: Existing Patterns, Key Files, Affected Files (YAML)
- Risks & Mitigations: table
- Open Questions: table
- Tasks: `### <Title> [category]` with Metadata YAML + Verification checklist
- Dependency Legend
- Notes

**Key features:**
- `[NEEDS CLARIFICATION: reason]` markers (must be resolved before planning)
- `Verify:` command in success criteria (mandatory)
- Task format: `<One sentence end state>` + YAML metadata + verification steps
- Machine-convertible to `prd.json` for `/ship`

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/prd.md`
- Không cần sửa gì (markdown thuần)
- Dùng cho `/create` command (Phase 2A)

---

### 2. `project.md` (Project vision, ~50 lines, đã đọc full)

**Purpose:** Project vision, success criteria, target users, core principles

**Schema:**
- Frontmatter: `purpose`, `updated`
- The Goal (1 sentence, outcome-shaped)
- Success Criteria (3-7 observable outcomes)
- Target Users (Primary/Secondary)
- Core Principles (3-5 non-negotiable)
- Current Phase (Status/Milestone/Next Milestone)
- Key Links (Repository/Documentation/Staging/Production)

**Auto-injected:** Via `opencode.json` `instructions[]` — appears in every AI prompt

**Key features:**
- "Outcome-shaped, not task-shaped" (good vs bad examples)
- 3-7 success criteria, each verifiable by using the app
- Comments giúp người dùng fill template đúng cách

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/project.md`
- **CRITICAL:** Pi không có `instructions[]` mechanism như opencode.json
- Cần build `pi-templates` extension để auto-inject, HOẶC
- User tự paste vào session khi cần

---

### 3. `state.md` (Current state, ~80 lines, đã đọc full)

**Purpose:** Current project state, active decisions, blockers, position tracking

**Schema:**
- Current Position (Active Bead, Status, Started, Phase)
- Recent Completed Work (table)
- Active Decisions (table with Date/Decision/Rationale/Impact)
- Blockers (table)
- Open Questions (table with Context/Blocking/Priority)
- Context Notes (Technical/Product/Process)
- Next Actions (checklist)
- Session Handoff (multi-session work)

**Use case:** "You are here" marker for the project, updated at end of each significant session

**Key features:**
- Session Handoff section giúp multi-session work
- Context Notes chia theo Technical/Product/Process

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/state.md`
- Dùng như "scratchpad" — user paste/update mỗi session

---

### 4. `tech-stack.md` (Tech stack, ~70 lines, đã đọc full)

**Purpose:** Tech stack, constraints, integrations for AI context injection

**Schema:**
- Framework & Language (Framework, Language, Runtime)
- Styling & UI (CSS, Components, Design System)
- Data & State (Database, ORM, State Management, API Style)
- Testing (Unit/E2E/Coverage)
- Key Constraints (list)
- Active Integrations (list)
- Context Budget Guidelines (table)
- Verification Commands (typecheck/lint/test/build)

**Auto-injected:** Via `opencode.json` `instructions[]`

**Key features:**
- "Context Budget Guidelines" table giúp plan execution
- Verification Commands giúp agent biết commands để chạy

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/tech-stack.md`
- Tương tự `project.md` — cần extension hoặc manual paste

---

### 5. `tasks.md` (Task schema, ~120 lines, đã đọc full)

**Purpose:** Implementation tasks with per-task YAML metadata

**Schema:**
- Bead metadata
- Task Metadata (YAML): `id`, `depends_on`, `parallel`, `conflicts_with`, `files`, `estimated_minutes`
- Sections: Setup, Core Implementation, Testing, Documentation, Verification
- Each task: YAML block + checklist
- Dependency Graph (ASCII art, auto-generated)
- Notes

**Key features:**
- YAML metadata machine-readable
- Visual dependency graph
- Section organization (Setup/Implementation/Testing/Docs/Verification)
- Legend for status (Not Started/In Progress/Complete) and type (task/feature/epic/bug)

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/tasks.md`
- Dùng cho `/plan` output (Phase 2A)

---

### 6. `roadmap.md` (Phased roadmap, ~80 lines, đã đọc full)

**Purpose:** Project roadmap with phases, milestones, bead organization

**Schema:**
- Overview table: Phase, Goal, Status, Beads
- Each phase: Goal, Success Criteria, Beads (table with ID/Title/Type/Status/Depends On)
- Out of Scope (per phase)
- Dependencies (per phase)
- Legend (Status + Type)

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/roadmap.md`
- Dùng cho long-term planning

---

### 7. `user.md` (User profile, ~30 lines, đã đọc full)

**Purpose:** User identity, communication/workflow/technical preferences

**Schema:**
- Identity (name, role, git contributor identity)
- Communication Preferences (concise vs detailed, tone)
- Workflow Preferences (tools, testing habits, review style)
- Technical Preferences (languages, frameworks, patterns)
- Things to Remember (personal quirks, pet peeves)

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/user.md`
- User tự fill 1 lần, paste vào session khi muốn personalization
- Pi không có auto-inject mechanism

---

### 8. `design.md` (Design doc, ~50 lines, đã đọc full)

**Purpose:** Design document for a specific decision

**Schema:**
- Bead ID, Created, Status
- Problem Statement
- Approaches Considered (Option A, Option B with Pros/Cons)
- Chosen Approach
- Architecture (Components, Data Flow)
- Error Handling
- Testing Strategy
- Open Questions

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/design.md`
- Dùng cho design decisions trong `/plan`

---

### 9. `proposal.md` (Lightweight proposal, ~30 lines, đã đọc full)

**Purpose:** Lightweight change proposal (OpenSpec-flavored)

**Schema:**
- Bead, Author, Date
- Why (problem + why now)
- What Changes (high-level description)
- Capabilities (New / Modified)
- Impact (Users Affected, Migration Required)
- Open Questions

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/proposal.md`
- Dùng cho cross-team proposals

---

### 10. `adr.md` (Architecture Decision Record, ~50 lines, đã đọc full)

**Purpose:** ADR for long-term decisions

**Schema:**
- Status: proposed | accepted | deprecated | superseded
- Date, Context
- Context (problem, forces, constraints)
- Decision (specific answer)
- Rationale (why this over alternatives)
- Consequences (Positive / Negative)
- Alternatives Considered
- Notes

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/templates/adr.md`
- Dùng cho architectural decisions

---

## B. Context Files (2 files, ~300 lines)

### 1. `architecture.md` (đã đọc 80 lines)

**Purpose:** Layered architecture rules, dependency direction, structural enforcement

**Schema:**
- Frontmatter: `purpose`, `updated`
- 6 Layers: Instructions → Commands → Workflows → Plugins → Tools → SDK
- Dependency Rules (table: layer → can import from)
- Enforcement: via `tool/structural-check.sh`
- Principles: Plugin Isolation, No Circular Dependencies, Minimal Surface Area, File Boundaries

**Layer definitions:**
1. **Instructions:** AGENTS.md, context/, skills (markdown, self-contained)
2. **Commands:** command/ — slash commands
3. **Workflows:** workflows/ — multi-agent orchestration
4. **Plugins:** plugin/ — runtime TS plugins
5. **Tools:** tool/ — agent-available tools
6. **SDK:** plugin/sdk/ — shared types, interfaces

**File boundaries:**
- Plugin: max 300 lines
- SDK: max 150 lines
- Command: max 500 lines
- Workflow: max 150 lines

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/context/architecture.md`
- Reference doc (không auto-inject)
- Dùng khi user hỏi về architecture
- Có thể adapt cho `.pi` layers: Agents → Extensions → Skills → Templates

---

### 2. `fallow.md` (đã đọc 60 lines)

**Purpose:** Fallow CLI reference for AI agents

**Content:**
- Overview: Fallow = Rust-native, deterministic, no AI
- Commands:
  - Full: `npx fallow`, `npx fallow --format json`
  - Dead code: `npx fallow dead-code [--unused-exports|--unused-deps|--circular]`
  - Trace: `npx fallow dead-code --trace FILE:EXPORT_NAME`
  - Duplication: `npx fallow dupes [--mode strict|weak]`
  - Health: `npx fallow health`
  - Audit Gate (for CI/pre-commit)

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/context/fallow.md`
- Reference doc cho Fallow CLI (tool bên ngoài, không phụ thuộc `.pi` hay `.opencode`)

---

## C. Meta Files

### 1. `QUALITY.md` (đã đọc full)

**Purpose:** Track structural health of each domain, A/B/C/D grading

**Schema:**
- Scale table (A/B/C/D/-)
- Current Grades table: Domain | Grade | Last Checked | Issues
- How to Update (run `/gc`, manual)
- Changelog table

**Current grades (từ opencodekit):**
- Plugins (`.opencode/plugin/`): B
- Commands (`.opencode/command/`): C (4 commands > 200 lines)
- Skills (`.opencode/skill/`): B
- Docs (`.opencode/context/`): A
- Workflows (`.opencode/workflows/`): B
- Configuration (`.opencode/opencode.json`): A

**Pi porting strategy:**
- Path: `/Users/minhduydev/.pi/agent/QUALITY.md`
- Tạo mới khi run `/gc` (Phase 2A)
- Initial grades: agents A, extensions A, skills (none) —, templates (none) —

---

### 2. `.template-manifest.json` (đã đọc 20 lines)

**Purpose:** File integrity manifest với SHA-256 hashes

**Schema:**
- `version`: 0.22.0
- `createdAt`: ISO timestamp
- `files`: object mapping path → hash

**Use case:** Tamper detection, template version validation

**Pi porting strategy:** SKIP — không cần cho `.pi` (template này là open-source public, không cần integrity check).

---

## D. Auto-Injection Mechanism

### opencodekit's approach

`opencode.json` có field `instructions: []` — array of file paths to inject as system prompt:

```json
{
  "instructions": [
    "./AGENTS.md",
    "./.opencode/templates/tech-stack.md",
    "./.opencode/templates/project.md"
  ]
}
```

→ Tất cả 3 files tự động inject vào MỌI agent prompt.

### Pi's approach (hiện tại)

Pi **không có** built-in `instructions[]` mechanism. Files được load bằng:
- `read` tool (manual)
- Extensions (chỉ inject extension-specific content)
- Agent `prompt_mode: replace` (thay thế toàn bộ system prompt)

### Pi cần gì để auto-inject?

**Option A: `pi-templates` extension (recommended)**
- Đăng ký tool `load_template`
- Hook `before_agent_start` để auto-inject `tech-stack.md` + `project.md` nếu tồn tại
- Effort: 1-2 giờ

**Option B: Manual paste**
- User tự paste content vào đầu session
- Effort: 0 infrastructure
- Cons: User phải nhớ + phải update khi thay đổi

**Option C: Reference trong AGENTS.md**
- AGENTS.md nói: "Always read `.pi/agent/templates/tech-stack.md` and `.pi/agent/templates/project.md` at session start"
- Effort: 0 infrastructure
- Cons: Agent có thể quên

**Recommendation:** Option A (`pi-templates` extension) + AGENTS.md instruction (Option C) as fallback.

---

## E. Implementation Plan: Phase 1 Templates

### Step 1: Tạo thư mục

```bash
mkdir -p /Users/minhduydev/.pi/agent/templates
mkdir -p /Users/minhduydev/.pi/agent/context
```

### Step 2: Copy 10 templates

```bash
# Từ /tmp/opencodekit-template/.opencode/templates/ sang /Users/minhduydev/.pi/agent/templates/
cp /tmp/opencodekit-template/.opencode/templates/prd.md ./
cp /tmp/opencodekit-template/.opencode/templates/project.md ./
cp /tmp/opencodekit-template/.opencode/templates/state.md ./
cp /tmp/opencodekit-template/.opencode/templates/tech-stack.md ./
cp /tmp/opencodekit-template/.opencode/templates/tasks.md ./
cp /tmp/opencodekit-template/.opencode/templates/roadmap.md ./
cp /tmp/opencodekit-template/.opencode/templates/user.md ./
cp /tmp/opencodekit-template/.opencode/templates/design.md ./
cp /tmp/opencodekit-template/.opencode/templates/proposal.md ./
cp /tmp/opencodekit-template/.opencode/templates/adr.md ./
```

### Step 3: Copy 2 context files

```bash
cp /tmp/opencodekit-template/.opencode/context/architecture.md /Users/minhduydev/.pi/agent/context/
cp /tmp/opencodekit-template/.opencode/context/fallow.md /Users/minhduydev/.pi/agent/context/
```

### Step 4: Adjust frontmatter dates

Sửa tất cả `updated: 2024-12-21` → `updated: 2026-06-16` và `2026-02-01` → `2026-06-16`

### Step 5: Add load instructions to AGENTS.md

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

### Step 6: (Optional) Build `pi-templates` extension

Auto-inject `project.md` + `tech-stack.md` vào mọi session (xem Option A ở trên).

---

## F. Tổng kết

| Action | Effort | Value | Priority |
|---|---|---|---|
| Copy 10 templates + 2 context files | 30 phút | 🟢 Cao (foundation) | **Phase 1** |
| Adjust frontmatter dates + names | 15 phút | 🟢 Cao | **Phase 1** |
| Add "load templates" instruction to AGENTS.md | 15 phút | 🟢 Cao | **Phase 1** |
| Create QUALITY.md with initial grades | 30 phút | 🟡 Medium | **Phase 2A** |
| Build `pi-templates` extension (auto-inject) | 2-3 giờ | 🟡 Medium | **Phase 2A** |
| Skip `.template-manifest.json` (không cần) | 0 | — | **N/A** |

**Total Phase 1 templates effort: ~1-1.5 giờ**
