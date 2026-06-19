/**
 * Loop Guard Extension
 *
 * Defense-in-depth `tool_call` gate for unattended loop engineering runs.
 *
 * Registers `pi.on("tool_call")` to:
 *   1. Block never-do bash commands matching auth/payments/architecture patterns.
 *   2. Protect paths on write/edit: VISION.md, package.json, lockfiles, the gate script.
 *   3. Block dangerous commands (rm -rf, sudo, chmod 777) when `!ctx.hasUI` (unattended).
 *
 * The decision logic is exposed as PURE, side-effect-free predicate functions so it
 * can be unit-tested without a live pi runtime (TDD). The `pi.on("tool_call")` wiring
 * delegates to those predicates and uses the SDK's `isToolCallEventType` for safe type
 * narrowing — never an un-justified `as string` cast on `toolName`.
 *
 * Policy lists are named `const` arrays at the top so users can edit policy in one place.
 *
 * SDK-shape note: `@earendil-works/pi-coding-agent` is globally installed (resolved by the
 * pi runtime loader), NOT resolvable from this repo's standalone tsc/tsx. The value import
 * of `isToolCallEventType` is therefore deferred to a dynamic `await import()` inside the
 * handler so the module remains importable in tests; the type-only `ExtensionAPI` import
 * is erased at compile time. Both still resolve correctly under the real pi runtime.
 */

import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Policy tables — edit policy here, in one place.
// ---------------------------------------------------------------------------

/**
 * Mutating command verbs that, when combined with a sensitive keyword, signal a
 * CHANGE to auth/payments/architecture (not a read). Used to scope the auth /
 * payments / architecture never-do patterns so reads (`grep`, `cat` without
 * redirection, `git log --grep=...`) are NOT over-blocked.
 *
 * Notes:
 *   - `cat`/`echo`/`printf` only count as mutating when followed by a redirection
 *     (`>` / `>>`); without redirection they are reads/prints.
 *   - `sed` only counts as mutating with the in-place `-i` flag.
 *   - `git checkout` (restore a file) mutates the working tree; `git checkout -b`
 *     is blocked separately by the ship-command set below.
 *   - `checkout` is intentionally NOT a payments keyword (it collides with
 *     `git checkout`); payments are still caught via `stripe|billing|...`.
 */
const MUTATING_CMD_SRC =
	"(?:npm\\s+(?:install|i|add)\\b|pnpm\\s+(?:install|i|add)\\b|yarn\\s+(?:add|install)\\b|" +
	"git\\s+(?:checkout|merge|reset|revert|apply)\\b|" +
	"sed\\b[^|;&\\n]*\\s-i\\b|tee\\b|cp\\b|mv\\b|" +
	"(?:echo|cat|printf)\\b[^|;&\\n]*\\s>>?\\s)";

/**
 * Never-do bash command patterns. Always blocked (attended or not).
 *
 * Two groups:
 *   1. Ship commands — the maker must never ship (FR6): push, pr create/merge,
 *      creating a branch, committing, merging. The orchestrator owns these.
 *   2. Auth / payments / architecture CHANGES (Rule 4 territory) — scoped to a
 *      mutating verb so reads about these topics are NOT over-blocked.
 */
export const NEVER_DO_PATTERNS: readonly RegExp[] = [
	// --- Ship commands (FR6): the maker must never ship. ---
	/\bgit\s+push\b/i,
	/\bgh\s+pr\s+create\b/i,
	/\bgh\s+pr\s+merge\b/i,
	/\bgit\s+checkout\s+-b\b/i,
	/\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i,
	// --- Auth / credentials CHANGES (install/checkout/sed/redirection), not reads. ---
	new RegExp(
		"\\b" + MUTATING_CMD_SRC + "[^\\n]*\\b(auth|oauth|jwt|credential|credentials|password|passwd|secret[_-]?key|api[_-]?key)\\b",
		"i",
	),
	// --- Payments / billing CHANGES, not reads. ---
	new RegExp(
		"\\b" + MUTATING_CMD_SRC + "[^\\n]*\\b(payment|payments|stripe|billing|subscription|subscriptions|paddle|lemonsqueezy)\\b",
		"i",
	),
	// --- Architecture / refactor / migration CHANGES, not reads. ---
	new RegExp(
		"\\b" + MUTATING_CMD_SRC + "[^\\n]*\\b(architecture|architectural|refactor|refactoring|restructure|restructuring|rewrite|migration|migrate)\\b",
		"i",
	),
];

