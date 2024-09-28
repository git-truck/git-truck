import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { installGlobals } from "@remix-run/node"
import pkg from "./package.json"
import { cjsInterop } from "vite-plugin-cjs-interop"

installGlobals()

export default defineConfig({
  ssr: {
    noExternal: [/^node:/, /^d3/, "lightningcss"]
  },
  plugins: [
    remix({
      appDirectory: "src",
      serverModuleFormat: "esm"
    }),
    tsconfigPaths(),
    cjsInterop({
      dependencies: ["@mdi/react", ...(process.env.NODE_ENV === "production" ? [] : ["react-use"])]
    })
  ],
  define: {
    "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version)
  },
  test: {
    globals: true,
    exclude: ["e2e", "node_modules"]
  }
})
