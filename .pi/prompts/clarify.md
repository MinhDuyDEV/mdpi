---
description: Discuss, clarify, and stress-test a vague idea into a hardened spec
argument-hint: "[<topic>] [--grill] [--spec <path>] [--dry-run] [--help]"
---

# Clarify: $ARGUMENTS

Orchestrate the full Define-phase discussion pipeline — extract intent, explore options, adversarially stress-test, and write a hardened spec. One command, five sequenced skills, one artifact.

> **Workflow:** `/init` → **`/clarify`** (vague/complex ask) **or** `/create` (clear ask) → `/plan` → `/ship`
>
> **When to use:** The ask is vague, underspecified, high-stakes, or you need to discuss and clarify many things before a spec exists. Skip for clear/mechanical asks — use `/create` instead.

## Parse Arguments

| Argument      | Default  | Description                                                  |
| ------------- | -------- | ------------------------------------------------------------ |
| `<topic>`     | optional | What to discuss/clarify (quoted string)                      |
| `--grill`     | false    | Skip exploration; enter adversarial phase on an existing idea |
| `--spec <path>` | false  | Stress-test an existing spec/ADR/PRD document at `<path>`    |
| `--dry-run`   | false    | Preview the discussion plan and entry routing without writing |
| `--help`      | false    | Show this usage                                              |

If `<topic>` is omitted, open with: *"What would you like to clarify?"* and run Phase 2 from a blank slate.

## Guard Phase

Before discussing:
- Check `.pi/artifacts/.active` — if an active slug exists with `spec.md`, ask: **continue/refine** the existing spec, or **start new**?
- Check `git status --porcelain` — if uncommitted changes, ask: stash, commit, or continue?
- `vcc_recall` for prior session decisions on this topic — avoid re-exploring rejected approaches
- `memory_search({ project: "<active slug or empty>" })` for durable prior decisions across sessions

## Load Skills (Sequenced Orchestration)

This command **sequences** skills — each hands off to the next at an explicit gate. Do **not** load all at once; load a skill only when its phase opens.

| Skill                       | Phase  | Trigger                                   | Role                                                       |
| --------------------------- | ------ | ----------------------------------------- | ---------------------------------------------------------- |
| `interview-me`              | 2      | Ask missing who/why/success/constraint    | Extract real intent, one question at a time, w/ guesses   |
| `brainstorming`             | 3a     | Intent clear, need options/trade-offs     | Collaborative exploration, 2-3 approaches                  |
| `idea-refine`               | 3b     | Need structured divergent→convergent      | One-pager: direction + assumptions + Not Doing list        |
| `grill-me`                  | 4      | Refined direction exists                  | Adversarial interrogation — destroy weak options           |
| `doubt-driven-development`  | 5      | High-stakes / unfamiliar / irreversible   | Optional fresh-context adversarial review                  |
| `spec-driven-development`   | 6      | Idea hardened, blockers resolved          | Write `spec.md` via locked SPECIFY gate                    |
| `source-driven-development` | 3-4    | Touching unfamiliar tech/API               | Ground decisions in official docs/source                   |
| `dcp-hygiene`               | Report | Compress closed exploration work-stream   | Keep context bounded when `compress` is available          |

## Entry Routing

Detect where the user is starting and enter at the right phase. Do not force everyone through Phase 2.

| Signal in the ask                                 | Entry phase                  |
| ------------------------------------------------- | ---------------------------- |
| "build me X" with no who / why / success / constraint | **Phase 2** (interview-me)   |
| Rough idea, but missing options and trade-offs    | **Phase 3** (brainstorming)  |
| Existing idea/ADR/PRD to stress-test              | **Phase 4** (grill-me)       |
| `--grill` flag                                    | **Phase 4** directly         |
| `--spec <path>` flag                              | **Phase 4** grill-with-docs on that file |
| Clear, bounded ask                                | **Exit**: tell user to run `/create` instead |

If routing is ambiguous, ask the user one question: *"Do you want to explore what to build, or stress-test an idea you already have?"*

## Phase 1: Entry Assessment

1. Read the topic + any referenced docs + relevant repo context (`semantic_query` for related patterns, `vcc_recall` for prior decisions).
2. Write a one-line **HYPOTHESIS** with a confidence number (per `interview-me` Step 1), even if entering at Phase 3+. This surfaces your starting assumption visibly.
3. Determine entry phase from the table above. Announce: *"Entering at Phase N because [signal]."*
4. If `--dry-run`: report the entry phase + planned skill sequence + estimated turns, then stop.

## Phase 2: Intent Extraction (`interview-me`)

Load `interview-me`. Run its 5-step process:

