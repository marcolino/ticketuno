import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
  js.configs.recommended,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/hooks/useNavigate.ts"],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      "@typescript-eslint": tsPlugin,
    },

    rules: {
      // Fix console not defined
      "no-undef": "off",

      // TS recommended rules
      ...tsPlugin.configs.recommended.rules,

      "@typescript-eslint/no-explicit-any": "off", // TODO: provisional setting, remove all any's

      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-router-dom"],
              importNames: ["useNavigate"],
              message:
                "Use custom useNavigate from hooks/useNavigate instead",
            },
          ],
        },
      ],
    },
  },
];
