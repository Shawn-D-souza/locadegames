import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults";
import { MatcherType, SelectorKind } from "eslint-plugin-better-tailwindcss/types";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist", ".wrangler", "node_modules"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    // Tailwind: only classes our theme defines, no conflicts or duplicates, one class order.
    files: ["src/web/**/*.tsx"],
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: `${import.meta.dirname}/src/web/styles/global.css`,
        // Class lists kept in constants are named `..._CLASSES`.
        selectors: [
          ...getDefaultSelectors(),
          { kind: SelectorKind.Variable, name: "_CLASSES$", match: [{ type: MatcherType.String }, { type: MatcherType.ObjectValue }] },
        ],
      },
    },
    rules: {
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-deprecated-classes": "error",
      "better-tailwindcss/enforce-canonical-classes": "error",
      "better-tailwindcss/enforce-consistent-class-order": "error",
    },
  },
  {
    files: ["src/server/**/*.ts"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ["*.{js,ts}", "scripts/**/*.mjs", "tests/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    // Playtests also hand code to the browser page (`page.evaluate`), which uses `window`.
    files: ["scripts/playtest/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