/**
 * Secret / credential exfiltration patterns. ALWAYS blocked (attended or not) —
 * a loop should never print a real secret.
 *
 * The `aws...` alternative absorbs the trailing word chars (`\w*`) because `_`
 * is a word character in regex, so `\b` boundaries inside SCREAMING_SNAKE env
 * identifiers like `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` would otherwise
 * defeat the match. The other alternatives use real `\b` boundaries to avoid
 * over-blocking words like `tokenizer`.
 */
export const SECRETS_PATTERNS: readonly RegExp[] = [
	/\b(token|access[_-]?key|secret[_-]?key|github[_-]?token|api[_-]?key)\b/i,
	/\baws[_-]?(?:access[_-]?key|secret[_-]?key|secret)\w*/i,
];

/**
 * Dangerous bash command patterns. Blocked ONLY when `!ctx.hasUI` (unattended),
 * because there is no human to confirm. When `ctx.hasUI` is true the UI can prompt,
 * so these are allowed to pass through the gate.
 */
export const DANGEROUS_PATTERNS: readonly RegExp[] = [
	// rm with any recursive/force flag (destructive): catches -rf, -fr, -r, -R,
	// --recursive, --force, -f -r, --force --recursive. Uses \s before the flag
	// (not \b) because flags start with `-`, a non-word char, so \b before `-`
	// never matches when preceded by a space.
	/\brm\b[^\n;&|]*\s(-r|-rf|-fr|-R|--recursive|--force)\b/i,
	// privilege escalation
	/\bsudo\b/i,
	// world-writable permission grants: handles 0777 / 00777 / 777
	/\b(chmod|chown)\b[^\n&|;]*\b0*777\b/i,
	// world-writable via symbolic mode: ugo+rwx / [augo]=rwx
	/\b(chmod|chown)\b[^\n&|;]*\b(ugo\+rwx|[augo]=rwx)\b/i,
	// find -delete / find -exec rm (destructive recursive deletion via find)
	/\bfind\b[^\n;&|]*\s(-delete|-exec\s+rm)\b/i,
];

/**
 * Protected file paths for write/edit. Matched against the basename of the
 * target path (case-sensitive, exact). Lockfiles, the project manifest, the
 * per-loop vision contract, and the gate script that defines "done".
 *
 * `gate.sh` is matched by basename so any per-loop gate script
 * (e.g. `.pi/loops/<name>/gate.sh`) is protected.
 */
export const PROTECTED_BASENAMES: readonly string[] = [
	"VISION.md",
	"package.json",
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"gate.sh",
];

// ---------------------------------------------------------------------------
// Pure predicates — no SDK, no side effects. Unit-tested.
// ---------------------------------------------------------------------------

/** Minimal context shape used by the pure predicates (mirrors the SDK's ctx). */
export interface GuardCtx {
	/** True when an interactive UI is available for confirmation prompts. */
	hasUI: boolean;
	/** Current working directory (unused by current rules, kept for parity). */
	cwd: string;
}

/** A block decision. Returning `null` means "allow". */
export type GuardDecision = { block: true; reason: string } | null;

function block(reason: string): GuardDecision {
	return { block: true, reason };
}

/**
 * Evaluate a bash command string against secrets + never-do + protected-path /
 * dangerous policy.
 *   - Secrets: always blocked (credential exfiltration).
 *   - Never-do: always blocked (ship commands + auth/payment/architecture CHANGES).
 *   - Protected paths written via bash redirection (`>`, `>>`, `tee`, `sed -i`,
 *     `cp`, `mv`): always blocked — defeats the write/edit path gate (FR12).
 *   - Dangerous: blocked only when `!ctx.hasUI`.
 */
export function evaluateBashCommand(command: string, ctx: GuardCtx): GuardDecision {
	for (const pattern of SECRETS_PATTERNS) {
		if (pattern.test(command)) {
			return block(`Blocked secret/credential pattern (matched /${pattern.source}/): ${command}`);
		}
	}
	for (const pattern of NEVER_DO_PATTERNS) {
		if (pattern.test(command)) {
			return block(`Blocked by never-do rule (matched /${pattern.source}/): ${command}`);
		}
	}
	for (const target of extractBashWriteTargets(command)) {
		const d = evaluatePath(target);
		if (d) {
			return block(`Protected path written via bash redirection: ${target}`);
		}
	}
	if (!ctx.hasUI) {
		for (const pattern of DANGEROUS_PATTERNS) {
			if (pattern.test(command)) {
				return block(`Blocked dangerous command in unattended mode (matched /${pattern.source}/): ${command}`);
			}
		}
	}
	return null;
}

