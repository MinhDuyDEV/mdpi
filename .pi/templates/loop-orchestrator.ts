/**
 * loop-orchestrator.ts — Node SDK primary orchestrator for the pi
 * loop-engineering harness (T9).
 *
 * Mirrors loop-orchestrator.sh (T10 — the portable bash alt). Composes the
 * Node pi-coding-agent SDK: `createAgentSession` with a capability-deprivation
 * tool allowlist (the maker structurally cannot ship), git worktree isolation
 * (parallel loops never collide), an exit-code gate (computational, never an
 * LLM's opinion), dedup state (JSON), and ship-on-pass (push `loop/<name>/<ts>`
 * + `gh pr create`).
 *
 * GRACEFUL DEGRADATION (FR10): every phase is wrapped in try/catch. A loop
 * failure is logged + recorded in STATE.json + the scheduler continues. This
 * module never throws out of `runOnce` for a loop failure; it only rejects for
 * operator/config errors raised before any loop work begins (bad args,
 * missing VISION.md).
 *
 * GATE-PARSE CONTRACT (must match T2's loop-vision.md EXACTLY — the bash
 * orchestrator T10 uses the identical contract; keep them in parity):
 *   The gate command is extracted from `.pi/loops/<name>/VISION.md`:
 *   THE FIRST fenced ```bash block located DIRECTLY UNDER the `## Gate`
 *   heading. Extraction: find the `## Gate` heading line (allow trailing
 *   whitespace), scan forward to the first opening fence line whose
 *   info-string is `bash` (a line equal to ```bash, trailing whitespace
 *   tolerated), take every line until the next closing fence (a line equal to
 *   ```), strip leading/trailing whitespace on each line, drop blank lines,
 *   join with `\n`, run via `bash -c "<command>"`, read the exit code.
 *     exit 0   -> PASS  -> ship (push `loop/<name>/<ts>` + `gh pr create`)
 *     non-zero -> FAIL  -> no ship; record in STATE.json.failures[]; cleanup
 *   The gate decision is computational (exit code), never an LLM's opinion
 *   (avoids the Ralph Wiggum loop). Keep exactly ONE ```bash block directly
 *   under `## Gate` in VISION.md; this parser returns null on zero or >1 bash
 *   blocks in the Gate section (ambiguous spec — refuse to guess).
 *
 * IDEMPOTENCE (FR9): an item already in STATE.json.processed is skipped
 * (NOTHING_TO_DO). Re-running is always safe; deleting STATE.json reprocesses.
 *
 * SDK-SHAPE NOTE: `@earendil-works/pi-coding-agent` is globally installed
 * (resolved by the pi runtime loader), NOT resolvable from this repo's
 * standalone tsc/tsx. The value import (createAgentSession / SessionManager) is
 * therefore deferred to a dynamic `await import()` inside the runtime
 * functions so the module remains importable in tests; the type-only
 * `import type { ... }` is erased at compile time (TS2307 for that import is
 * the one tolerated gap in the verify command). Local structural mirrors of
 * the SDK shapes are declared so tsc type-checks cleanly regardless of
 * module resolution.
 *
 * PHASES (each logs INFO/WARN/ERROR with instance id + duration):
 *   A. parse args → resolve loop dir + repo root
 *   B. load VISION.md gate (parse contract above) → GATE_CMD
 *   C. git worktree add --detach <tmp> HEAD; createAgentSession + prompt
 *   D. (BUDGET-CAP HOOK POINT — T13 fills `enforceBudgetCap`; see below)
 *   E. run gate via `bash -c "$GATE_CMD"`; capture exit code
 *   F. on 0: ship: git push -u origin loop/<name>/<ts> + gh pr create
 *   G. update STATE.json (processed/failures/metrics)
 *   H. git worktree remove --force (try/finally cleanup)
 *
 * Usage (runtime):
 *   const r = await runOnce({ loopName: "ci-triage", repoRoot: process.cwd() });
 *
 * Requires: pi SDK (global), git, gh (authenticated, for PR ship; falls back to
 * commit-only/log if absent). API key in env or CI secrets.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync, execSync } from "node:child_process";

// Type-only SDK import — erased at compile time. TS2307 for this line is the
// single tolerated gap in the verify command (the package is globally
// installed, not a local dependency). Runtime value import is dynamic below.
import type {
	AgentSession as SDKAgentSessionType,
	SessionStats as SDKSessionStatsType,
} from "@earendil-works/pi-coding-agent";

// =============================================================================
// CONFIG BLOCK (mirror of T10's loop-orchestrator.sh config block)
// =============================================================================
// LOOP_NAME   — set from runOnce({ loopName }); the .pi/loops/<name>/ dir.
// GATE        — auto-loaded from .pi/loops/<name>/VISION.md (parseGateCommand).
// REPO_ROOT   — set from runOnce({ repoRoot }); where `git worktree` runs.
// TOKEN_CAP   — placeholder; T13 (budget cap) will fill this. When non-null and
//               the maker's session token usage exceeds it, enforceBudgetCap
//               returns kill=true and runOnce calls session.abort().
// MAKER_TOOLS — capability-deprivation allowlist (FR6). The maker CANNOT call
//               push/PR/Slack — they are not in this list. The maker only
//               stages files in the worktree + writes PR_BODY.md; the
//               orchestrator ships after the gate passes.
// SHIP_TOOLS  — the audit denylist for the tool-execution-start audit (FR6).
// LOOP_DIR    — resolved .pi/loops/<LOOP_NAME>/ (vision + state live here).
// VISION_FILE — .pi/loops/<LOOP_NAME>/VISION.md (anti goal-drift contract).
// STATE_FILE  — .pi/loops/<LOOP_NAME>/STATE.json (dedup + metrics ledger).

export const MAKER_TOOLS = ["read", "edit", "write", "bash", "grep", "find"] as const;
export const SHIP_TOOLS: ReadonlySet<string> = new Set(["push", "pr", "slack"]);

export const TOKEN_CAP: number | null = null; // BUDGET-CAP HOOK (T13): set to enforce.

// =============================================================================
// LOCAL SDK SHAPE MIRRORS (so tsc type-checks without resolving the package)
// =============================================================================

/** Mirror of the SDK `SessionStats` (subset we consume). */
export interface SessionStatsMirror {
	sessionId?: string;
	userMessages?: number;
	assistantMessages?: number;
	toolCalls?: number;
	toolResults?: number;
	totalMessages?: number;
	tokens?: {
		input?: number;
		output?: number;
		cacheRead?: number;
		cacheWrite?: number;
		total?: number;
	};
	cost?: number;
	contextUsage?: number;
}

