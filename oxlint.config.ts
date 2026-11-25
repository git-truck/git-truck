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
    // Not in jsx-a11y's recommended set; custom range-slider handles need role="slider"
    "jsx-a11y/prefer-tag-over-role": "off",
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
      // SVG charts use event delegation for mouse interaction; keyboard users
      // reach the same functionality via search and the time slider.
      files: ["src/components/Chart.tsx", "src/components/BarChart.tsx"],
      rules: {
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/mouse-events-have-key-events": "off",
        "jsx-a11y/no-static-element-interactions": "off"
      }
    },
    {
      // The form's bubbling onBlur closes search when focus leaves the widget
      files: ["src/components/SearchCard.tsx"],
      rules: {
        "jsx-a11y/no-noninteractive-element-interactions": "off"
      }
    },
    {
      files: ["scripts/**/*.{js,mjs,ts}"],
      env: {
        node: true
      }
    }
  ]
})
