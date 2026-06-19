import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readCorePackages,
  readOptionalPackages,
  npmNameFromId,
  isInstalled,
  installCommand,
} from "../src/commands/install.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-install-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  process.argv = ["node", "mdpi"];
  process.exitCode = 0;
});

function writePi(rel: string, content: string): void {
  const full = join(dir, ".pi", rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function settingsWith(packages: unknown): string {
  writePi(
    "settings.json",
    JSON.stringify({ $schema: "https://pi.dev/schema/settings.json", packages }),
  );
  return join(dir, ".pi");
}

describe("npmNameFromId", () => {
  it("strips the npm: prefix from a scoped package", () => {
    expect(npmNameFromId("npm:@davecodes/pi-dcp")).toBe("@davecodes/pi-dcp");
  });
  it("strips the npm: prefix from an unscoped package", () => {
    expect(npmNameFromId("npm:pi-hermes-memory")).toBe("pi-hermes-memory");
  });
  it("returns null for non-npm sources (git:/url)", () => {
    expect(npmNameFromId("git:github.com/u/r")).toBeNull();
    expect(npmNameFromId("https://x/y")).toBeNull();
  });
});

describe("isInstalled", () => {
  it("returns false for a non-npm source (cannot cheaply check)", () => {
    expect(isInstalled("git:github.com/u/r")).toBe(false);
  });
  it("returns false for an npm package absent from the global npm dir", () => {
    // Use a package name guaranteed not to exist under the real global dir.
    expect(isInstalled("npm:@this/does-not-exist-mdpi-test")).toBe(false);
  });
});

describe("readCorePackages", () => {
  it("reads the packages array from settings.json", () => {
    const piDir = settingsWith(["npm:@sting8k/pi-srcwalk", "npm:pi-hermes-memory"]);
    const core = readCorePackages(piDir);
    expect(core.map((p) => p.id)).toEqual(["npm:@sting8k/pi-srcwalk", "npm:pi-hermes-memory"]);
    expect(core.every((p) => p.source === "core")).toBe(true);
  });

  it("returns [] when settings.json is missing", () => {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    expect(readCorePackages(join(dir, ".pi"))).toEqual([]);
  });

  it("returns [] when settings.json is invalid JSON", () => {
    writePi("settings.json", "{not json");
    expect(readCorePackages(join(dir, ".pi"))).toEqual([]);
  });

  it("returns [] when packages is absent or not an array", () => {
    writePi("settings.json", JSON.stringify({ skills: ["./skills"] }));
    expect(readCorePackages(join(dir, ".pi"))).toEqual([]);
    writePi("settings.json", JSON.stringify({ packages: "npm:foo" }));
    expect(readCorePackages(join(dir, ".pi"))).toEqual([]);
  });

  it("drops non-string entries", () => {
    const piDir = settingsWith(["npm:foo", 42, null, "", "npm:bar"]);
    expect(readCorePackages(piDir).map((p) => p.id)).toEqual(["npm:foo", "npm:bar"]);
  });
});

describe("readOptionalPackages", () => {
  it("reads the optional array with notes from packages.json", () => {
    writePi(
      "packages.json",
      JSON.stringify({
        optional: [
          { id: "npm:@davecodes/pi-dcp", note: "context pruning" },
          { id: "npm:pi-guard" },
        ],
      }),
    );
    const opt = readOptionalPackages(join(dir, ".pi"));
    expect(opt).toHaveLength(2);
    expect(opt[0]).toEqual({ id: "npm:@davecodes/pi-dcp", note: "context pruning", source: "optional" });
    expect(opt[1]).toEqual({ id: "npm:pi-guard", note: undefined, source: "optional" });
  });

  it("returns [] when packages.json is missing", () => {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    expect(readOptionalPackages(join(dir, ".pi"))).toEqual([]);
  });

  it("returns [] when optional is absent or not an array", () => {
    writePi("packages.json", JSON.stringify({ core: [] }));
    expect(readOptionalPackages(join(dir, ".pi"))).toEqual([]);
    writePi("packages.json", JSON.stringify({ optional: "nope" }));
    expect(readOptionalPackages(join(dir, ".pi"))).toEqual([]);
  });

  it("skips entries without a string id", () => {
    writePi(
      "packages.json",
      JSON.stringify({
        optional: [{ id: "npm:ok" }, { note: "no id" }, { id: 5 }, null, "str"],
      }),
    );
    const opt = readOptionalPackages(join(dir, ".pi"));
    expect(opt.map((p) => p.id)).toEqual(["npm:ok"]);
  });
});

describe("installCommand", () => {
  it("errors with exitCode 1 when .pi/ is missing", async () => {
    process.argv = ["node", "mdpi", "--quiet"];
    process.exitCode = 0;
    await installCommand({ piDir: join(dir, ".pi") });
    expect(process.exitCode).toBe(1);
  });

  it("--check reports missing packages without shelling out (sets exitCode 1 when some missing)", async () => {
    // core: a real-ish npm id that won't be in the global dir; optional: same.
    const piDir = settingsWith(["npm:@mdpi-test/never-installed-core"]);
    writeFileSync(
      join(piDir, "packages.json"),
      JSON.stringify({ optional: [{ id: "npm:@mdpi-test/never-installed-opt", note: "test" }] }),
    );
    process.argv = ["node", "mdpi", "--quiet"];
    process.exitCode = 0;
    await installCommand({ check: true, piDir });
    // Both are missing → exitCode 1.
    expect(process.exitCode).toBe(1);
  });

  it("does nothing and exits 0 when no packages are declared", async () => {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    writePi("settings.json", JSON.stringify({ packages: [] }));
    writePi("packages.json", JSON.stringify({ optional: [] }));
    process.argv = ["node", "mdpi", "--quiet"];
    process.exitCode = 0;
    await installCommand({ piDir: join(dir, ".pi") });
    expect(process.exitCode).toBe(0);
  });
});