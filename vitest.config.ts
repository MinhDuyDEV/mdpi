import { defineConfig } from "vitest/config";

/**
 * Vitest config — unit tests for mdpi CLI (manifest, upgrade, lint).
 *
 * Node environment (tests touch the real fs via os.tmpdir). No browser DOM.
 * Test files live in tests/ and match *.test.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});