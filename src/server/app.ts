import "react-router"
import { createRequestHandler } from "@react-router/express"
import express from "express"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { existsSync, readFileSync } from "fs"
import pkg from "../../package.json"
import { getLatestVersion } from "../shared/util.server.js"

declare module "react-router" {
  interface AppLoadContext {
    installedVersion: string
    latestVersion: string | null
  }
}

export const app: express.Express = express()

const getLatestVersionPromise = getLatestVersion()

// In production, serve static assets
if (process.env.NODE_ENV === "production") {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  
  // Find the package root directory (where package.json is located)
  let packageRoot = __dirname
  while (packageRoot !== dirname(packageRoot)) {
    try {
      const packageJsonPath = join(packageRoot, "package.json")
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
        if (packageJson.name === "git-truck") {
          break
        }
      }
    } catch {
      // Continue searching
    }
    packageRoot = dirname(packageRoot)
  }
  
  const clientBuildPath = join(packageRoot, "build/client")
  const assetsBuildPath = join(packageRoot, "build/client/assets")
  
  app.use("/assets", express.static(assetsBuildPath, { immutable: true, maxAge: "1y" }))
  app.use(express.static(clientBuildPath, { maxAge: "1h" }))
}

app.use(
  createRequestHandler({
    // @ts-expect-error Virtual module provided by React Router
    // eslint-disable-next-line import/no-unresolved
    build: () => import("virtual:react-router/server-build"),
    async getLoadContext() {
      return { installedVersion: pkg.version, latestVersion: await getLatestVersionPromise }
    }
  })
)
