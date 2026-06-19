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

// Updated: the original `git commit -m 'architecture: ...'` is now blocked by the
// Fix 1 ship-command pattern (`git commit`), not the architecture pattern. This
// test now exercises the architecture pattern via a mutating verb (`npm install`)
// + the `migration` keyword, which is NOT caught by any ship-command pattern.
test("evaluateBashCommand: never-do architecture pattern is blocked (migration via npm install)", () => {
	const d = evaluateBashCommand("npm install migration-tool", ATTENDED);
	assert.ok(blocked(d), `expected block, got ${JSON.stringify(d)}`);
	assert.match(d!.reason, /migration|architecture|never-do/i);
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

// ---------------------------------------------------------------------------
// Fix 1 — ship commands (FR6): the maker must never ship. Blocked attended AND unattended.
// ---------------------------------------------------------------------------

for (const mode of [ATTENDED, UNATTENDED] as const) {
	const label = mode.hasUI ? "attended" : "unattended";
	test(`Fix1: git push is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("git push origin main", mode)));
		assert.ok(blocked(evaluateBashCommand("git push", mode)));
	});
	test(`Fix1: gh pr create is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("gh pr create --fill", mode)));
	});
	test(`Fix1: gh pr merge is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("gh pr merge 123", mode)));
	});
	test(`Fix1: git checkout -b is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("git checkout -b feature/x", mode)));
	});
	test(`Fix1: git commit is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("git commit -m 'wip'", mode)));
	});
	test(`Fix1: git merge is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("git merge feature/x", mode)));
	});
}

// ---------------------------------------------------------------------------
// Fix 2 — protected paths written via bash redirection (defeats FR12). Always blocked.
// ---------------------------------------------------------------------------

test("Fix2: echo > package.json is blocked (protected via redirection)", () => {
	assert.ok(blocked(evaluateBashCommand("echo x > package.json", ATTENDED)));
});

test("Fix2: cat > VISION.md is blocked (protected via redirection)", () => {
		assert.ok(blocked(evaluateBashCommand("cat > VISION.md", ATTENDED)));
	});

test("Fix2: sed -i <file> package.json is blocked (protected via in-place edit)", () => {
		assert.ok(blocked(evaluateBashCommand("sed -i 's/a/b/' package.json", ATTENDED)));
	});

test("Fix2: npm test > out.log is allowed (out.log not protected)", () => {
		assert.equal(evaluateBashCommand("npm test > out.log", ATTENDED), null);
		assert.equal(evaluateBashCommand("npm test > out.log", UNATTENDED), null);
	});

test("Fix2: echo > src/foo.ts is allowed (foo.ts not protected)", () => {
		assert.equal(evaluateBashCommand("echo x > src/foo.ts", ATTENDED), null);
	});

test("Fix2: tee package.json is blocked", () => {
		assert.ok(blocked(evaluateBashCommand("echo x | tee package.json", ATTENDED)));
	});

test("Fix2: cp <src> package.json is blocked", () => {
		assert.ok(blocked(evaluateBashCommand("cp src/x package.json", ATTENDED)));
	});

test("Fix2: mv <other> VISION.md is blocked", () => {
		assert.ok(blocked(evaluateBashCommand("mv other VISION.md", ATTENDED)));
	});

// ---------------------------------------------------------------------------
// Fix 3 — dangerous-command regex bypasses. Unattended blocked; attended allowed.
// ---------------------------------------------------------------------------

test("Fix3: chmod 0777 is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("chmod 0777 .", UNATTENDED)));
});
test("Fix3: chmod 0777 is ALLOWED when attended", () => {
	assert.equal(evaluateBashCommand("chmod 0777 .", ATTENDED), null);
});
test("Fix3: chmod ugo+rwx is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("chmod ugo+rwx .", UNATTENDED)));
	});