/** Mirror of the SDK `AgentSessionEvent` union (subset we subscribe to). */
export interface AgentSessionEventMirror {
	type: string;
	// message_end carries an AssistantMessage with .usage
	message?: { usage?: SessionStatsMirror["tokens"] };
	// tool_execution_start / tool_execution_end
	toolCallId?: string;
	toolName?: string;
	args?: unknown;
	result?: unknown;
	isError?: boolean;
	// agent_end
	willRetry?: boolean;
	messages?: unknown[];
}

/** Mirror of the SDK `AgentSession` (methods we call). */
export interface AgentSessionMirror {
	prompt(text: string, options?: Record<string, unknown>): Promise<void>;
	subscribe(listener: (event: AgentSessionEventMirror) => void): () => void;
	abort(): Promise<void>;
	getSessionStats(): SessionStatsMirror;
}

/** Mirror of the SDK `SessionManager` static surface. */
export interface SessionManagerMirror {
	inMemory(cwd?: string): unknown;
	create(cwd: string): unknown;
}

/** Mirror of `createAgentSession` options (subset we pass). */
export interface CreateAgentSessionOptionsMirror {
	cwd?: string;
	model?: string;
	tools?: string[];
	noTools?: boolean;
	customTools?: unknown[];
	sessionManager?: unknown;
	settingsManager?: unknown;
	modelRegistry?: unknown;
	thinkingLevel?: unknown;
}

