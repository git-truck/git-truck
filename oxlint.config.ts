import { defineConfig } from "oxlint"

export default defineConfig({
  plugins: ["typescript", "react", "jsx-a11y", "import"],
  options: {
    typeAware: true,
    typeCheck: true
  },
  categories: {
    correctness: "warn"
  },
  env: {
    builtin: true,
    browser: true,
    es2026: true
  },
  ignorePatterns: [
    "!**/.server",
    "!**/.client",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "cli.mjs",
    ".react-router/**",
    ".husky/**"
  ],
  jsPlugins: ["eslint-plugin-react-you-might-not-need-an-effect"],
  rules: {
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ],
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/jsx-no-undef": "error",
    "react/react-in-jsx-scope": "off",
    "react-you-might-not-need-an-effect/no-empty-effect": "warn",
    "react-you-might-not-need-an-effect/no-adjust-state-on-prop-change": "warn",
    "react-you-might-not-need-an-effect/no-reset-all-state-on-prop-change": "warn",
    "react-you-might-not-need-an-effect/no-event-handler": "warn",
    "react-you-might-not-need-an-effect/no-pass-live-state-to-parent": "warn",
    "react-you-might-not-need-an-effect/no-pass-data-to-parent": "warn",
    "react-you-might-not-need-an-effect/no-initialize-state": "warn",
    "react-you-might-not-need-an-effect/no-chain-state-updates": "warn",
    "react-you-might-not-need-an-effect/no-derived-state": "warn"
  },
  overrides: [
    {
      files: ["scripts/**/*.{js,mjs,ts}"],
      env: {
        node: true
      }
    }
  ]
})
