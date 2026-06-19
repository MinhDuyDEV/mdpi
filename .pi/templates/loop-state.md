---
purpose: Human-readable working memory + dedup ledger mirror for one loop
updated: <auto — last modified>
---

# Loop State

<!--
  Human-readable mirror of STATE.json. The machine ledger (STATE.json) is
  authoritative for dedup; this file is for humans reading the loop's history.
  Keep them in sync — the orchestrator writes STATE.json; update this file when
  you review.
-->

**Loop name:** `<loop-name>`
**Owner:** `[Owner]`
**Cadence:** `[cron expression or "manual"]`

---

## Last run

<!-- When did the loop last execute, and what happened. -->

| Field     | Value                          |
| --------- | ------------------------------ |
| Timestamp | `[ISO-8601 or null]`           |
| Status    | `[pass / fail / killed / no-op]` |
| Duration  | `[seconds]`                    |
| Items     | `[count processed this run]`  |
| Tokens    | `[tokens used this run]`      |

## In progress

<!-- Items the loop is currently working on. Empty if idle. -->

| Item ID | Type | Started | Note |
| ------- | ---- | ------- | ---- |
| `<id>` | `[ci-run / pr / package@version / commit-sha]` | `[ISO-8601]` | `[note]` |

## Completed

<!-- Items the loop finished this cycle (subset of Processed items below). -->

| Item ID | Type | Completed | Outcome |
| ------- | ---- | --------- | ------- |
| `<id>` | `[type]` | `[ISO-8601]` | `[fixed / skipped / escalated / rejected]` |

## Escalated

<!-- Items the loop could not handle autonomously and escalated to a human. -->

| Item ID | Type | Escalated | Reason |
| ------- | ---- | --------- | ------ |
| `<id>` | `[type]` | `[ISO-8601]` | `[why the loop could not act]` |

## Lessons learned

<!-- Durable lessons from prior runs. One line each; link to STATE.json.lessons[]. -->

- `[Date]` — `[Lesson text]`
- `[Date]` — `[Lesson text]`

## Processed items

<!--
  Dedup ledger. Keyed by STABLE item IDs so re-running the orchestrator on an
  already-processed item skips it (idempotent). Stable ID forms:
    - CI run ID           e.g. `ci:12345678901`
    - PR number           e.g. `pr:42`
    - package@version     e.g. `pkg:lodash@4.17.21`
    - commit SHA          e.g. `sha:abc1234`
  Deleting STATE.json reprocesses everything.
-->

| Item ID | Type | First seen | Last status | Retries |
| ------- | ---- | ---------- | ----------- | ------- |
| `<stable-id>` | `[ci-run / pr / package / commit]` | `[ISO-8601]` | `[fixed / skipped / failed / escalated]` | `[n]` |

## Stop conditions met

<!-- Boolean flags from the VISION.md "Hard stops" list. All false = safe to run. -->

| Stop condition | Met? |
| -------------- | ---- |
| Token budget exceeded | `[yes / no]` |
| Protected path modified | `[yes / no]` |
| Item already processed | `[yes / no]` |
| `gh` not authenticated | `[yes / no]` |
| Gate command missing/unparseable | `[yes / no]` |

---

<!--
  This file is a mirror. The machine ledger (STATE.json) is the source of
  truth for dedup and idempotence. Update this file when reviewing run history;
  the orchestrator does not need to write here.
-->