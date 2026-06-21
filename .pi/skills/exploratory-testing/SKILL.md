---
name: exploratory-testing
description: "Use when filling gaps that scripted cases miss via session-based exploratory testing — charters, timeboxes, heuristics, bug oracles — the manual QA technique that complements automated cases. Black-box: explore the running app with a charter, no code needed. Distinct from test-case-design (derives cases upfront) and playwright (tool execution); this is HUMAN-STYLE EXPLORATION an agent simulates. Load for /test --black-box or when scripted coverage feels thin."
---

# Exploratory Testing (Black-Box)

> **Scripted cases test what you thought of. Exploration finds what you didn't.** Structured by a charter, bounded by a timebox, logged as a session — not random clicking.

## When to Use

- After scripted tests pass but coverage feels thin — find the bugs no one anticipated
- Before a release — sweep the app for regressions the automated suite missed
- When the spec is incomplete or ambiguous — learn the system by exploring it
- In a new feature area where you don't yet know the failure modes well enough to script them
- As a complement to spec-based-testing and contract-testing (what the spec didn't say)
- When asked "just poke around and see if anything breaks"

## When NOT to Use

- Replacing scripted tests (exploration complements, does not replace)
- Testing regression of known, documented behavior (use scripted cases)
- Validating API contracts (use contract-testing)
- Proving requirement coverage (use spec-based-testing with RTM)
- Automated execution in CI (exploration is a human/agent activity, not a CI job)
- When the app isn't running or accessible

## Overview

Exploratory testing is **simultaneous learning, test design, and test execution** — structured by a mission (charter), bounded by a time limit (timebox), and captured in a log (session sheet). It is the opposite of random testing: every action answers a question about the system.

**Core principle:** A charter gives direction, a timebox forces focus, and a session sheet makes discovery auditable. Without all three, it's just clicking around.

## What Exploratory Testing Is (and Isn't)

| Is | Is Not |
|----|--------|
| Simultaneous learning + design + execution | Random clicking |
| Guided by a written charter | Unstructured "poke around" |
| Bounded by a timebox (60–90 min) | An infinite session |
| Logged findings with evidence | "I'll remember what I found" |
| Targeting risk areas | Covering every feature equally |
| Reactive discovery of unknown unknowns | Executing pre-scripted steps |
| Auditable via session sheets | Unrepeatable magic |

## Session-Based Test Management (SBTM)

### Charter Format

```
Explore <target area> with <resources/techniques> to discover <information/bugs>
```

| Component | Description | Example |
|-----------|-------------|---------|
| Target | What part of the system? | "Explore the checkout flow" |
| Resources | What data, tools, techniques? | "with a discount code, expired coupon, and international address" |
| Mission | What are you looking for? | "to discover edge cases in price calculation and error handling" |

**Full example:** "Explore bulk user import with 1 row, 10,000 rows, and duplicate emails to discover how the system handles limits, performance degradation, and validation errors."

### Timebox

**Standard:** 60–90 minutes per session. Shorter (30 min) for narrow charters. The timebox forces prioritization — if there's more to explore, write a follow-up charter.

### Session Sheet

| Field | Example |
|-------|---------|
| **Charter** | Explore checkout with discount codes, expired coupons, international addresses |
| **Tester** | QA Engineer |
| **Date** | 2026-06-20 |
| **Start** | 10:00 |
| **End** | 11:15 |
| **Duration** | 75 min |
| **Areas covered** | Cart → Discount input → Address form → Payment → Confirmation |
| **Bugs found** | 3 (see below) |
| **Issues/questions** | 2 |
| **Data used** | Coupon "SAVE20", expired "OLD10", UK address, US address |
| **Session notes** | Applied valid coupon → discount shown in cart summary. Applied expired → no error shown, coupon silently ignored. International address zip validation too strict — UK postcode rejected. |
| **Next charter** | Explore checkout with payment failures (declined card, timeout, insufficient funds) |

#### Bug Entry Format

```
[B-01] Expired coupon silently ignored — no error shown to user
Steps: 1. Add item to cart 2. Apply expired coupon "OLD10"
Expected: Error "Coupon has expired"
Actual: No feedback, coupon field clears silently
Severity: Medium
Evidence: /tmp/checkout-expired-coupon.png
```

## Heuristics for Exploration

Heuristics are mental shortcuts that guide what to probe. They do not guarantee finding bugs — they increase the probability.

### SFDIPOT (Structure, Function, Data, Interfaces, Platform, Operations, Time)

| Letter | Heuristic | What to Probe |
|--------|-----------|---------------|
| **S** — Structure | Parts, configuration, physical layout | What components make up this feature? Can I reconfigure them? |
| **F** — Function | What it does, what it should do | Does it perform the stated function? Does it do things it shouldn't? |
| **D** — Data | Inputs, outputs, data flow, data formats | What happens with empty data? Very large data? Special characters? |
| **I** — Interfaces | Points of connection between components | What happens when a connected service is down? Slow? Returns unexpected data? |
| **P** — Platform | OS, browser, device, dependencies | Does it work across browsers? On mobile viewport? Offline? |
| **O** — Operations | How the system is used, maintained, deployed | What happens under load? During deployment? After restart? |
| **T** — Time | Timing, sequences, concurrency, deadlines | What happens when actions happen too fast? Too slow? Out of order? |

### FEW HICCUPPS

| Letter | Heuristic | What to Probe |
|--------|-----------|---------------|
| **F** — Feature-compliant | Does it do what it's supposed to? | Run happy path. Then break it. |
| **E** — Expected | Does reasonable behavior work? | What would a normal user expect here? |
| **W** — What-if | What about unusual situations? | "What if the network drops mid-request?" |
| **H** — History | Past bugs, similar features | Have similar features had bugs? Check the bug tracker. |
| **I** — Image | Reputation, brand consistency | Does this feel consistent with the rest of the app? |
| **C** — Claims | Documentation, help text, marketing | Does the help text match actual behavior? |
| **C** — Comparisons | Comparable products, competitive features | Does competitor X handle this better? Is the difference a bug? |
| **U** — User expectations | What would a user assume? | Would a user expect "Save" to persist immediately? Does it? |
| **P** — Purpose | Why does this feature exist? | If this feature fails, what's the user's real loss? |
| **P** — Pertinent standards | Legal, regulatory, accessibility | Does it violate a standard (GDPR, WCAG, PCI)? |
| **S** — Scalability| Edges of capacity | What happens at max, above max, near max load? |

## Bug Oracles (How to Recognize a Bug Without a Spec)

When there is no formal spec, these oracles tell you something is wrong:

| Oracle | Question | Bug Signal |
|--------|----------|------------|
| **Consistency** | Does this behavior match the rest of the app? | "Delete" asks for confirmation everywhere EXCEPT here |
| **Error messages** | Does the error make sense to a user? | "Error code 0x89F2" is not a user message |
| **Performance feel** | Does this feel slower than similar operations? | Exporting 10 items takes 10 seconds |
| **Data integrity** | Is data preserved correctly round-trip? | Save a record, reload, fields are missing or different |
| **State inconsistency** | Does the UI state match the data state? | "Cancelled" order shows "Shipped" badge for 1 second |
| **User confusion** | Would a reasonable user be confused here? | Two buttons labeled "Save" that do different things |
| **Comparison to prior version** | Did the old version do this differently/better? | v2 removed the "Edit" button that v1 had |
| **Platform convention violation** | Does it break platform norms? | macOS app that doesn't support Cmd+Z |
| **Loss of data** | Is data silently lost or truncated? | CSV import truncates the last row with no warning |
| **Security feel** | Does this feel exposed? | Password sent in URL query parameter (visible in logs) |

## Charter Design

| Trigger | Example Charter |
|---------|----------------|
| **New feature** | "Explore the file upload feature with various file types (PDF, image, .exe, 0-byte, 2GB) to discover validation gaps and error handling issues" |
| **Change in existing area** | "Explore the search results page after the pagination redesign, with 0, 1, and 500 results, to discover layout breaks and state bugs" |
| **Complex workflow** | "Explore the multi-step onboarding wizard using back/forward navigation, partial completion, and session expiry to discover state consistency bugs" |
| **Integration point** | "Explore the payment webhook handler with delayed responses, duplicate notifications, and invalid signatures to discover idempotency and validation gaps" |
| **Risk area** | "Explore the admin user-deletion flow with an account that has active subscriptions, team memberships, and pending invoices to discover data integrity issues" |
| **Competitor comparison** | "Explore the drag-and-drop kanban board compared to Trello to discover missing interactions and UX friction points" |
| **Previous bug cluster** | "Explore the date-range filter which had 3 bugs last release, using leap years, timezone boundaries, and date ranges spanning DST transitions" |

### Charter Evaluation

| Good Charter | Bad Charter |
|-------------|-------------|
| "Explore checkout with discount codes..." | "Test the checkout page" |
| Specific target, technique, mission | Vague area, no direction |
| Bounded scope | "Explore the entire application" |
| Produces a clear session sheet | "I'll see what I find" |

## Logging + Evidence

Every finding must be logged with evidence. A session without a log did not happen.

| Finding Type | Evidence Required |
|-------------|-------------------|
| Visual defect | Screenshot with annotation |
| Functional bug | Steps to reproduce + actual vs expected |
| Error/console issue | Console log or network capture |
| Performance anomaly | Timestamp + observed duration |
| State inconsistency | Screenshots showing before/after, or network payload |
| Question/unclear behavior | Description of what was expected vs observed |

**Tooling reference:** Use playwright (CLI or MCP) for screenshots, console capture, and network request logging. Use chrome-devtools for DOM inspection and contrast checking. See playwright and chrome-devtools skills for execution details.

## Agent-Executed Exploration

When an agent simulates exploratory testing:

1. **Pick a charter** — target the riskiest or least-tested area
2. **Set a timebox** — translate to a concrete number of interactions or pages
3. **Explore via Playwright CLI** — navigate, interact, observe
4. **Log findings** — document charter, steps, actual vs expected, attach screenshots
5. **Evaluate** — did you find bugs? What's the next charter?

**Limitation:** Agent exploration is bounded by its heuristics and cannot replicate the intuition, domain knowledge, or serendipity of a human tester. Use agent exploration for broad-surface sweeps; escalate subtle or domain-specific findings for human review.

### Agent Session Template

```
## Exploration Session

**Charter:** [from trigger + target]

**Timebox:** [N interactions or N minutes simulated]

**Areas Probed:**
- [area 1]
- [area 2]

**Findings:**

| # | Area | Steps | Actual | Expected | Severity | Evidence |
|---|------|-------|--------|----------|----------|----------|
| 1 | ... | ...  | ...    | ...      | ...      | ...      |

**Questions Raised:**
- [question]

**Next Charter:**
- [charter]
```

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "Exploratory testing is just random clicking" | Structured by charter + timebox + heuristics. Every action answers a question. Random clicking doesn't log or learn. |
| "We have 100% scripted coverage, no need" | Scripted cases test what you thought of. Exploration finds what you didn't — edge cases, state bugs, integration gaps the scripted suite missed. |
| "It's not repeatable so it's not real testing" | Session sheets make it auditable. Repeatability isn't the goal; discovering unknown unknowns is. |
| "I'll explore as part of running the scripted tests" | Exploration needs its own charter and timebox. Piggybacking on scripted execution skips the discovery mindset. |
| "Charters are overhead, I know what to test" | A written charter forces you to articulate your mission. Without it, you drift. |
| "I don't need to log — I'll remember what I found" | You won't. Log as you go. A finding without evidence didn't happen. |
| "Exploratory testing is only for manual QA" | Agents can execute exploration too — bounded by heuristics, logged via session templates. Human + agent exploration is better than either alone. |

## Red Flags

- Exploration without a written charter — drifting, not exploring
- Session with no log or evidence — findings lost
- No timebox — infinite exploration yields diminishing returns
- Only happy-path exploration — you're not probing edges
- Findings without screenshots or network evidence — unverifiable
- Sessions that always end with zero bugs — you're not probing hard enough
- Testing the same area every session — avoid comfort zones
- Using "exploratory" as a label for unstructured bug hunting after scripted tests
- Agent exploration that just clicks links without logging observations

## Verification

- [ ] Each exploration session has a written charter (target, approach, mission)
- [ ] Timebox set and respected (60–90 min standard)
- [ ] Session sheet completed: charter, areas covered, bugs found, evidence links, next charter
- [ ] Heuristics applied: SFDIPOT or FEW HICCUPPS guided the exploration (not random)
- [ ] Every finding has evidence: screenshot, console capture, or network log
- [ ] At least one non-happy-path finding attempted (empty states, error paths, boundary conditions)
- [ ] Findings are triaged: severity assigned, bugs filed, questions documented
- [ ] Next charter written to follow up on discovered issues or probe adjacent risk areas
- [ ] Scripted test gaps identified from exploration findings — feed back into test-case-design
- [ ] Agent exploration sessions follow the structured template with limitation noted

## Skill Result Contract

```xml
<skill_result>
  <skill>exploratory-testing</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Session sheets with charters, timeboxes, findings, and evidence artifacts</evidence>
  <artifacts>Session logs with bug entries and screenshots, next-charter queue, scripted-test gap list</artifacts>
  <risks>Exploration bounded by tester/agent heuristics — subtle domain bugs may require human expertise; findings are qualitative, not quantitative coverage</risks>
</skill_result>
```

## See Also

- **test-case-design** — Scripted cases that exploration complements; feed exploration findings back to improve case design
- **spec-based-testing** — RTM from the spec; exploration targets areas the spec didn't anticipate
- **contract-testing** — API conformance from spec; exploration probes state/sequence bugs contract tests miss
- **playwright** — Tool for screenshots, console log capture, network request logging during exploration
- **chrome-devtools** — Tool for DOM inspection, network throttling, console debugging during sessions
- **browser-testing-with-devtools** — Real-time browser inspection during exploratory sessions
- **production-hardening** — Edge cases (empty states, errors, loading) that exploration targets