/**
 * Extract file paths that a bash command WRITES to via redirection or
 * copy/move/in-place-edit, so they can be matched against PROTECTED_BASENAMES.
 *
 * Covers: `> file`, `>> file` (with optional fd prefix like `2>`), `tee file`,
 * `tee -a file`, `sed -i ... file` (last non-flag token), `cp src dst` / `mv src dst`
 * (last non-flag token = destination). Pure, no side effects.
 */
function extractBashWriteTargets(command: string): string[] {
	const targets: string[] = [];
	let m: RegExpExecArray | null;

	// `> file` and `>> file` (optional fd prefix like `2>`). Skip `&...` (e.g. `2>&1`).
	const redir = /(?:\d)?>>?\s*('([^']*)'|"([^"]*)"|(\S+))/g;
	while ((m = redir.exec(command)) !== null) {
		const t = stripQuotes(m[2] ?? m[3] ?? m[4] ?? "");
		if (t && !t.startsWith("&")) targets.push(t);
	}

	// `tee <file>` (with optional flags like `-a`).
	const tee = /\btee\b(?:\s+-[a-zA-Z]+)*\s+('([^']*)'|"([^"]*)"|(\S+))/g;
	while ((m = tee.exec(command)) !== null) {
		targets.push(stripQuotes(m[2] ?? m[3] ?? m[4] ?? ""));
	}

	// `sed -i <script> <file>`: last non-flag token is the in-place target.
	if (/\bsed\b[^|;&\n]*\s-i\b/.test(command)) {
		const sed = /\bsed\b([^|;&\n]*)/g;
		while ((m = sed.exec(command)) !== null) {
			const tokens = m[1].trim().split(/\s+/).filter((x) => x && !x.startsWith("-"));
			if (tokens.length >= 1) targets.push(stripQuotes(tokens[tokens.length - 1]));
		}
	}

	// `cp <src...> <dst>` / `mv <src...> <dst>`: last non-flag token is the destination.
	for (const cmd of ["cp", "mv"] as const) {
		const re = new RegExp("\\b" + cmd + "\\b([^|;&\\n]*)", "g");
		while ((m = re.exec(command)) !== null) {
			const tokens = m[1].trim().split(/\s+/).filter((x) => x && !x.startsWith("-"));
			if (tokens.length >= 2) targets.push(stripQuotes(tokens[tokens.length - 1]));
		}
	}

	return targets;
}

function stripQuotes(s: string): string {
	return s.replace(/^["']|['"]$/g, "");
}

/**
 * Case-insensitive basename membership test. macOS uses a case-insensitive
 * filesystem, so `VISION.MD` / `Package.JSON` must not bypass protection.
 */
function isProtectedBasename(base: string): boolean {
	if (!base) return false;
	const lower = base.toLowerCase();
	return PROTECTED_BASENAMES.some((b) => b.toLowerCase() === lower);
}

/**
 * Evaluate a file path for write/edit protection. Matches the basename against
 * the protected list (case-insensitively). Returns a block decision or null.
 */
export function evaluatePath(filePath: string): GuardDecision {
	if (!filePath) return null;
	const base = path.basename(filePath);
	if (isProtectedBasename(base)) {
		return block(`Protected path "${filePath}" (basename "${base}") cannot be written/edited by the loop`);
	}
	return null;
}

/**
 * Combined, tool-name-dispatched decision used by the `tool_call` handler.
 *
 * `toolName` and `input` come from the narrowed event after `isToolCallEventType`.
 * Kept SDK-agnostic (string + optional fields) so it is unit-testable without the SDK.
 */
export function decideToolCall(
	toolName: string,
	input: { command?: string; path?: string } | undefined,
	ctx: GuardCtx,
): GuardDecision {
	if (toolName === "bash") {
		const command = input?.command;
		if (typeof command === "string") {
			return evaluateBashCommand(command, ctx);
		}
		return null;
	}
	if (toolName === "write" || toolName === "edit") {
		const filePath = input?.path;
		if (typeof filePath === "string") {
			return evaluatePath(filePath);
		}
		return null;
	}
	// read / grep / find / ls / custom tools: never blocked by this guard.
	return null;
}

