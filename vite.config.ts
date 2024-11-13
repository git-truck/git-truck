import { vitePlugin as remix } from "@remix-run/dev"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { cjsInterop } from "vite-plugin-cjs-interop"

declare module "@remix-run/node" {
  // or cloudflare, deno, etc.
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  ssr: {
  },
  plugins: [
    cjsInterop({
      dependencies: ["@mdi/react"]
    }),
    remix({
      appDirectory: "src",
      serverModuleFormat: "esm",
      future: {
        unstable_optimizeDeps: true,
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true
      }
    }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    exclude: ["e2e", "node_modules"]
  }
})
