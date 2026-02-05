/// <reference types="vitest" />
import { reactRouterDevTools } from "react-router-devtools"
import { reactRouter } from "@react-router/dev/vite"
// import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import pkg from "./package.json"

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: {
      external: ["@duckdb/node-api"],
      ...(isSsrBuild
        ? {
            input: "./src/server/app.ts"
          }
        : {})
    }
  },
  ssr: {
    external: [
      "@duckdb/node-api",
      "@duckdb/node-bindings-linux-arm64",
      "@duckdb/node-bindings-linux-x64",
      "@duckdb/node-bindings-win32-x64",
      "@duckdb/node-bindings-darwin-x64",
      "@duckdb/node-bindings-darwin-arm64"
    ]
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
  plugins: [tailwindcss(), reactRouterDevTools(), reactRouter(), tsconfigPaths()],
  define: { "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version) },
  test: { exclude: ["e2e", "node_modules"] }
}))