test("Fix3: chmod ugo+rwx is ALLOWED when attended", () => {
	assert.equal(evaluateBashCommand("chmod ugo+rwx .", ATTENDED), null);
	});
test("Fix3: rm --force --recursive is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("rm --force --recursive foo", UNATTENDED)));
	});
test("Fix3: rm -f -r is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("rm -f -r foo", UNATTENDED)));
	});
test("Fix3: rm -fr is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("rm -fr foo", UNATTENDED)));
	});
test("Fix3: rm -fr is ALLOWED when attended", () => {
	assert.equal(evaluateBashCommand("rm -fr foo", ATTENDED), null);
	});
test("Fix3: find -delete is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("find . -delete", UNATTENDED)));
	});
test("Fix3: find -delete is ALLOWED when attended", () => {
	assert.equal(evaluateBashCommand("find . -delete", ATTENDED), null);
	});
test("Fix3: find -exec rm is blocked when unattended", () => {
	assert.ok(blocked(evaluateBashCommand("find . -exec rm {} \\;", UNATTENDED)));
	});

// ---------------------------------------------------------------------------
// Fix 4 — secrets always blocked; reads of sensitive topics NOT over-blocked.
// ---------------------------------------------------------------------------

for (const mode of [ATTENDED, UNATTENDED] as const) {
	const label = mode.hasUI ? "attended" : "unattended";
	test(`Fix4: printing TOKEN is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("echo $TOKEN", mode)));
	});
	test(`Fix4: printing GITHUB_TOKEN is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("echo $GITHUB_TOKEN", mode)));
	});
	test(`Fix4: AWS_ACCESS_KEY_ID is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("printenv AWS_ACCESS_KEY_ID", mode)));
	});
	test(`Fix4: AWS_SECRET_ACCESS_KEY is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("printenv AWS_SECRET_ACCESS_KEY", mode)));
	});
	test(`Fix4: API_KEY is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("export API_KEY=abc", mode)));
	});
	test(`Fix4: ACCESS_KEY is blocked (${label})`, () => {
		assert.ok(blocked(evaluateBashCommand("echo $ACCESS_KEY", mode)));
	});
}

test("Fix4: grep -ri migration is allowed (read, not a change)", () => {
	assert.equal(evaluateBashCommand("grep -ri migration src/", ATTENDED), null);
});
test("Fix4: cat docs/architecture.md is allowed (read, not a change)", () => {
	assert.equal(evaluateBashCommand("cat docs/architecture.md", ATTENDED), null);
});
test("Fix4: git log --grep=auth is allowed (read, not a change)", () => {
	assert.equal(evaluateBashCommand("git log --grep=auth", ATTENDED), null);
});
test("Fix4: npm install auth-related pkg is blocked (change)", () => {
	assert.ok(blocked(evaluateBashCommand("npm install @auth/core", ATTENDED)));
});
test("Fix4: git checkout <auth-file> is blocked (change)", () => {
	assert.ok(blocked(evaluateBashCommand("git checkout src/auth/login.ts", ATTENDED)));
});

// ---------------------------------------------------------------------------
// Fix 5 — case-insensitive basename; hasUI defaults to true when missing.
// ---------------------------------------------------------------------------

test("Fix5: VISION.MD is protected (case-insensitive)", () => {
	assert.ok(blocked(evaluatePath("VISION.MD")));
	assert.ok(blocked(evaluatePath(".pi/loops/gc/vision.md")));
});
test("Fix5: PACKAGE.JSON is protected (case-insensitive)", () => {
	assert.ok(blocked(evaluatePath("PACKAGE.JSON")));
});
test("Fix5: case-insensitive bash redirection to protected file is blocked", () => {
	assert.ok(blocked(evaluateBashCommand("echo x > PACKAGE.JSON", ATTENDED)));
});
test("Fix5: ordinary path stays allowed under case-insensitive check", () => {
	assert.equal(evaluatePath("src/VISION-helper.ts"), null);
});