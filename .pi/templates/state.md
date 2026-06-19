---
purpose: Current project state, active decisions, blockers, and position tracking
updated: <auto — last modified>
---

# State

## Project Mode

<!-- Auto-injected every turn via templates-injector. Set during /init. -->
**Mode:** greenfield | brownfield | mixed
<!-- greenfield = no deployed consumers; skip backwards-compat layers, version prefixes, legacy handlers on day one -->
<!-- brownfield = deployed consumers exist; run semantic_inspect callers/callees before any rename/delete to prove unreferenced; conform to existing conventions -->
<!-- mixed = some subsystems new, some existing; state the mode per-task in the first sentence -->

## Current Position

<!-- Where are we right now? What just happened? -->

**Active Feature:** <slug> - [Title]
**Status:** [In Progress / Blocked / Review]
**Started:** [Date]
**Phase:** [Phase name from roadmap.md]

## Recent Completed Work

<!-- Last 3-5 completed tasks -->

| Feature | Title   | Completed | Summary            |
| ------ | ------- | --------- | ------------------ |
| <slug> | [Title] | [Date]    | [One-line summary] |
| <slug> | [Title] | [Date]    | [One-line summary] |

## Active Decisions

<!-- Decisions made that affect current and future work -->

| Date   | Decision           | Rationale | Impact            |
| ------ | ------------------ | --------- | ----------------- |
| [Date] | [What was decided] | [Why]     | [What it affects] |

## Blockers

<!-- What's preventing progress? -->

| Feature | Blocker                  | Since  | Owner               |
| ------ | ------------------------ | ------ | ------------------- |
| <slug> | [Description of blocker] | [Date] | [Who's responsible] |

## Open Questions

<!-- Questions that need answers before proceeding -->

| Question   | Context            | Blocking | Priority       |
| ---------- | ------------------ | -------- | -------------- |
| [Question] | [Where it came up] | [Yes/No] | [High/Med/Low] |

## Context Notes

<!-- Important context that doesn't fit elsewhere -->

### Technical

- [Technical decision or constraint]
- [Pattern or convention established]

### Product

- [Product decision or direction]
- [User feedback or requirement]

### Process

- [Workflow change or improvement]
- [Team agreement or process]

## Next Actions

<!-- Immediate next steps -->

1. [ ] [Action item with owner if applicable]
2. [ ] [Action item]
3. [ ] [Action item]

## Session Handoff

<!-- For multi-session work, what's the state for the next session? -->

**Last Session:** [Date]
**Next Session Priority:** [What's most important to do next]
**Known Issues:** [Any issues to be aware of]
**Context Links:** [Relevant files, PRs, docs]

---

_Update this file at the end of each significant session or when state changes._
_This file is the "you are here" marker for the project._
