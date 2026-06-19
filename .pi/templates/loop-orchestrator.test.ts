/**
 * loop-orchestrator.test.ts — pure-helper TDD for the Node SDK orchestrator (T9).
 *
 * Covers the pure, side-effect-free helpers only. The runtime smoke (real
 * worktree + real pi + real gh on a throwaway repo) is deferred to T15
 * (supervised checkpoint). Run with: `npx tsx --test .pi/templates/loop-orchestrator.test.ts`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
	parseGateCommand,
	buildMakerPrompt,
	nextItemId,
	updateStateJson,
	isAlreadyProcessed,
	auditShipToolCalls,
	MAKER_TOOLS,
} from "./loop-orchestrator.ts";

// ---------------------------------------------------------------------------
// Sample fixtures
// ---------------------------------------------------------------------------

const VISION_WITH_GATE = `# Loop Vision

## Goal
Do the thing.

## Scope
- edit src/

## Gate

Command (exit 0 = pass):

\`\`\`bash
npm test
\`\`\`

**Pass:** ship.
`;

const VISION_NO_GATE_HEADING = `# Loop Vision

## Goal
Do the thing.

\`\`\`bash
npm test
\`\`\`
`;

const VISION_GATE_EMPTY_BLOCK = `# Loop Vision

## Gate

\`\`\`bash
\`\`\`

end
`;

const VISION_GATE_MULTIPLE_BLOCKS = `# Loop Vision

## Gate

\`\`\`bash
npm test
\`\`\`

\`\`\`bash
npm run lint
\`\`\`

end
`;

const VISION_GATE_UNTERMINATED = `# Loop Vision

## Gate

\`\`\`bash
npm test
`;

const VISION_GATE_NEXT_HEADING_ENDS = `# Loop Vision

## Gate

\`\`\`bash
npm test
\`\`\`

## Scope
- edit src/
`;

const STATE = {
	loop_name: "ci-triage",
	owner: "ops",
	cadence: "manual",
	last_run: null,
	in_progress: ["item-9"],
	completed: [],
	escalated: [],
	failures: [],
	lessons: [],
	processed: ["item-1", "item-2"],
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

// ---------------------------------------------------------------------------
// parseGateCommand
// ---------------------------------------------------------------------------

test("parseGateCommand: extracts first ```bash under ## Gate", () => {
	assert.equal(parseGateCommand(VISION_WITH_GATE), "npm test");
});

test("parseGateCommand: trims surrounding whitespace per line", () => {
	const md = `## Gate\n\n\`\`\`bash\n   npm test  \n  npm run lint  \n\`\`\`\n`;
	assert.equal(parseGateCommand(md), "npm test\nnpm run lint");
});

test("parseGateCommand: section ends at next level-2 heading (still returns the one block)", () => {
	assert.equal(parseGateCommand(VISION_GATE_NEXT_HEADING_ENDS), "npm test");
});

test("parseGateCommand: returns null when ## Gate heading is missing", () => {
	assert.equal(parseGateCommand(VISION_NO_GATE_HEADING), null);
});

test("parseGateCommand: returns null when the bash block is empty", () => {
	assert.equal(parseGateCommand(VISION_GATE_EMPTY_BLOCK), null);
});

test("parseGateCommand: returns null when multiple bash blocks under ## Gate", () => {
	assert.equal(parseGateCommand(VISION_GATE_MULTIPLE_BLOCKS), null);
});

test("parseGateCommand: returns null when the block is unterminated", () => {
	assert.equal(parseGateCommand(VISION_GATE_UNTERMINATED), null);
});

test("parseGateCommand: returns null for empty input", () => {
	assert.equal(parseGateCommand(""), null);
});

// ---------------------------------------------------------------------------
// buildMakerPrompt
// ---------------------------------------------------------------------------

test("buildMakerPrompt: contains the loop name", () => {
	const p = buildMakerPrompt("ci-triage", VISION_WITH_GATE, STATE);
	assert.match(p, /ci-triage/);
});

test("buildMakerPrompt: tells the maker it cannot ship", () => {
	const p = buildMakerPrompt("ci-triage", VISION_WITH_GATE, STATE);
	assert.match(p, /cannot ship|CANNOT SHIP|do not.*push/i);
});

test("buildMakerPrompt: references VISION.md", () => {
	const p = buildMakerPrompt("ci-triage", VISION_WITH_GATE, STATE);
	assert.match(p, /VISION\.md/);
});

// ---------------------------------------------------------------------------
// nextItemId
// ---------------------------------------------------------------------------

test("nextItemId: returns the first in_progress item when present", () => {
	assert.equal(nextItemId(STATE), "item-9");
});

test("nextItemId: falls back to provided fallback when in_progress is empty", () => {
	const s = { ...STATE, in_progress: [] };
	assert.equal(nextItemId(s, "manual-42"), "manual-42");
});

// ---------------------------------------------------------------------------
// updateStateJson
// ---------------------------------------------------------------------------

test("updateStateJson: applies a shallow top-level patch", () => {
	const next = updateStateJson(STATE, { last_run: "2026-01-01T00:00:00Z" });
	assert.equal(next.last_run, "2026-01-01T00:00:00Z");
	// immutability: original untouched
	assert.equal(STATE.last_run, null);
});

test("updateStateJson: shallow-merges metrics", () => {
	const next = updateStateJson(STATE, { metrics: { ...STATE.metrics, runs: 5 } });
	assert.equal(next.metrics.runs, 5);
	assert.equal(next.metrics.items_fixed, 0);
});

// ---------------------------------------------------------------------------
// isAlreadyProcessed
// ---------------------------------------------------------------------------

test("isAlreadyProcessed: true for a processed item", () => {
	assert.equal(isAlreadyProcessed(STATE, "item-1"), true);
});

test("isAlreadyProcessed: false for an unprocessed item", () => {
	assert.equal(isAlreadyProcessed(STATE, "item-99"), false);
});

test("isAlreadyProcessed: false when processed is missing", () => {
	const s = { ...STATE, processed: undefined as unknown as string[] };
	assert.equal(isAlreadyProcessed(s, "item-1"), false);
});

// ---------------------------------------------------------------------------
// auditShipToolCalls
// ---------------------------------------------------------------------------

test("auditShipToolCalls: ok for maker-only tools", () => {
	assert.deepEqual(auditShipToolCalls(["bash", "edit", "read", "grep", "find", "write"]), {
		ok: true,
		offenders: [],
	});
});

test("auditShipToolCalls: flags push", () => {
	assert.deepEqual(auditShipToolCalls(["bash", "push"]), {
		ok: false,
		offenders: ["push"],
	});
});

test("auditShipToolCalls: flags pr and slack", () => {
	const r = auditShipToolCalls(["bash", "pr", "slack"]);
	assert.equal(r.ok, false);
	assert.deepEqual(r.offenders.sort(), ["pr", "slack"]);
});

test("auditShipToolCalls: case-insensitive", () => {
	assert.deepEqual(auditShipToolCalls(["Push", "SLACK"]), {
		ok: false,
		offenders: ["Push", "SLACK"],
	});
});

test("MAKER_TOOLS: does not include any ship tool", () => {
	const ship = new Set(["push", "pr", "slack"]);
	for (const t of MAKER_TOOLS) {
		assert.equal(ship.has(t), false, `maker allowlist must not include ${t}`);
	}
});