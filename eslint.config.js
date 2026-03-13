/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

import js from "@eslint/js"
import { fixupPluginRules } from "@eslint/compat"
import tseslint from "typescript-eslint"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import jsxA11y from "eslint-plugin-jsx-a11y"
import importPlugin from "eslint-plugin-import"
import globals from "globals"

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "e2e/**/*.{js,jsx,ts,tsx}", "scripts/**/*.{js,ts}"],
    plugins: {
      react: fixupPluginRules(react),
      "react-hooks": fixupPluginRules(reactHooks),
      "jsx-a11y": fixupPluginRules(jsxA11y),
      import: fixupPluginRules(importPlugin)
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2015
      }
    },
    settings: {
      react: {
        version: "detect"
      },
      formComponents: ["Form"],
      linkComponents: [
        { name: "Link", linkAttribute: "to" },
        { name: "NavLink", linkAttribute: "to" }
      ],
      "import/resolver": {
        typescript: {}
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          reservedFirst: true,
          noSortAlphabetically: true,
          ignoreCase: true
        }
      ]
    }
  },
  {
    files: ["scripts/**/*.{js,mjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}", "scripts/**/*.{ts}"],
    languageOptions: {
      parser: tseslint.parser
    },
    settings: {
      "import/internal-regex": "^~/",
      "import/resolver": {
        node: {
          extensions: [".ts", ".tsx"]
        },
        typescript: {
          alwaysTryTypes: true
        }
      }
    }
  },
  {
    files: [".eslintrc.cjs", "scripts/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    ignores: [
      "!**/.server",
      "!**/.client",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "cli.mjs",
      ".react-router/**",
      ".husky/**"
    ]
  }
]
