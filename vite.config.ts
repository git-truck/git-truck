/// <reference types="vitest" />
import { reactRouterDevTools } from "react-router-devtools"
import { reactRouter } from "@react-router/dev/vite"
import { reactCompilerPreset } from "@vitejs/plugin-react"
// import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import pkg from "./package.json"
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
          // React Router 8 only reads the server entry from the ssr environment
          input: "./src/server/app.ts"
        }
      }
    }
  },
  ssr: {
    // Production: bundle everything, the published package only ships the build output.
    // (`isSsrBuild` is never true with React Router 8, which builds all environments in one pass.)
    // Dev: nuqs must go through Vite too. Otherwise it imports its own copy of react-router,
    // which has no router context ("useNavigate() may be used only in the context of a <Router>")
    noExternal: command === "build" ? true : ["nuqs"],
    external: [
      "@duckdb/node-api",
      "@duckdb/node-bindings-linux-arm64",
      "@duckdb/node-bindings-linux-x64",
      "@duckdb/node-bindings-win32-x64",
      "@duckdb/node-bindings-darwin-x64",
      "@duckdb/node-bindings-darwin-arm64"
    ]
  },
  resolve: {
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