export interface CreateAgentSessionResultMirror {
	session: AgentSessionMirror;
}

/** Structural supertype of the SDK module namespace we consume. */
interface PiSdkNamespace {
	createAgentSession(options?: CreateAgentSessionOptionsMirror): Promise<CreateAgentSessionResultMirror>;
	SessionManager: SessionManagerMirror;
	isToolCallEventType?: unknown;
}

// =============================================================================
// STATE TYPES (mirror of .pi/templates/loop-state.json)
// =============================================================================

export interface LoopMetrics {
	runs: number;
	killed: boolean;
	kill_reason: string | null;
	tokens_used: number;
	token_cap: number | null;
	pr_opened: number;
	items_fixed: number;
	items_skipped: number;
	items_escalated: number;
}

export interface LoopState {
	loop_name: string;
	owner: string;
	cadence: string;
	last_run: string | null;
	in_progress: string[];
	completed: Array<{ item: string; branch: string; pr: string; at: string }>;
	escalated: unknown[];
	failures: Array<{ item: string; reason: string; at: string }>;
	lessons: unknown[];
	processed: string[];
	stop_conditions_met: unknown[];
	metrics: LoopMetrics;
}

// =============================================================================
// PURE HELPERS — no SDK, no I/O. Unit-tested (TDD).
// =============================================================================

/**
 * Extract the gate command from a VISION.md document.
 *
 * Contract: the FIRST fenced ```bash block located DIRECTLY under the `## Gate`
 * heading. The Gate section runs from the `## Gate` heading until the next
 * level-1/level-2 heading or EOF. Within that section we count fenced ```bash
 * blocks: exactly one non-empty block → return its trimmed content (each line
 * trimmed, blank lines dropped, joined with `\n`); zero or >1 block, or an
 * unterminated block, or empty content → return null (refuse to guess).
 *
 * Returns null when: no `## Gate` heading, no bash block under it, an
 * unterminated block, an empty block, or multiple bash blocks (ambiguous spec).
 */
export function parseGateCommand(visionMd: string): string | null {
	if (!visionMd) return null;
	const lines = visionMd.split(/\r?\n/);

	// 1. locate the `## Gate` heading (trailing whitespace tolerated).
	let gateIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (/^## Gate[ \t]*$/.test(lines[i])) {
			gateIdx = i;
			break;
		}
	}
	if (gateIdx === -1) return null;

	// 2. collect fenced ```bash blocks until the next level-1/2 heading or EOF.
	const blocks: string[] = [];
	let j = gateIdx + 1;
	while (j < lines.length) {
		const line = lines[j];
		// A new level-1 or level-2 heading ends the Gate section.
		if (/^#{1,2} /.test(line)) break;
		if (/^```bash[ \t]*$/.test(line)) {
			const buf: string[] = [];
			let k = j + 1;
			while (k < lines.length && !/^```[ \t]*$/.test(lines[k])) {
				buf.push(lines[k].trim());
				k++;
			}
			if (k >= lines.length) return null; // unterminated fence
			const content = buf.filter((l) => l.length > 0).join("\n");
			blocks.push(content);
			j = k + 1;
			continue;
		}
		j++;
	}

	if (blocks.length !== 1) return null; // zero or >1 → ambiguous
	const cmd = blocks[0];
	if (cmd.length === 0) return null; // empty block
	return cmd;
}

/**
 * Build the maker prompt. Single source of truth (kept identical in spirit to
 * T10's `build_maker_prompt`). The maker is told to reread VISION.md, stay in
 * scope, stage changes in the worktree (NO ship — the orchestrator ships after
 * the gate passes), and write a PR_BODY.md.
 */
