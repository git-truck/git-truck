import "react-router"
import { createRequestHandler } from "@react-router/express"
import express from "express"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
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
  const clientBuildPath = join(__dirname, "../client")
  const assetsBuildPath = join(__dirname, "../client/assets")
  
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
