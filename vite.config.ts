import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { NormalizedOutputOptions, OutputAsset, OutputBundle, OutputChunk } from "rolldown";
import { defineConfig, type ConfigEnv, type Plugin, type UserConfig } from "vite";

const extensionExternal: (string | RegExp)[] = ["vscode", /^node:/];

const webviewHtmlPath: string = fileURLToPath(
  new URL("./src/webview/mainWebView.html", import.meta.url),
);

const JS_PLACEHOLDER = "/*JS_CONTENT*/";
const CSS_PLACEHOLDER = "/*CSS_CONTENT*/";

/**
 * Replaces exactly one occurrence of `placeholder` in `source`.
 *
 * Throws if the placeholder is missing or occurs more than once.
 */
function replaceExactlyOnce(source: string, placeholder: string, replacement: string): string {
  const firstIndex: number = source.indexOf(placeholder);

  if (firstIndex === -1) {
    throw new Error(`Missing placeholder: ${placeholder}`);
  }

  // oxlint-disable-next-line legibility/no-repeated-collection-search typescript/prefer-includes
  if (source.indexOf(placeholder, firstIndex + placeholder.length) !== -1) {
    throw new Error(`Placeholder occurs more than once: ${placeholder}`);
  }

  return source.slice(0, firstIndex) + replacement + source.slice(firstIndex + placeholder.length);
}

/** Converts a Rolldown asset source to UTF-8 text. */
function assetSourceToString(source: string | Uint8Array): string {
  return typeof source === "string" ? source : Buffer.from(source).toString("utf8");
}

/** Type guard for finding the webview entry chunk in the output bundle. */
function isMainWebViewEntry(output: OutputAsset | OutputChunk): output is OutputChunk {
  return output.type === "chunk" && output.isEntry && output.name === "mainWebView";
}

/**
 * Replaces the JS/CSS placeholders in the webview HTML template with the generated webview
 * JavaScript and CSS, then suppresses the standalone JS/CSS outputs.
 */
function inlineWebviewPlugin(): Plugin {
  return {
    name: "inline-webview",

    apply: "build",
    enforce: "post",

    async generateBundle(_options: NormalizedOutputOptions, bundle: OutputBundle): Promise<void> {
      // oxlint-disable-next-line unicorn/no-array-callback-reference
      const entryChunk: OutputChunk | undefined = Object.values(bundle).find(isMainWebViewEntry);

      if (!entryChunk) {
        this.error('Could not find the "mainWebView" entry chunk.');
      }

      /*
       * `viteMetadata` is intentionally optional in Vite's types.
       *
       * Treat missing metadata equivalently to an empty CSS set; the check
       * immediately below then reports a meaningful build error.
       */
      const cssFileNames: string[] = [...(entryChunk.viteMetadata?.importedCss ?? [])];
      if (cssFileNames.length === 0) {
        this.error('No CSS was emitted for the "mainWebView" entry chunk.');
      }

      const cssParts: string[] = [];
      for (const cssFileName of cssFileNames) {
        const output: OutputAsset | OutputChunk | undefined = bundle[cssFileName];
        if (output?.type === "asset") {
          cssParts.push(assetSourceToString(output.source));

          // Prevent this CSS asset from being written to `out/`.
          // oxlint-disable-next-line typescript/no-dynamic-delete
          delete bundle[cssFileName];
        } else {
          this.error(`Could not find emitted CSS asset: ${cssFileName}`);
        }
      }

      let javascript: string = `${entryChunk.code}\n//# sourceURL=${entryChunk.fileName}`;
      let css: string = cssParts.join("\n");

      /*
       * The generated content will be embedded directly inside HTML <script>
       * and <style> elements. Escape literal closing-tag sequences so content
       * cannot accidentally terminate its containing element.
       */
      javascript = javascript.replaceAll(/<\/script/gi, "<\\/script");
      css = css.replaceAll(/<\/style/gi, "<\\/style");

      // Prevent mainWebView.js from being written to out/.
      // oxlint-disable-next-line typescript/no-dynamic-delete
      delete bundle[entryChunk.fileName];

      /*
       * mainWebView.html isn't part of the normal module graph, so make it an
       * explicit watch dependency for `vite build --watch`.
       */
      this.addWatchFile(webviewHtmlPath);

      let html: string = await readFile(webviewHtmlPath, "utf8");

      html = replaceExactlyOnce(html, CSS_PLACEHOLDER, css);
      html = replaceExactlyOnce(html, JS_PLACEHOLDER, javascript);

      this.emitFile({
        type: "asset",
        fileName: "mainWebView.html",
        source: html,
      });
    },
  };
}

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isExtension: boolean = mode === "extension";
  const isWebview: boolean = mode === "webview";

  if (!isExtension && !isWebview) {
    throw new Error(`Unknown build mode "${mode}". Expected "extension" or "webview".`);
  }

  return {
    resolve: {
      tsconfigPaths: true,
    },
    input: isExtension
      ? { extension: "src/extension/extension.ts" }
      : { mainWebView: "src/webview/mainWebView.ts" },
    plugins: isWebview ? [inlineWebviewPlugin()] : [],
    publicDir: false,
    css: {
      transformer: "lightningcss",
    },
    build: {
      outDir: "out",
      /*
       * Both independent builds write to out/, so neither should erase the
       * result produced by the other.
       */
      emptyOutDir: false,
      sourcemap: true,
      minify: false,
      target: "esnext",
      modulePreload: false,
      rolldownOptions: {
        preserveEntrySignatures: isExtension ? "strict" : false,
        /* VS Code now supports ESM extensions, so we can use "browser" for both the Extension
         * and the Webview to avoid Node.js polyfills.
         */
        platform: "browser",
        external: isExtension ? extensionExternal : [],
        tsconfig: isExtension ? "./tsconfig.node.json" : "./tsconfig.webview.json",
        output: {
          format: "esm",
          entryFileNames: "[name].js",
          /*
           * Keep extension code splitting available, but force the webview
           * into a single JS chunk so all generated JavaScript can be placed
           * inside mainWebView.html.
           */
          codeSplitting: isExtension,
        },
        optimization: {
          inlineConst: { mode: "all", pass: 3 },
        },
      },
    },
  };
});
