import { defineConfig } from "rolldown";

export default defineConfig([
  // Extension Host Configuration (Node.js Environment)
  {
    input: "src/extension.ts",
    output: {
      dir: "out",
      // Required for VS Code Engine
      format: "esm",
      sourcemap: true,
      minify: false,
    },
    optimization: {
      inlineConst: { mode: "all", pass: 3 },
    },
    // Treats node built-ins natively
    platform: "node",
    // Keeps vscode external
    external: ["vscode", "node:fs", "node:path", "node:crypto"],
    tsconfig: "./tsconfig.node.json",
  },

  // Webview (Browser Environment)
  {
    input: "webview/mainWebView.ts",
    logLevel: "debug",
    output: {
      dir: "out",
      // Modern browsers natively support ES Modules
      format: "esm",
      // format: "iife",
      sourcemap: true,
      minify: false,
    },
    optimization: {
      inlineConst: { mode: "all", pass: 3 },
    },
    // Informs Rolldown this code runs in a browser environment
    platform: "browser",
    external: ["vscode", "node:fs", "node:path", "node:crypto"],
    tsconfig: "./tsconfig.webview.json",
    // plugins: [
    //   // replacePlugin(
    //   //   {
    //   //     // "/*JS_CONTENT*/": jsContent,
    //   //     "/*CSS_CONTENT*/": cssContent,
    //   //   },
    //   //   {
    //   //     preventAssignment: false,
    //   //   },
    //   // ),
    //   {
    //     name: "inject-import-map",
    //     generateBundle(_, bundle) {
    //       // const chunkImportMap = bundle['importmap.json'];
    //       // if (chunkImportMap?.type === 'asset') {
    //       const htmlContent: string = fs.readFileSync(
    //         path.resolve("src/webView/mainWebView.html"),
    //         "utf-8",
    //       );
    //       // const jsContent: string = fs.readFileSync(
    //       //   path.resolve("src/webView/mainWebView.js"),
    //       //   "utf-8",
    //       // );
    //       const cssContent: string = fs.readFileSync(
    //         path.resolve("src/webView/mainWebView.css"),
    //         "utf-8",
    //       );
    //       const keys: string[] = Object.keys(bundle);
    //       for (let i: number = 0; i < keys.length; i++) {
    //         const fileName: string | undefined = keys[i];
    //         if (fileName !== undefined) {
    //           const chunk = bundle[fileName];
    //           if (chunk?.type === "chunk") {
    //             console.log("chunk: ", chunk);
    //             console.log("chunk.code: ", chunk.code);
    //           }
    //         }
    //       }
    //     },
    //   },
    // ],
  },
]);

// export default defineConfig({
//   input: ["src/extension.ts", "src/mainWebView.ts"],
//   output: {
//     dir: "out",
//     // VS Code extensions currently require CommonJS
//     format: "commonjs",
//     // Crucial for breakpoints/debugging in VS Code
//     sourcemap: true,
//     minify: true,
//     cleanDir: true,
//   },

//   // Treat Node built-ins (like fs, path) natively rather than bundling them
//   platform: "node",
//   tsconfig: "./tsconfig.json",
//   // DO NOT bundle the 'vscode' module, as the VS Code host provides it at runtime
//   external: ["vscode"],
// });

// export default defineConfig(
//   {
//     // Point this to your extension's main entry file
//     input: "src/extension.ts",

//     output: {
//       // The standard VS Code generator uses 'out' or 'dist'
//       file: "out/extension.js",
//       format: "commonjs", // VS Code extensions currently require CommonJS
//       sourcemap: true, // Crucial for breakpoints/debugging in VS Code
//       minify: false, // Set to true for production builds
//       cleanDir: true,
//     },

//     // Treat Node built-ins (like fs, path) natively rather than bundling them
//     platform: "node",
//     tsconfig: "./tsconfig.json",
//     // DO NOT bundle the 'vscode' module, as the VS Code host provides it at runtime
//     external: ["vscode"],
//   },
//   {
//     // Point this to your extension's main entry file
//     input: "src/mainWebView.ts",

//     output: {
//       // The standard VS Code generator uses 'out' or 'dist'
//       file: "out/mainWebView.js",
//       format: "commonjs", // VS Code extensions currently require CommonJS
//       sourcemap: true, // Crucial for breakpoints/debugging in VS Code
//       minify: false, // Set to true for production builds
//       cleanDir: true,
//     },

//     // Treat Node built-ins (like fs, path) natively rather than bundling them
//     platform: "node",
//     tsconfig: "./tsconfig.json",
//     // DO NOT bundle the 'vscode' module, as the VS Code host provides it at runtime
//     external: ["vscode"],
//   },
// );
