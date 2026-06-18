import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildManifestFromDir,
  fileModificationStatus,
  generateManifest,
  hashContent,
  hashFile,
  loadManifest,
  MANIFEST_FILE,
  type TemplateManifest,
} from "../src/utils/manifest.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mdpi-man-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("hashContent", () => {
  it("is deterministic — same content yields same hash", () => {
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });

  it("differs for different content", () => {
    expect(hashContent("hello")).not.toBe(hashContent("world"));
  });

  it("returns a 64-char hex string (sha-256)", () => {
    expect(hashContent("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashFile", () => {
  it("matches hashContent for the same bytes", () => {
    const f = join(dir, "a.txt");
    writeFileSync(f, "body");
    expect(hashFile(f)).toBe(hashContent("body"));
  });
});

describe("buildManifestFromDir", () => {
  it("walks recursively and records relative paths → hash", () => {
    mkdirSync(join(dir, "skills", "foo"), { recursive: true });
    writeFileSync(join(dir, "skills", "foo", "SKILL.md"), "# foo");
    writeFileSync(join(dir, "README.md"), "# kit");
    const m = buildManifestFromDir(dir);
    expect(Object.keys(m).sort()).toEqual(["README.md", "skills/foo/SKILL.md"]);
    expect(m["README.md"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("skips configured skip dirs (node_modules, .git, dist, coverage)", () => {
    mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "pkg", "index.js"), "x");
    writeFileSync(join(dir, "keep.md"), "y");
    const m = buildManifestFromDir(dir);
    expect(Object.keys(m)).toEqual(["keep.md"]);
  });

  it("excludes the manifest file itself from the hash map", () => {
    writeFileSync(join(dir, "a.md"), "a");
    // generateManifest writes MANIFEST_FILE inside dir, then we re-walk.
    generateManifest(dir, "1.0.0");
    const m = buildManifestFromDir(dir);
    expect(Object.keys(m)).toEqual(["a.md"]);
    expect(MANIFEST_FILE in m).toBe(false);
  });
});

describe("generateManifest / loadManifest", () => {
  it("writes a manifest file with version + createdAt + files, and round-trips", () => {
    writeFileSync(join(dir, "x.md"), "x");
    const m = generateManifest(dir, "9.9.9");
    expect(m.version).toBe("9.9.9");
    expect(typeof m.createdAt).toBe("string");
    expect(m.files["x.md"]).toMatch(/^[0-9a-f]{64}$/);

    const loaded = loadManifest(dir);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe("9.9.9");
    expect(loaded!.files["x.md"]).toBe(m.files["x.md"]);
  });

  it("loadManifest returns null when no manifest exists", () => {
    expect(loadManifest(dir)).toBeNull();
  });

  it("loadManifest returns null on invalid JSON", () => {
    writeFileSync(join(dir, MANIFEST_FILE), "{not json");
    expect(loadManifest(dir)).toBeNull();
  });
});

describe("fileModificationStatus", () => {
  const manifest: TemplateManifest = {
    version: "1.0.0",
    createdAt: "2026-01-01T00:00:00.000Z",
    files: { "a.md": hashContent("orig") },
  };

  it("returns 'unknown' when there is no manifest", () => {
    expect(fileModificationStatus(join(dir, "a.md"), "a.md", null)).toBe("unknown");
  });

  it("returns 'unknown' when the file is not tracked in the manifest", () => {
    writeFileSync(join(dir, "b.md"), "x");
    expect(fileModificationStatus(join(dir, "b.md"), "b.md", manifest)).toBe("unknown");
  });

  it("returns 'unmodified' when the current hash matches the manifest hash", () => {
    writeFileSync(join(dir, "a.md"), "orig");
    expect(fileModificationStatus(join(dir, "a.md"), "a.md", manifest)).toBe("unmodified");
  });

  it("returns 'modified' when the current hash differs from the manifest hash", () => {
    writeFileSync(join(dir, "a.md"), "CHANGED");
    expect(fileModificationStatus(join(dir, "a.md"), "a.md", manifest)).toBe("modified");
  });

  it("returns 'unmodified' for a tracked file that has been deleted (treated as fresh-install)", () => {
    expect(existsSync(join(dir, "a.md"))).toBe(false);
    expect(fileModificationStatus(join(dir, "a.md"), "a.md", manifest)).toBe("unmodified");
  });
});