export function buildMakerPrompt(
	loopName: string,
	_vision: string,
	_state: LoopState,
	opts?: { itemId?: string; instanceId?: string },
): string {
	const itemId = opts?.itemId ?? "unknown";
	const instanceId = opts?.instanceId ?? "unknown";
	return `You are the MAKER phase of loop "${loopName}" (instance ${instanceId}, item "${itemId}").

BEFORE ACTING: reread .pi/loops/${loopName}/VISION.md and treat its boundaries as
authoritative. Do NOT act outside that file. If a proposed action is not clearly
inside Scope, treat it as Out-of-scope and write a diagnosis to PR_BODY.md
instead of editing.

GOAL: achieve the Definition-of-done in VISION.md for item "${itemId}".
SCOPE: only touch paths/actions listed under ## Scope in VISION.md.
HARD STOPS: honor every entry under ## Hard stops in VISION.md.
YOU CANNOT SHIP: the orchestrator pushes the branch and opens the PR after the
gate passes. Do not attempt to push, open a PR, or message anyone — you do not
have those tools. Just stage your changes in this worktree (git add) and write a
PR_BODY.md summarizing what you did and citing VISION.md.

When done, write nothing to stdout that matters; the orchestrator runs the gate.
`;
}

/**
 * Pick the next item id to process: the first in-progress item, else the
 * provided fallback, else a generated manual id.
 */
export function nextItemId(state: LoopState, fallback?: string): string {
	const head = state?.in_progress?.[0];
	if (typeof head === "string" && head.length > 0) return head;
	if (fallback && fallback.length > 0) return fallback;
	return `manual-${Date.now()}`;
}

/**
 * Pure, immutable state patch. Shallow-merges top-level keys; shallow-merges
 * `metrics` so callers can pass a partial metrics object without clobbering
 * the rest. Does NOT mutate the input.
 */
export function updateStateJson(state: LoopState, patch: Partial<LoopState>): LoopState {
	const next: LoopState = { ...state };
	if (patch.metrics) {
		next.metrics = { ...state.metrics, ...patch.metrics };
	}
	for (const key of Object.keys(patch) as Array<keyof LoopState>) {
		if (key === "metrics") continue;
		// @ts-expect-error — generic shallow assignment across LoopState keys.
		next[key] = patch[key];
	}
	return next;
}

/**
 * Idempotence check (FR9): true if the item is already in STATE.processed.
 */
export function isAlreadyProcessed(state: LoopState, itemId: string): boolean {
	const processed = state?.processed;
	return Array.isArray(processed) && processed.includes(itemId);
}

/**
 * Ship-tool audit (FR6): scan the list of tool names the maker actually called
 * (captured from `tool_execution_start` events) and flag any ship tool
 * (`push`, `pr`, `slack`). The maker's allowlist (MAKER_TOOLS) structurally
 * excludes these, so any offender is a policy violation worth recording.
 */
export function auditShipToolCalls(toolNames: string[]): { ok: boolean; offenders: string[] } {
	const offenders = toolNames.filter((n) => typeof n === "string" && SHIP_TOOLS.has(n.toLowerCase()));
	return { ok: offenders.length === 0, offenders };
}

// =============================================================================
// BUDGET-CAP HOOK POINT — Phase D (T13 will fill this)
// =============================================================================
//
// T13 (budget cap in orchestrators) will replace this stub with real per-event
// token-cap enforcement:
//   1. Accumulate usage from `message_end` events (message.usage) across the run.
//   2. If accumulated usage exceeds `cap`, return { kill: true, reason }.
//   3. runOnce calls `session.abort()` when kill=true, records
//      STATE.json.metrics.killed=true + kill_reason, skips the gate + ship
//      phases, cleans up the worktree, and exits gracefully (FR10 — never
//      throws).
// Until T13 ships, TOKEN_CAP is null and this hook is a no-op predicate.
//
// Pure predicate (no side effects) so it can be unit-tested without a session.
export interface BudgetCapDecision {
	kill: boolean;
	reason: string | null;
}

export function enforceBudgetCap(stats: SessionStatsMirror, cap: number | null): BudgetCapDecision {
	if (cap == null) return { kill: false, reason: null };
	const used = stats?.tokens?.total ?? 0;
	if (used > cap) {
		return { kill: true, reason: `token budget exceeded: ${used} > ${cap}` };
	}
	return { kill: false, reason: null };
}

