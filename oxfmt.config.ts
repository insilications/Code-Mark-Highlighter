import { defineConfig } from "oxfmt";

export default defineConfig({
  arrowParens: "always",
  bracketSpacing: true,
  embeddedLanguageFormatting: "auto",
  ignorePatterns: [
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lock",
    "out/",
    "node_modules/",
    ".github/",
  ],
  jsdoc: {
    addDefaultToDescription: true,
    bracketSpacing: false,
    capitalizeDescriptions: true,
    commentLineStrategy: "singleLine",
    descriptionTag: false,
    descriptionWithDot: false,
    keepUnparsableExampleIndent: false,
    lineWrappingStyle: "balance",
    preferCodeFences: true,
    separateReturnsFromParam: true,
    separateTagGroups: false,
  },
  jsxBracketSameLine: false,
  objectWrap: "preserve",
  overrides: [
    {
      files: ["*.json", "*.jsonc"],
      options: {
        trailingComma: "none",
      },
    },
  ],
  printWidth: 100,
  proseWrap: "preserve",
  semi: true,
  singleAttributePerLine: false,
  singleQuote: false,
  sortImports: { ignoreCase: true, newlinesBetween: true, order: "asc" },
  sortPackageJson: { sortScripts: true },
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
});
