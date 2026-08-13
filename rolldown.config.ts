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
      format: "esm",
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
