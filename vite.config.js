import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { installGlobals } from "@remix-run/node"
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
      dependencies: ["@mdi/react", "react-konami-code"]
    })
  ]
})
