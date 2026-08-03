import { defineConfig } from "rolldown";

export default defineConfig({
  // Point this to your extension's main entry file
  input: "src/extension.ts",

  output: {
    // The standard VS Code generator uses 'out' or 'dist'
    file: "out/extension.js",
    format: "cjs", // VS Code extensions currently require CommonJS
    sourcemap: true, // Crucial for breakpoints/debugging in VS Code
  },

  // Treat Node built-ins (like fs, path) natively rather than bundling them
  platform: "node",

  // DO NOT bundle the 'vscode' module, as the VS Code host provides it at runtime
  external: ["vscode"],
});
