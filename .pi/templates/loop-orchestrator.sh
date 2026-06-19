#!/usr/bin/env bash
#
# loop-orchestrator.sh — Portable bash orchestrator for the pi loop-engineering harness.
#
# Mirrors loop-orchestrator.ts (T9, Node SDK primary). This is the portable
# alternative for cron/launchd/systemd where the Node SDK runtime is not
# desirable. Composes native pi capabilities: `pi -p --tools ... --no-session
# -a "<prompt>"` (capability-deprivation — the maker structurally cannot ship),
# git worktree isolation (parallel loops never collide), an exit-code gate
# (computational, never an LLM's opinion), dedup state (jq), and ship-on-pass
# (push branch `loop/<name>/<ts>` + `gh pr create`).
#
# GRACEFUL DEGRADATION (FR10): `set -uo pipefail` — NOT `-e`. A loop failure is
# logged + recorded in STATE.json + the scheduler continues. This script never
# aborts the scheduler on a loop failure; only on misuse (bad args / missing
# VISION.md) does it `exit 1` *before* any loop work begins (arg/config errors
# are operator errors, not loop failures). All loop-phase failures are
# captured and recorded, then the script exits 0.
#
# GATE-PARSE CONTRACT (must match T2's loop-vision.md exactly):
#   The gate command is extracted from `.pi/loops/<name>/VISION.md`:
#   THE FIRST fenced ```bash block located DIRECTLY UNDER the `## Gate`
#   heading. Extraction: find the `## Gate` heading line, scan forward to the
#   first opening fence line whose info-string is `bash` (i.e. a line equal to
#   ```bash), take every line until the next closing fence (a line equal to
#   ```), strip leading/trailing whitespace, run via `bash -c "<command>"`,
#   read the exit code.
#     exit 0   -> PASS  -> ship (push `loop/<name>/<ts>` + `gh pr create`)
#     non-zero -> FAIL  -> no ship; record in STATE.json.failures[]; cleanup
#   The gate decision is computational (exit code), never an LLM's opinion
#   (avoids the Ralph Wiggum loop). Keep exactly ONE ```bash block directly
#   under `## Gate` in VISION.md.
#
# IDEMPOTENCE (FR9): an item already in STATE.json.processed is skipped
# (NOTHING_TO_DO). Re-running is always safe; deleting STATE.json reprocesses.
#
# PHASES (each logs INFO/WARN/ERROR with instance id + duration):
#   A. parse args → resolve loop dir + repo root
#   B. load VISION.md gate (parse contract above) → GATE_CMD
#   C. git worktree add --detach <tmp> HEAD; run maker `pi -p` (cwd in worktree)
#   D. (BUDGET-CAP HOOK POINT — T13 fills this; see PHASE D block below)
#   E. run gate via `bash -c "$GATE_CMD"`; capture $?
#   F. on 0: git push -u origin loop/<name>/<ts> + gh pr create
#   G. jq update STATE.json (processed/failures/metrics)
#   H. git worktree remove --force (trap-registered for cleanup on exit)
#
# Usage:
#   loop-orchestrator.sh run-once <loop-name> [repo-root] [item-id]
#   loop-orchestrator.sh run-once ci-triage .        # process newest item
#   loop-orchestrator.sh run-once ci-triage . 12345 # process item 12345
#
# Requires: pi (CLI), git, gh (authenticated, for PR ship; falls back to
# commit-only/log if absent), jq. API key in env or CI secrets.
#
# -----------------------------------------------------------------------------

set -uo pipefail

