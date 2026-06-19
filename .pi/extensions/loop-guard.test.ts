/**
 * Tests for loop-guard.ts pure predicates.
 *
 * Run: npx tsx --test .pi/extensions/loop-guard.test.ts
 *
 * These tests exercise ONLY the side-effect-free decision functions exported
 * from loop-guard.ts. The live `pi.on("tool_call")` runtime hook (actually
 * blocking a forbidden command inside a pi session) is deferred to T15 after
 * settings.json registration, per the task checkpoint.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
	evaluateBashCommand,
	evaluatePath,
	decideToolCall,
	type GuardCtx,
	type GuardDecision,
} from "./loop-guard.ts";

const ATTENDED: GuardCtx = { hasUI: true, cwd: "/repo" };
const UNATTENDED: GuardCtx = { hasUI: false, cwd: "/repo" };

function blocked(d: GuardDecision): d is { block: true; reason: string } {
	return d !== null && d.block === true && typeof d.reason === "string";
}

test("evaluateBashCommand: never-do auth pattern is blocked even when attended", () => {
	const d = evaluateBashCommand("npm install @auth/core", ATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
	assert.match(d!.reason, /auth/i);
});

test("evaluateBashCommand: never-do payments pattern is blocked (stripe)", () => {
	const d = evaluateBashCommand("npm install stripe --save", ATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
});

test("evaluateBashCommand: never-do architecture pattern is blocked (refactor/restructure)", () => {
	const d = evaluateBashCommand("git commit -m 'architecture: split monolith'", ATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
});

test("evaluateBashCommand: dangerous rm -rf is blocked when unattended (!hasUI)", () => {
	const d = evaluateBashCommand("rm -rf /", UNATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
	assert.match(d!.reason, /rm|dangerous|unattended/i);
});

test("evaluateBashCommand: dangerous rm -rf is ALLOWED when attended (hasUI=true)", () => {
	const d = evaluateBashCommand("rm -rf /tmp/junk", ATTENDED);
	assert.equal(d, null);
});

test("evaluateBashCommand: sudo is blocked when unattended", () => {
	const d = evaluateBashCommand("sudo apt-get update", UNATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
});

test("evaluateBashCommand: sudo is ALLOWED when attended", () => {
	const d = evaluateBashCommand("sudo apt-get update", ATTENDED);
	assert.equal(d, null);
});

test("evaluateBashCommand: chmod 777 is blocked when unattended", () => {
	const d = evaluateBashCommand("chmod 777 .", UNATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
});

test("evaluateBashCommand: benign command is allowed", () => {
	assert.equal(evaluateBashCommand("ls -la", UNATTENDED), null);
	assert.equal(evaluateBashCommand("npm test", ATTENDED), null);
});

test("evaluatePath: package.json is protected on write/edit", () => {
	assert.ok(blocked(evaluatePath("package.json")));
	assert.ok(blocked(evaluatePath("./package.json")));
	assert.ok(blocked(evaluatePath("/repo/package.json")));
});

test("evaluatePath: VISION.md is protected", () => {
	assert.ok(blocked(evaluatePath("VISION.md")));
	assert.ok(blocked(evaluatePath(".pi/loops/gc/VISION.md")));
});

test("evaluatePath: lockfiles are protected", () => {
	assert.ok(blocked(evaluatePath("package-lock.json")));
	assert.ok(blocked(evaluatePath("pnpm-lock.yaml")));
	assert.ok(blocked(evaluatePath("yarn.lock")));
});

test("evaluatePath: gate script is protected", () => {
	assert.ok(blocked(evaluatePath(".pi/loops/gc/gate.sh")));
	assert.ok(blocked(evaluatePath("gate.sh")));
});

test("evaluatePath: ordinary source path is allowed", () => {
	assert.equal(evaluatePath("src/foo.ts"), null);
	assert.equal(evaluatePath("./lib/util.js"), null);
});

test("decideToolCall: dispatches bash via input.command", () => {
	const d = decideToolCall("bash", { command: "rm -rf /" }, UNATTENDED);
	assert.ok(blocked(d));
});

test("decideToolCall: dispatches edit via input.path (package.json blocked)", () => {
	const d = decideToolCall("edit", { path: "package.json" }, ATTENDED);
	assert.ok(blocked(d));
});

test("decideToolCall: dispatches write via input.path (lockfile blocked)", () => {
	const d = decideToolCall("write", { path: "yarn.lock" }, ATTENDED);
	assert.ok(blocked(d));
});

test("decideToolCall: read is never blocked", () => {
	assert.equal(decideToolCall("read", { path: "package.json" }, UNATTENDED), null);
});

test("decideToolCall: write to src/new.ts is allowed", () => {
	assert.equal(decideToolCall("write", { path: "src/new.ts" }, UNATTENDED), null);
});