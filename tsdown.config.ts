import { defineConfig } from "tsdown";

// tsdown bundles src/index.ts → dist/index.js (ESM, Node platform).
// The shebang in src/index.ts is preserved so `dist/index.js` is executable
// as the `mdpi` bin. JSON imports (package.json) are inlined into the bundle.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  clean: true,
  fixedExtension: false,
});