# =============================================================================
# CONFIG BLOCK (mirror of T9's loop-orchestrator.ts config block)
# =============================================================================
# LOOP_NAME   — set from argv[1]; the .pi/loops/<name>/ directory to run.
# GATE        — auto-loaded from .pi/loops/<name>/VISION.md (see parse_gate).
# REPO_ROOT   — set from argv[2] (default: PWD); where `git worktree` runs.
# TOKEN_CAP   — placeholder; T13 (budget cap) will fill this. When non-null and
#               the maker's `--mode json` token usage exceeds it, the loop is
#               killed and the kill is recorded in STATE.json.metrics.killed.
# MAKER_TOOLS — capability-deprivation allowlist (FR6). Maker CANNOT call
#               push/PR/Slack/etc — they are not in this list. Maker only
#               stages files in the worktree; the orchestrator ships on pass.
# LOOP_DIR    — resolved .pi/loops/<LOOP_NAME>/ (vision + state live here).
# VISION_FILE — .pi/loops/<LOOP_NAME>/VISION.md (the anti goal-drift contract).
# STATE_FILE  — .pi/loops/<LOOP_NAME>/STATE.json (the dedup + metrics ledger).
# INSTANCE_ID — per-invocation unique id for log correlation (date + pid).
# MAKER_PROMPT_FN — build_maker_prompt() (single source of truth, see below).
LOOP_NAME="${LOOP_NAME:-}"
GATE="${GATE:-}"
REPO_ROOT="${REPO_ROOT:-}"
TOKEN_CAP="${TOKEN_CAP:-}"          # BUDGET-CAP HOOK (T13): set to enforce cap.
MAKER_TOOLS="read,edit,write,bash,grep,find"
LOOP_DIR=""
VISION_FILE=""
STATE_FILE=""
INSTANCE_ID=""
ITEM_ID=""
WORKTREE_DIR=""
ACTION=""
GIT_BRANCH=""
PR_URL=""
START_EPOCH=0

# =============================================================================
# LOGGING — INFO/WARN/ERROR with instance id + phase + duration
# =============================================================================
_log() {
    # $1=LEVEL $2=phase $3=message
    local level="$1" phase="$2" msg="$3"
    local now dur
    now="$(date +%s)"
    dur=$((now - START_EPOCH))
    printf '%s [%s] instance=%s phase=%s dur=%ss — %s\n' \
        "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$level" "$INSTANCE_ID" "$phase" "$dur" "$msg" >&2
}
log_info()  { _log INFO  "$1" "$2"; }
log_warn()  { _log WARN  "$1" "$2"; }
log_error() { _log ERROR "$1" "$2"; }

# =============================================================================
# MAKER PROMPT — single function (kept identical in spirit to T9)
# =============================================================================
# Constructs the prompt passed to `pi -p -a "<prompt>"`. The maker is told to
# reread VISION.md, stay in scope, stage changes in the worktree (no ship —
# the orchestrator ships after the gate passes), and write a PR_BODY.md.
build_maker_prompt() {
    cat <<EOF
You are the MAKER phase of loop "$LOOP_NAME" (instance $INSTANCE_ID, item "$ITEM_ID").

BEFORE ACTING: reread .pi/loops/$LOOP_NAME/VISION.md and treat its boundaries as
authoritative. Do NOT act outside that file. If a proposed action is not clearly
inside Scope, treat it as Out-of-scope and write a diagnosis to PR_BODY.md
instead of editing.

GOAL: achieve the Definition-of-done in VISION.md for item "$ITEM_ID".
SCOPE: only touch paths/actions listed under ## Scope in VISION.md.
HARD STOPS: honor every entry under ## Hard stops in VISION.md.
YOU CANNOT SHIP: the orchestrator pushes the branch and opens the PR after the
gate passes. Do not attempt to push, open a PR, or message anyone — you do not
have those tools. Just stage your changes in this worktree (git add) and write a
PR_BODY.md summarizing what you did and citing VISION.md.

When done, write nothing to stdout that matters; the orchestrator runs the gate.
EOF
}

# =============================================================================
# GATE PARSE — extract the gate command from VISION.md (contract above)
# =============================================================================
# Extracts the FIRST fenced ```bash block located DIRECTLY under the
# `## Gate` heading. Strip leading/trailing whitespace. Returns the command
# on stdout. Returns non-zero (with an ERROR log) if no such block is found.
# Implementation: awk scans from the `## Gate` heading to the first ```bash
# fence, captures until the closing ```, prints the trimmed content.
parse_gate() {
    local vision="$1"
    [ -f "$vision" ] || { log_error "parse_gate" "VISION.md not found: $vision"; return 1; }
    awk '
        /^## Gate[[:space:]]*$/ { in_gate=1; next }
        in_gate && /^```bash[[:space:]]*$/ { in_block=1; next }
        in_block && /^```[[:space:]]*$/ { in_block=0; in_gate=0; exit }
        in_block { print }
    ' "$vision" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | grep -v '^$'
}

