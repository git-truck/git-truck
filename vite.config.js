import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { installGlobals } from "@remix-run/node";

installGlobals();

export default defineConfig({
  ssr: {
    noExternal: /.*/
  },
  plugins: [
    remix({
      appDirectory: "src",
      serverBuildPath: "build/index.js",
      serverModuleFormat: "cjs"
    }),
    tsconfigPaths()
  ]
})