// ---------------------------------------------------------------------------
// pi extension wiring — uses isToolCallEventType for safe type narrowing.
// ---------------------------------------------------------------------------

/**
 * Structural supertype of every `tool_call` event. Used so this file type-checks
 * cleanly even when `@earendil-works/pi-coding-agent` is NOT resolvable by the
 * standalone tsc used in the compile gate (it is globally installed and resolved
 * by the pi runtime loader). At runtime the real SDK `ToolCallEvent` is passed in
 * and is structurally assignable to this supertype.
 */
interface AnyToolCallEvent {
	type: "tool_call";
	toolCallId: string;
	toolName: string;
	input: Record<string, unknown>;
}

interface BashInput {
	command: string;
	timeout?: number;
}
interface EditInput {
	path: string;
	edits: Array<{ oldText: string; newText: string }>;
}
interface WriteInput {
	path: string;
	content: string;
}

/**
 * Local mirror of the SDK's `isToolCallEventType` overloaded signature, so the
 * narrowing in `handleToolCall` is statically sound regardless of whether the
 * SDK module resolves at compile time. The runtime value is the genuine SDK
 * function (see `loadSdk`); this type only describes how we call it.
 */
type IsToolCallEventType = {
	(toolName: "bash", event: AnyToolCallEvent): event is AnyToolCallEvent & { toolName: "bash"; input: BashInput };
	(toolName: "write", event: AnyToolCallEvent): event is AnyToolCallEvent & { toolName: "write"; input: WriteInput };
	(toolName: "edit", event: AnyToolCallEvent): event is AnyToolCallEvent & { toolName: "edit"; input: EditInput };
	<TName extends string, TInput extends Record<string, unknown>>(
		toolName: TName,
		event: AnyToolCallEvent,
	): event is AnyToolCallEvent & { toolName: TName; input: TInput };
};

// Cached SDK import so we only pay the dynamic import once.
let sdkCache: { isToolCallEventType: IsToolCallEventType } | null = null;
async function loadSdk(): Promise<{ isToolCallEventType: IsToolCallEventType }> {
	if (sdkCache) return sdkCache;
	// Dynamic import: the package is globally installed and resolved by the pi
	// runtime loader. A static top-level value import would fail under tsx/tsc
	// in this repo (the package is not a local dependency), so we defer it here.
	const sdk = await import("@earendil-works/pi-coding-agent");
	// The SDK exports `isToolCallEventType` with exactly the `IsToolCallEventType`
	// shape; the cast bridges the local-vs-global resolution gap (not a toolName
	// cast — it just gives tsc a stable signature when the module is unresolved).
	sdkCache = { isToolCallEventType: sdk.isToolCallEventType as IsToolCallEventType };
	return sdkCache;
}

/**
 * `tool_call` handler: uses the SDK's `isToolCallEventType` to narrow the union
 * event into a typed bash/write/edit event, then delegates to the pure
 * `decideToolCall` predicate. Extracted so the narrowing is observable in isolation.
 */
async function handleToolCall(event: AnyToolCallEvent, ctx: { hasUI?: boolean; cwd?: string }) {
	const { isToolCallEventType } = await loadSdk();
	// Default hasUI to `true` when missing: assume attended/interactive unless
	// explicitly told unattended — avoids false-positive unattended-level blocking.
	const guardCtx: GuardCtx = { hasUI: ctx?.hasUI ?? true, cwd: ctx?.cwd ?? "" };

	if (isToolCallEventType("bash", event)) {
		return decideToolCall("bash", { command: event.input.command }, guardCtx);
	}
	if (isToolCallEventType("write", event)) {
		return decideToolCall("write", { path: event.input.path }, guardCtx);
	}
	if (isToolCallEventType("edit", event)) {
		return decideToolCall("edit", { path: event.input.path }, guardCtx);
	}
	// read / grep / find / ls / custom: allow.
	return null;
}

export default function loopGuard(pi: ExtensionAPI): void {
	pi.on("tool_call", async (event, ctx) => {
		return handleToolCall(event, ctx);
	});
}