# =============================================================================
# STATE HELPERS — jq-backed reads/writes on STATE.json
# =============================================================================
state_ensure() {
    # Create STATE.json from template if missing.
    [ -f "$STATE_FILE" ] && return 0
    local tmpl="${VISION_FILE%/*}/../templates/loop-state.json"
    [ -f "$tmpl" ] || tmpl=".pi/templates/loop-state.json"
    if [ -f "$tmpl" ]; then
        jq --arg name "$LOOP_NAME" '.loop_name=$name' "$tmpl" > "$STATE_FILE" \
            || log_error "state_ensure" "failed to seed $STATE_FILE"
    else
        printf '{"loop_name":"%s","processed":[],"failures":[],"metrics":{"runs":0,"killed":false,"items_fixed":0,"items_skipped":0}}' \
            "$LOOP_NAME" > "$STATE_FILE"
    fi
}

state_contains_processed() {
    # $1=item id. Returns 0 if already processed (idempotent skip).
    [ -f "$STATE_FILE" ] || return 1
    jq -e --arg id "$1" '(.processed // []) | index($id)' "$STATE_FILE" >/dev/null
}

state_record_skip() {
    local item="$1"
    [ -f "$STATE_FILE" ] || return 0
    local tmp
    tmp="$(mktemp)"
    jq --arg id "$item" '
        .processed = ((.processed // []) + [$id]) | unique
        | .metrics.items_skipped = ((.metrics.items_skipped // 0) + 1)
        | .last_run = (now | todate)
    ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

state_record_failure() {
    # $1=item $2=reason
    local item="$1" reason="$2"
    [ -f "$STATE_FILE" ] || return 0
    local tmp
    tmp="$(mktemp)"
    jq --arg id "$item" --arg reason "$reason" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .failures = ((.failures // []) + [{item:$id, reason:$reason, at:$ts}])
        | .last_run = (now | todate)
    ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

state_record_ship() {
    # $1=item $2=branch $3=pr_url
    local item="$1" branch="$2" pr_url="$3"
    [ -f "$STATE_FILE" ] || return 0
    local tmp
    tmp="$(mktemp)"
    jq --arg id "$item" --arg branch "$branch" --arg pr "$pr_url" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .completed = ((.completed // []) + [{item:$id, branch:$branch, pr:$pr, at:$ts}])
        | .processed = ((.processed // []) + [$id]) | unique
        | .metrics.items_fixed = ((.metrics.items_fixed // 0) + 1)
        | .metrics.pr_opened = ((.metrics.pr_opened // 0) + (if ($pr | length) > 0 then 1 else 0 end))
        | .last_run = (now | todate)
    ' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

state_record_run() {
    [ -f "$STATE_FILE" ] || return 0
    local tmp
    tmp="$(mktemp)"
    jq '.metrics.runs = ((.metrics.runs // 0) + 1) | .last_run = (now | todate)' \
        "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# =============================================================================
# CLEANUP — trap-registered; always remove the worktree (FR8).
# =============================================================================
cleanup() {
    local rc=$?
    if [ -n "$WORKTREE_DIR" ] && [ -d "$WORKTREE_DIR" ]; then
        log_warn "cleanup" "removing worktree $WORKTREE_DIR (rc was $rc)"
        git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_DIR" 2>/dev/null \
            || rm -rf "$WORKTREE_DIR" 2>/dev/null \
            || log_error "cleanup" "failed to remove $WORKTREE_DIR"
    fi
    # Never exit 1 on a loop failure (FR10). Always exit 0 from cleanup unless
    # we are mid-arg-parse (handled by the caller's explicit exit codes).
    exit 0
}

# =============================================================================
# PHASE A — parse args
# =============================================================================
phase_parse_args() {
    [ $# -ge 2 ] || { log_error "A_parse_args" "usage: $0 run-once <loop-name> [repo-root] [item-id]"; exit 1; }
    ACTION="$1"
    LOOP_NAME="$2"
    REPO_ROOT="${3:-$PWD}"
    ITEM_ID="${4:-manual-$(date +%s)}"
    [ "$ACTION" = "run-once" ] || { log_error "A_parse_args" "unknown action: $ACTION (only run-once supported)"; exit 1; }
    [ -d "$REPO_ROOT" ] || { log_error "A_parse_args" "repo-root not a dir: $REPO_ROOT"; exit 1; }
    REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
    LOOP_DIR="$REPO_ROOT/.pi/loops/$LOOP_NAME"
    VISION_FILE="$LOOP_DIR/VISION.md"
    STATE_FILE="$LOOP_DIR/STATE.json"
    [ -f "$VISION_FILE" ] || { log_error "A_parse_args" "VISION.md missing: $VISION_FILE"; exit 1; }
    [ -d "$LOOP_DIR" ] || mkdir -p "$LOOP_DIR"
    state_ensure
    INSTANCE_ID="${LOOP_NAME}-$(date +%Y%m%dT%H%M%S)-$$"
    START_EPOCH="$(date +%s)"
    GIT_BRANCH="loop/$LOOP_NAME/$(date +%Y%m%dT%H%M%S)"
    log_info "A_parse_args" "loop=$LOOP_NAME repo=$REPO_ROOT item=$ITEM_ID branch=$GIT_BRANCH"
}

# =============================================================================
# PHASE B — load VISION.md gate
# =============================================================================
phase_load_gate() {
    GATE="$(parse_gate "$VISION_FILE")"
    local rc=$?
    if [ $rc -ne 0 ] || [ -z "$GATE" ]; then
        log_error "B_load_gate" "no fenced bash gate block found under ## Gate in $VISION_FILE"
        return 1
    fi
    log_info "B_load_gate" "gate loaded (${#GATE} chars): $(printf '%s' "$GATE" | head -1)"
}

# =============================================================================
# PHASE C — worktree + maker (`pi -p` with restricted tools, cwd in worktree)
# =============================================================================
phase_worktree_and_maker() {
    WORKTREE_DIR="$(mktemp -d -t "loop-${LOOP_NAME}-XXXXXX")"
    # mktemp -d gives a plain dir; convert to a git worktree.
    rmdir "$WORKTREE_DIR" 2>/dev/null
    if ! git -C "$REPO_ROOT" worktree add --detach "$WORKTREE_DIR" HEAD 2>&1; then
        log_error "C_worktree" "git worktree add failed"
        WORKTREE_DIR=""
        return 1
    fi
    log_info "C_worktree" "worktree at $WORKTREE_DIR"

    local prompt
    prompt="$(build_maker_prompt)"

    # ---- Maker: pi -p with capability-deprivation allowlist (FR6). ----
    # The maker literally cannot call push/PR/Slack (not in --tools). It only
    # stages files in the worktree + writes PR_BODY.md. The orchestrator ships.
    log_info "C_maker" "running pi -p (cwd=$WORKTREE_DIR, tools=$MAKER_TOOLS)"
    local maker_log
    if ! maker_log="$(cd "$WORKTREE_DIR" && pi -p --tools "$MAKER_TOOLS" --no-session --approve -a "$prompt" 2>&1)"; then
        log_warn "C_maker" "pi -p exited non-zero (recorded, not fatal — FR10)"
        printf '%s\n' "$maker_log" >&2
        # Not a script-level failure: record + continue to gate evaluation.
    fi
    log_info "C_maker" "maker phase complete"

    # ---------------------------------------------------------------------
    # PHASE D — BUDGET-CAP HOOK POINT (T13 will fill this block)
    # ---------------------------------------------------------------------
    # T13 (budget cap in orchestrators) will replace this commented block with
    # real token-cap enforcement:
    #   1. Re-run maker with `pi -p --mode json ...` and parse token usage from
    #      the JSONL event stream (message_end events carry usage).
    #   2. Accumulate usage across the run.
    #   3. If usage exceeds TOKEN_CAP (config block above), kill the loop:
    #        - record STATE.json.metrics.killed=true + kill_reason
    #        - skip the gate + ship phases
    #        - cleanup the worktree
    #        - exit 0 (graceful — never exit 1, FR10)
    # Until T13 ships, TOKEN_CAP is null/empty and this hook is a no-op.
    if [ -n "$TOKEN_CAP" ]; then
        log_warn "D_budget_cap" "TOKEN_CAP=$TOKEN_CAP set but T13 enforcement not yet implemented — no-op (hook point for T13)"
    fi
    # ---------------------------------------------------------------------
}

# =============================================================================
# PHASE E — run the gate; capture exit code (computational, FR7)
# =============================================================================
phase_gate() {
    log_info "E_gate" "running gate via bash -c"
    local gate_out
    if ! gate_out="$(cd "$WORKTREE_DIR" && bash -c "$GATE" 2>&1)"; then
        local rc=$?
        printf '%s\n' "$gate_out" >&2
        log_error "E_gate" "gate FAILED (exit $rc)"
        return $rc
    fi
    printf '%s\n' "$gate_out" >&2
    log_info "E_gate" "gate PASSED (exit 0)"
    return 0
}

# =============================================================================
# PHASE F — ship: push branch + gh pr create (only on gate pass)
# =============================================================================
phase_ship() {
    cd "$WORKTREE_DIR" || { log_error "F_ship" "cannot cd worktree"; return 1; }
    # Stage everything the maker produced (commits in worktree).
    git add -A 2>/dev/null || log_warn "F_ship" "git add -A had nothing to stage"
    if ! git diff --cached --quiet; then
        git commit -m "loop($LOOP_NAME): $ITEM_ID (instance $INSTANCE_ID)" 2>&1 >&2 \
            || log_warn "F_ship" "git commit failed (maybe empty)"
    fi
    # Branch from the worktree HEAD (detached) onto loop/<name>/<ts>.
    if ! git checkout -b "$GIT_BRANCH" 2>&1 >&2; then
        log_error "F_ship" "git checkout -b $GIT_BRANCH failed"
        return 1
    fi
    if ! git push -u origin "$GIT_BRANCH" 2>&1 >&2; then
        log_error "F_ship" "git push -u origin $GIT_BRANCH failed"
        return 1
    fi
    log_info "F_push" "pushed $GIT_BRANCH"

    if command -v gh >/dev/null 2>&1; then
        local body=""
        [ -f PR_BODY.md ] && body="$(cat PR_BODY.md)"
        PR_URL="$(gh pr create --base main --head "$GIT_BRANCH" \
            --title "loop($LOOP_NAME): $ITEM_ID" \
            --body "${body:-Auto-generated by loop-orchestrator.sh (instance $INSTANCE_ID).}" 2>&1 \
            | tail -n1)" || {
            log_warn "F_pr" "gh pr create failed; branch pushed but no PR (commit-only fallback)"
            PR_URL=""
        }
        log_info "F_pr" "PR: ${PR_URL:-<none>}"
    else
        log_warn "F_pr" "gh not installed; branch pushed, no PR (commit-only)"
        PR_URL=""
    fi
    cd "$REPO_ROOT" || log_warn "F_ship" "cd back to repo-root failed"
}

# =============================================================================
# MAIN — orchestrate phases; never exit 1 on a loop failure (FR10)
# =============================================================================
main() {
    phase_parse_args "$@"
    trap cleanup EXIT INT TERM

    # Idempotence (FR9): skip already-processed items.
    if state_contains_processed "$ITEM_ID"; then
        log_info "main" "NOTHING_TO_DO — item $ITEM_ID already processed (idempotent skip)"
        state_record_skip "$ITEM_ID" 2>/dev/null || true
        exit 0
    fi
    state_record_run 2>/dev/null || true

    # B — load gate.
    if ! phase_load_gate; then
        state_record_failure "$ITEM_ID" "gate-parse-failed" 2>/dev/null || true
        log_error "main" "gate parse failed; recording failure and exiting 0 (FR10)"
        exit 0
    fi

    # C — worktree + maker.
    if ! phase_worktree_and_maker; then
        state_record_failure "$ITEM_ID" "worktree-or-maker-failed" 2>/dev/null || true
        log_error "main" "worktree/maker failed; recording and exiting 0 (FR10)"
        exit 0
    fi

    # E — gate (exit code is the decision).
    if ! phase_gate; then
        state_record_failure "$ITEM_ID" "gate-failed-exit-nonzero" 2>/dev/null || true
        log_error "main" "gate failed; no ship; recording and exiting 0 (FR10)"
        exit 0
    fi

    # F — ship on pass.
    if ! phase_ship; then
        state_record_failure "$ITEM_ID" "ship-failed" 2>/dev/null || true
        log_error "main" "ship failed; recording and exiting 0 (FR10)"
        exit 0
    fi
    state_record_ship "$ITEM_ID" "$GIT_BRANCH" "$PR_URL" 2>/dev/null || true
    log_info "main" "DONE — shipped $ITEM_ID on $GIT_BRANCH (${PR_URL:-no-pr})"
    exit 0
}

main "$@"