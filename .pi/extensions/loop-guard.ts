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
 * Never-do bash command patterns. Always blocked (attended or not).
 *
 * These match keywords that signal the maker is reaching outside its allowed
 * surface (auth, payments/billing, or architectural changes per Rule 4).
 */
export const NEVER_DO_PATTERNS: readonly RegExp[] = [
	// auth / secrets / credentials
	/\b(auth|oauth|jwt|credential|credentials|password|passwd|secret[_-]?key|api[_-]?key)\b/i,
	// payments / billing / monetization
	/\b(payment|payments|stripe|billing|checkout|subscription|subscriptions|paddle|lemonsqueezy)\b/i,
	// architecture: refactors, rewrites, migrations, dep/library swaps (Rule 4 territory)
	/\b(architecture|architectural|refactor|refactoring|restructure|restructuring|rewrite|migration|migrate)\b/i,
];

/**
 * Dangerous bash command patterns. Blocked ONLY when `!ctx.hasUI` (unattended),
 * because there is no human to confirm. When `ctx.hasUI` is true the UI can prompt,
 * so these are allowed to pass through the gate.
 */
export const DANGEROUS_PATTERNS: readonly RegExp[] = [
	// rm -rf / rm -r / --recursive (destructive recursive deletion)
	/\brm\s+(-rf?|--recursive)/i,
	// privilege escalation
	/\bsudo\b/i,
	// world-writable permission grants
	/\b(chmod|chown)\b[^\n&|;]*\b777\b/,
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
 * Evaluate a bash command string against never-do + dangerous policy.
 * Never-do always blocks. Dangerous blocks only when `!ctx.hasUI`.
 */
export function evaluateBashCommand(command: string, ctx: GuardCtx): GuardDecision {
	for (const pattern of NEVER_DO_PATTERNS) {
		if (pattern.test(command)) {
			return block(`Blocked by never-do rule (matched /${pattern.source}/): ${command}`);
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
 * Evaluate a file path for write/edit protection. Matches the basename against
 * the protected list. Returns a block decision or null to allow.
 */
export function evaluatePath(filePath: string): GuardDecision {
	if (!filePath) return null;
	const base = path.basename(filePath);
	if (PROTECTED_BASENAMES.includes(base)) {
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
async function handleToolCall(event: AnyToolCallEvent, ctx: { hasUI: boolean; cwd: string }) {
	const { isToolCallEventType } = await loadSdk();
	const guardCtx: GuardCtx = { hasUI: ctx.hasUI, cwd: ctx.cwd };

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