// =============================================================================
// SDK DYNAMIC LOADER — cached; value import deferred (resolution gap).
// =============================================================================

let sdkCache: PiSdkNamespace | null = null;
async function loadSdk(): Promise<PiSdkNamespace> {
	if (sdkCache) return sdkCache;
	// Dynamic import: the package is globally installed and resolved by the pi
	// runtime loader. A static top-level value import would fail under tsx/tsc
	// in this repo (not a local dependency), so we defer it here.
	const sdk = (await import("@earendil-works/pi-coding-agent")) as unknown as PiSdkNamespace;
	sdkCache = sdk;
	return sdk;
}

// =============================================================================
// RUNTIME HELPERS — file I/O + shell (kept thin; tested only at T15 smoke)
// =============================================================================

function readState(stateFile: string): LoopState {
	const raw = fs.readFileSync(stateFile, "utf8");
	return JSON.parse(raw) as LoopState;
}

function writeState(stateFile: string, state: LoopState): void {
	fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function ensureState(stateFile: string, loopName: string, templateFile: string): void {
	if (fs.existsSync(stateFile)) return;
	let seed: LoopState;
	if (fs.existsSync(templateFile)) {
		seed = JSON.parse(fs.readFileSync(templateFile, "utf8")) as LoopState;
		seed.loop_name = loopName;
	} else {
		seed = {
			loop_name: loopName,
			owner: "",
			cadence: "manual",
			last_run: null,
			in_progress: [],
			completed: [],
			escalated: [],
			failures: [],
			lessons: [],
			processed: [],
			stop_conditions_met: [],
			metrics: {
				runs: 0,
				killed: false,
				kill_reason: null,
				tokens_used: 0,
				token_cap: null,
				pr_opened: 0,
				items_fixed: 0,
				items_skipped: 0,
				items_escalated: 0,
			},
		};
	}
	writeState(stateFile, seed);
}

function nowIso(): string {
	return new Date().toISOString();
}

function timestampSlug(d = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function log(level: string, instanceId: string, phase: string, msg: string): void {
	const stamp = new Date().toISOString();
	// eslint-disable-next-line no-console
	console.error(`${stamp} [${level}] instance=${instanceId} phase=${phase} — ${msg}`);
}

function runGate(worktreeDir: string, gateCmd: string): { exitCode: number; stdout: string } {
	try {
		const stdout = execFileSync("bash", ["-c", gateCmd], {
			cwd: worktreeDir,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { exitCode: 0, stdout };
	} catch (err: unknown) {
		const e = err as { status?: number; stdout?: string; stderr?: string };
		return { exitCode: typeof e.status === "number" ? e.status : 1, stdout: e.stdout ?? "" };
	}
}

function hasBin(bin: string): boolean {
	try {
		execSync(`command -v ${bin}`, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// RUNTIME — runOnce (the primary orchestrator entry point)
// =============================================================================

export interface RunOnceOptions {
	loopName: string;
	repoRoot?: string;
	itemId?: string;
	tokenCap?: number | null;
}

export interface RunResult {
	ok: boolean;
	itemId: string;
	branch: string | null;
	prUrl: string | null;
	reason: string | null;
	skipped: boolean;
	audit: { ok: boolean; offenders: string[] };
}

/**
 * Run one loop cycle. Each phase is wrapped in try/catch (FR10): a loop failure
 * is recorded in STATE.json and the function resolves (never rejects for a
 * loop failure). Only operator/config errors before any loop work begins
 * reject (missing VISION.md, bad repoRoot).
 */
export async function runOnce(opts: RunOnceOptions): Promise<RunResult> {
	const repoRoot = path.resolve(opts.repoRoot ?? process.cwd());
	const loopName = opts.loopName;
	const loopDir = path.join(repoRoot, ".pi", "loops", loopName);
	const visionFile = path.join(loopDir, "VISION.md");
	const stateFile = path.join(loopDir, "STATE.json");
	const templateState = path.join(repoRoot, ".pi", "templates", "loop-state.json");
	const instanceId = `${loopName}-${timestampSlug()}-${process.pid}`;
	const branch = `loop/${loopName}/${timestampSlug()}`;
	const tokenCap = opts.tokenCap ?? TOKEN_CAP;

	if (!fs.existsSync(visionFile)) {
		return fail(loopName, instanceId, "A_parse_args", `VISION.md missing: ${visionFile}`, opts.itemId ?? "", null);
	}
	if (!fs.existsSync(loopDir)) fs.mkdirSync(loopDir, { recursive: true });
	ensureState(stateFile, loopName, templateState);

	const itemId = opts.itemId ?? nextItemId(readState(stateFile));

	// Idempotence (FR9): skip already-processed items.
	let state = readState(stateFile);
	if (isAlreadyProcessed(state, itemId)) {
		log("INFO", instanceId, "main", `NOTHING_TO_DO — item ${itemId} already processed (idempotent skip)`);
		state = updateStateJson(state, {
			processed: Array.from(new Set([...state.processed, itemId])),
			metrics: { ...state.metrics, items_skipped: state.metrics.items_skipped + 1 },
			last_run: nowIso(),
		});
		writeState(stateFile, state);
		return {
			ok: true,
			itemId,
			branch: null,
			prUrl: null,
			reason: "idempotent-skip",
			skipped: true,
			audit: { ok: true, offenders: [] },
		};
	}

	state = updateStateJson(state, { metrics: { ...state.metrics, runs: state.metrics.runs + 1 } });
	writeState(stateFile, state);

	let worktreeDir = "";
	const audit: { ok: boolean; offenders: string[] } = { ok: true, offenders: [] };

	try {
		// ---- Phase B: load gate ----
		const visionMd = fs.readFileSync(visionFile, "utf8");
		const gateCmd = parseGateCommand(visionMd);
		if (!gateCmd) {
			return recordFailureAndReturn(
				stateFile, state, itemId, "gate-parse-failed",
				`no fenced bash gate block found under ## Gate in ${visionFile}`,
				instanceId, loopName,
			);
		}
		log("INFO", instanceId, "B_load_gate", `gate loaded (${gateCmd.length} chars): ${gateCmd.split("\n")[0]}`);

		// ---- Phase C: worktree + maker session ----
		worktreeDir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), `loop-${loopName}-`));
		fs.rmSync(worktreeDir, { recursive: true, force: true });
		execFileSync("git", ["-C", repoRoot, "worktree", "add", "--detach", worktreeDir, "HEAD"], {
			stdio: "pipe",
			encoding: "utf8",
		});
		log("INFO", instanceId, "C_worktree", `worktree at ${worktreeDir}`);

		// ---- Phase C (cont.): createAgentSession + prompt ----
		const sdk = await loadSdk();
		const { session } = await sdk.createAgentSession({
			cwd: worktreeDir,
			tools: [...MAKER_TOOLS],
			sessionManager: sdk.SessionManager.inMemory(worktreeDir),
		});

		const toolNames: string[] = [];
		let tokenTotal = 0;
		const unsub = session.subscribe((event: AgentSessionEventMirror) => {
			if (event.type === "message_end" && event.message?.usage) {
				const u = event.message.usage;
				tokenTotal += u.total ?? (u.input ?? 0) + (u.output ?? 0);
			} else if (event.type === "tool_execution_start" && typeof event.toolName === "string") {
				toolNames.push(event.toolName);
			}
		});

		const prompt = buildMakerPrompt(loopName, visionMd, state, { itemId, instanceId });
		log("INFO", instanceId, "C_maker", `running createAgentSession.prompt (cwd=${worktreeDir}, tools=${MAKER_TOOLS.join(",")})`);
		try {
			await session.prompt(prompt);
		} catch (err) {
			log("WARN", instanceId, "C_maker", `session.prompt failed (recorded, not fatal — FR10): ${String(err)}`);
		}
		unsub();
		log("INFO", instanceId, "C_maker", "maker phase complete");

		// ---- Phase D: BUDGET-CAP HOOK POINT (T13 fills enforceBudgetCap) ----
		const stats = session.getSessionStats();
		const capDecision = enforceBudgetCap(stats, tokenCap);
		if (capDecision.kill) {
			log("WARN", instanceId, "D_budget_cap", `kill: ${capDecision.reason} — calling session.abort()`);
			try {
				await session.abort();
			} catch (err) {
				log("WARN", instanceId, "D_budget_cap", `session.abort() failed: ${String(err)}`);
			}
			const killedState = updateStateJson(state, {
				metrics: { ...state.metrics, killed: true, kill_reason: capDecision.reason, tokens_used: tokenTotal },
				last_run: nowIso(),
			});
			writeState(stateFile, killedState);
			return { ok: false, itemId, branch: null, prUrl: null, reason: `budget-cap-kill: ${capDecision.reason}`, skipped: false, audit };
		}

		// ---- Ship-tool audit (FR6): zero push/pr/slack calls expected. ----
		audit.ok = auditShipToolCalls(toolNames).ok;
		audit.offenders = auditShipToolCalls(toolNames).offenders;
		if (!audit.ok) {
			log("ERROR", instanceId, "C_audit", `ship-tool audit FAILED: ${audit.offenders.join(",")}`);
		}

		// ---- Phase E: gate (exit code is the decision — computational, FR7) ----
		log("INFO", instanceId, "E_gate", "running gate via bash -c");
		const gateRes = runGate(worktreeDir, gateCmd);
		if (gateRes.exitCode !== 0) {
			log("ERROR", instanceId, "E_gate", `gate FAILED (exit ${gateRes.exitCode})`);
			return recordFailureAndReturn(
				stateFile, state, itemId, "gate-failed-exit-nonzero",
				`gate exited ${gateRes.exitCode}`, instanceId, loopName, { audit },
			);
		}
		log("INFO", instanceId, "E_gate", "gate PASSED (exit 0)");

		// ---- Phase F: ship (push branch + gh pr create) ----
		const ship = shipPass(worktreeDir, repoRoot, loopName, instanceId, itemId, branch);
		if (!ship.ok) {
			return recordFailureAndReturn(
				stateFile, state, itemId, "ship-failed", ship.reason ?? "ship-failed",
				instanceId, loopName, { audit },
			);
		}

		// ---- Phase G: update STATE.json (processed/completed/metrics) ----
		const shipped = updateStateJson(state, {
			completed: [...state.completed, { item: itemId, branch, pr: ship.prUrl ?? "", at: nowIso() }],
			processed: Array.from(new Set([...state.processed, itemId])),
			metrics: {
				...state.metrics,
				items_fixed: state.metrics.items_fixed + 1,
				pr_opened: state.metrics.pr_opened + (ship.prUrl ? 1 : 0),
				tokens_used: tokenTotal,
			},
			last_run: nowIso(),
		});
		writeState(stateFile, shipped);
		log("INFO", instanceId, "main", `DONE — shipped ${itemId} on ${branch} (${ship.prUrl ?? "no-pr"})`);

		return { ok: true, itemId, branch, prUrl: ship.prUrl, reason: null, skipped: false, audit };
	} catch (err) {
		log("ERROR", instanceId, "runOnce", `loop failure (recorded, not fatal — FR10): ${String(err)}`);
		return recordFailureAndReturn(
			stateFile, readState(stateFile), itemId, "loop-exception", String(err),
			instanceId, loopName, { audit },
		);
	} finally {
		// ---- Phase H: cleanup worktree (FR8) ----
		if (worktreeDir) {
			try {
				execFileSync("git", ["-C", repoRoot, "worktree", "remove", "--force", worktreeDir], {
					stdio: "ignore",
					encoding: "utf8",
				});
			} catch {
				try {
					fs.rmSync(worktreeDir, { recursive: true, force: true });
				} catch (err) {
					log("WARN", instanceId, "cleanup", `failed to remove ${worktreeDir}: ${String(err)}`);
				}
			}
		}
	}
}

/** Phase F helper: commit + push + (optional) gh pr create. */
function shipPass(
	worktreeDir: string,
	repoRoot: string,
	loopName: string,
	instanceId: string,
	itemId: string,
	branch: string,
): { ok: boolean; prUrl: string | null; reason: string | null } {
	try {
		execFileSync("git", ["-C", worktreeDir, "add", "-A"], { stdio: "ignore", encoding: "utf8" });
		try {
			execFileSync(
				"git",
				["-C", worktreeDir, "commit", "-m", `loop(${loopName}): ${itemId} (instance ${instanceId})`],
				{ stdio: "ignore", encoding: "utf8" },
			);
		} catch {
			/* maybe nothing to commit */
		}
		execFileSync("git", ["-C", worktreeDir, "checkout", "-b", branch], { stdio: "ignore", encoding: "utf8" });
		execFileSync("git", ["-C", worktreeDir, "push", "-u", "origin", branch], { stdio: "pipe", encoding: "utf8" });
		log("INFO", instanceId, "F_push", `pushed ${branch}`);

		let prUrl: string | null = null;
		if (hasBin("gh")) {
			const bodyFile = path.join(worktreeDir, "PR_BODY.md");
			const body = fs.existsSync(bodyFile)
				? fs.readFileSync(bodyFile, "utf8")
				: `Auto-generated by loop-orchestrator.ts (instance ${instanceId}).`;
			try {
				const out = execSync(
					`gh pr create --base main --head ${branch} --title "loop(${loopName}): ${itemId}" --body ${JSON.stringify(body)}`,
					{ stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
				);
				prUrl = out.trim().split("\n").pop() ?? "";
			} catch (err) {
				log("WARN", instanceId, "F_pr", `gh pr create failed; branch pushed, no PR (commit-only fallback): ${String(err)}`);
				prUrl = "";
			}
			log("INFO", instanceId, "F_pr", `PR: ${prUrl || "<none>"}`);
		} else {
			log("WARN", instanceId, "F_pr", "gh not installed; branch pushed, no PR (commit-only)");
			prUrl = "";
		}
		return { ok: true, prUrl: prUrl || null, reason: null };
	} catch (err) {
		return { ok: false, prUrl: null, reason: `ship-failed: ${String(err)}` };
	}
}

/** Record a failure in STATE.json and return a failing RunResult (FR10 — graceful). */
function recordFailureAndReturn(
	stateFile: string,
	state: LoopState,
	itemId: string,
	reason: string,
	detail: string,
	instanceId: string,
	_loopName: string,
	extra?: { audit: { ok: boolean; offenders: string[] } },
): RunResult {
	const audit = extra?.audit ?? { ok: true, offenders: [] };
	const msg = `${reason}: ${detail}`;
	log("ERROR", instanceId, "record", msg);
	const next = updateStateJson(state, {
		failures: [...(state.failures ?? []), { item: itemId, reason: msg, at: nowIso() }],
		last_run: nowIso(),
	});
	try {
		writeState(stateFile, next);
	} catch (err) {
		log("WARN", instanceId, "record", `failed to write state: ${String(err)}`);
	}
	return { ok: false, itemId, branch: null, prUrl: null, reason: msg, skipped: false, audit };
}

/** Convenience for early (pre-loop) failures — no state write. */
function fail(
	_loopName: string,
	instanceId: string,
	phase: string,
	msg: string,
	itemId: string,
	_branch: string | null,
): RunResult {
	log("ERROR", instanceId, phase, msg);
	return { ok: false, itemId, branch: null, prUrl: null, reason: msg, skipped: false, audit: { ok: true, offenders: [] } };
}

// Keep the type-only SDK mirrors referenced so tsc does not flag them unused
// when the runtime path is the only consumer (and vice-versa for tests).
export type { SDKAgentSessionType, SDKSessionStatsType };