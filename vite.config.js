import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { installGlobals } from "@remix-run/node"

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
    tsconfigPaths()
  ]
})