1. **HYPOTHESIS + CONFIDENCE** (already drafted in Phase 1; refine if needed)
2. **Ask one question at a time, each with a GUESS attached** — never batch
3. **Listen for want-vs-should-want** — probe sophistication-signaling answers ("scalable", "modern", "clean") with: *"If you didn't have to justify this to anyone, what would you actually want?"*
4. **Restate intent** in the user's words: Outcome / User / Why now / Success / Constraint / **Out of scope**
5. **Confirm with an explicit yes** — "whatever you think" / "sounds good" / silence are NOT yes

**Stop when** you can predict the user's reaction to the next three questions (the 95% confidence test). Then hand off to Phase 3.

**Blocker rule:** if the user cannot answer a foundational question, flag it as a blocker — do not proceed to spec.

## Phase 3: Exploration & Refinement (`brainstorming` → `idea-refine`)

### 3a: Collaborative Exploration (`brainstorming`)

Load `brainstorming`. One question at a time (multiple choice preferred). Generate **2-3 distinct approaches** with explicit trade-offs. Lead with your recommendation + reasoning. YAGNI ruthlessly.

If running inside a codebase, ground options in real patterns — cite `file:line` for existing architecture that constrains the design.

### 3b: Structured Converge (`idea-refine`)

If the idea needs a structured artifact (most non-trivial cases), load `idea-refine` and run its 3 phases:

- **Divergent:** restate as a "How Might We", 5-8 idea variations via lenses (inversion, constraint removal, audience shift, simplification, 10x, expert lens)
- **Converge:** cluster into 2-3 directions, stress-test on user value / feasibility / differentiation, **surface hidden assumptions** (what you're betting is true, what could kill it, what you're ignoring)
- **Sharpen:** produce a one-pager: Problem Statement · Recommended Direction · Key Assumptions · MVP Scope · **Not Doing** (the most valuable part)

Be honest, not supportive. A good ideation partner is not a yes-machine — push back on weak ideas with specificity.

**Gate:** user confirms the chosen direction before Phase 4.

## Phase 4: Adversarial Stress-Test (`grill-me`)

Load `grill-me`. This is adversarial, not collaborative. Do not be polite. Interrogate the refined direction across all five categories:

| Category               | Push on                                                      |
| ---------------------- | ------------------------------------------------------------ |
| **Ambiguity**          | Terms that could mean different things; concrete behavior examples |
| **Hidden assumptions** | What this assumes about the system, users, data, failure modes, team capacity |
| **Missing constraints** | Implicit perf/security/compat/observability constraints; codebase patterns that bind |
| **Hand-waving**        | "We'll figure that out later"; "obviously" / "simply" / "just" statements; the hardest part |
| **Integration & blast radius** | Existing code touched; what breaks on deploy; tests/docs that change |

For each question: present with a concrete example → let the user answer → record the resolution. Unanswerable questions become **blockers**, not "we'll fix it later."

**If `--spec <path>`:** apply the same interrogation to the document content and propose concrete edits for each gap.

**Stop when** questions start repeating or precision stops changing the plan. Then assess:
- Ready to proceed? → Phase 5 (optional) then Phase 6
- Fundamentally flawed? → say so directly, suggest alternatives, stop
- Too many unresolved? → recommend another Phase 3 round or `/research`, stop

## Phase 5: Fresh-Context Doubt (`doubt-driven-development`, optional)

**Triggered only when** the decision is non-trivial per `doubt-driven-development`'s definition: crosses module boundaries, asserts unverifiable properties, or has irreversible blast radius. Skip for ordinary decisions — doubting every keystroke ships nothing.

1. **CLAIM** — name the decision in 2-3 lines + why it matters
2. **EXTRACT** — smallest reviewable unit (artifact + contract, stripped of your reasoning)
3. **DOUBT** — spawn `review` subagent with an **adversarial** prompt ("find issues", not "is it good"). Pass ARTIFACT + CONTRACT only, **never the CLAIM**
4. **RECONCILE** — classify each finding: contract misread → valid+actionable → valid trade-off → noise. Re-read the artifact before classifying; don't rubber-stamp
5. **STOP** — trivial findings, 3 cycles, or user override

**Cross-model:** in interactive mode, always **offer** a second opinion (Gemini CLI / Codex CLI / manual / skip). Never silently skip. Each external CLI invocation needs explicit user authorization.

> **Note:** do not run `doubt-driven-development` from inside a subagent (no nested doubt). The main session orchestrates.

## Phase 6: Write Spec (`spec-driven-development`)

Load `spec-driven-development`. Run its **SPECIFY** gate using everything hardened in Phases 2-5:

1. State the goal as an **outcome**, not a task
2. **Establish vocabulary** — every concept has one name, mapped to exactly one code symbol (ubiquitous language)
3. Derive **3-7 observable truths** from the user's perspective
4. Identify **constraints**: technical, UX, security, performance, compatibility
5. Define **non-goals** explicitly (pull from `idea-refine`'s "Not Doing" list)
6. List **affected surfaces**: files, APIs, commands, UI, data models
7. **Check vocabulary consistency** — no overloaded terms, no synonyms
8. Reframe instructions as **success criteria** ("X is true when…", with a `Verify:` command)
9. Define the **three-tier boundaries**: always do / ask first / never do

**Gate:** spec approved by the user, or assumptions explicitly accepted.

Choose PRD rigor from the same signals `/create` uses:

| Signal                          | Lite PRD | Full PRD |
| ------------------------------- | -------- | -------- |
| Scope                           | Single-concern | Cross-cutting |
| Files affected                  | 1-3      | 4+       |
| Logic complexity                | Low      | High (multi-step, stateful) |
| Discussion depth (this session) | Phase 2-3 only | Phase 4-5 ran |

Use `.pi/templates/prd.md` for Full; the Lite format from `/create` for simple cases.

**Validate before saving** (per `/create` Phase 5):
- No placeholder text remaining
- Success criteria include `Verify:` commands
- Technical context references real `src/` paths
- No implementation code in the spec
- No unresolved `[NEEDS CLARIFICATION]` markers — if any, return to Phase 2 or 4

## Phase 7: Workspace & Report

### Workspace (minimal)

`/clarify` does **not** create a branch or install deps — that's `/create`'s territory. It only sets up what downstream commands need:

```bash
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
mkdir -p ".pi/artifacts/$SLUG"
echo "$SLUG" > ".pi/artifacts/.active"
```

Write the spec to `.pi/artifacts/$SLUG/spec.md`. Optionally save the `idea-refine` one-pager to `.pi/artifacts/$SLUG/design.md` if the user wants the discussion trail preserved.

> **DCP hygiene:** if `compress` is available, compress the closed Phase 2-5 exploration work-stream per the `dcp-hygiene` skill — the hardened decisions are captured in `spec.md`. Skip if unavailable.

### Report

1. **Entry phase** + rationale (where the discussion started)
2. **Skills run** — which phases executed, which were skipped
3. **Key decisions** — direction chosen, assumptions hardened, ideas killed
4. **Blockers** — unresolved questions, if any (with flags)
5. **Spec:** Lite or Full, success criteria count, affected files count
6. **Doubt cycle** — ran/skipped, findings classification summary (if ran)
7. **Artifact location:** `.pi/artifacts/$SLUG/spec.md`
8. **Next step:** `/plan` (complex → produces `plan.md` + `tasks.json`) or `/ship` (simple Lite → derives `tasks.json` on the fly). If the user wants full workspace setup (branch + deps), suggest `/create` with the now-hardened topic.

## Stop Conditions

- User confirms spec at the SPECIFY gate → write spec, report, stop
- `interview-me` blocker unresolved → stop, flag blocker, do not write spec
- `grill-me` assesses idea as fundamentally flawed → say so, stop, do not write spec
- Verification/validation fails 2x on same approach → stop, escalate
- `--dry-run` → report plan, stop before any writing

## Failure Handling

| Scenario                              | Action                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| Active spec already exists            | Ask: continue/refine existing, or start new?                        |
| `interview-me` can't reach 95% conf.  | Stop after several rounds, tell user something foundational is missing |
| `grill-me` produces a kill verdict    | Report why, suggest alternatives, do not write spec                 |
| `doubt-driven-development` 3 unresolved cycles | Surface to user — artifact may not be ready              |
| Spec validation fails                 | Fix inline, re-validate, max 2 retries; then return to Phase 2/4    |
| External CLI missing/errors (Phase 5) | Surface failure, let user redirect; never silently fall back        |

## Related Commands

| Need                                  | Command     |
| ------------------------------------- | ----------- |
| Fast path for a clear ask (+ branch)  | `/create`   |
| Detail tasks from the spec            | `/plan`     |
| Execute the spec                      | `/ship`     |
| Need external info mid-discussion      | `/research` |

## Related Skills

- `interview-me` — Phase 2 intent extraction (one question + guess at a time)
- `brainstorming` — Phase 3a collaborative exploration (2-3 approaches)
- `idea-refine` — Phase 3b structured divergent/convergent (one-pager + Not Doing)
- `grill-me` — Phase 4 adversarial interrogation (destroy weak options)
- `doubt-driven-development` — Phase 5 fresh-context review (high-stakes only)
- `spec-driven-development` — Phase 6 spec writing (SPECIFY gate + vocabulary)
- `source-driven-development` — ground decisions in official docs (Phases 3-4)
- `dcp-hygiene` — compress closed exploration work-stream at report
