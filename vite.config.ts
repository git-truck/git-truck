/// <reference types="vitest/config" />
import { reactRouterDevTools } from "react-router-devtools"
import { reactRouter } from "@react-router/dev/vite"
import { reactCompilerPreset } from "@vitejs/plugin-react"
// import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import pkg from "./package.json" with { type: "json" }
import babel from "@rolldown/plugin-babel"

export default defineConfig(({ command }) => ({
  build: {
    rollupOptions: {
      external: ["@duckdb/node-api"]
    }
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: "./src/server/app.ts"
        }
      },
      resolve: {
        noExternal: command === "build" ? true : ["nuqs"],
        external: [
          "react",
          "react-dom",
          "react-router",
          "express",
          "@duckdb/node-api",
          "@duckdb/node-bindings-linux-arm64",
          "@duckdb/node-bindings-linux-x64",
          "@duckdb/node-bindings-win32-x64",
          "@duckdb/node-bindings-darwin-x64",
          "@duckdb/node-bindings-darwin-arm64"
        ]
      }
    }
  },
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
    tsconfigPaths: true
  },
  optimizeDeps: {
    entries: [],
    exclude: [
      "@duckdb/node-api",
      "@duckdb/node-bindings-linux-arm64",
      "@duckdb/node-bindings-linux-x64",
      "@duckdb/node-bindings-win32-x64",
      "@duckdb/node-bindings-darwin-x64",
      "@duckdb/node-bindings-darwin-arm64"
    ]
  },
  plugins: [
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss(),
    reactRouterDevTools(),
    reactRouter()
  ],
  define: { "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version) },
  test: { exclude: ["e2e", "node_modules"] }
}))
