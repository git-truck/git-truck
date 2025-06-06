import "react-router"
import { createRequestHandler } from "@react-router/express"
import express from "express"
import pkg from "../../package.json"
import { getLatestVersion } from "../shared/util.server.js"

declare module "react-router" {
  interface AppLoadContext {
    installedVersion: string
    latestVersion: string | null
  }
}

export const app: express.Express = express()

const latestVersion = await getLatestVersion()

app.use(
  createRequestHandler({
    // @ts-ignore Virtual module provided by React Router
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return { installedVersion: pkg.version, latestVersion: latestVersion }
    }
  })
)
