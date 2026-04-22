#!/usr/bin/env node
import express from "express"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import pkg from "../package.json" with { type: "json" }
import getPort, { portNumbers } from "get-port"
import open from "open"
import { parseArgs, describeAsyncJob, getLatestVersion } from "~/shared/util.server.ts"
import { generateVersionComparisonLink, semverCompare, promiseHelper } from "~/shared/util.ts"

import { log, setLogLevel } from "~/analyzer/log.server.ts"
import InstanceManager from "~/analyzer/InstanceManager.server.ts"

const args = parseArgs()
if (args?.log) {
  setLogLevel(args.log as string)
}

// Soft clear the console
process.stdout.write("\u001b[2J\u001b[0;0H")
console.log()

if (args.h || args.help) {
  console.log()
  console.log(`See ${pkg.homepage} for usage instructions.`)
  console.log()
  process.exit(0)
}

console.log(`Git Truck version ${pkg.version}${await getUpdateMessage()}\n`)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUILD_PATH = path.join(__dirname, "build/server/index.js")
const BUILD_CLIENT_PATH = path.join(__dirname, "build/client")
const BUILD_ASSETS_PATH = path.join(__dirname, "build/client/assets")

const SERVER_APP_PATH = "./src/server/app.ts"
const DEVELOPMENT = process.env.NODE_ENV !== "production"
let PORT: number
let HMR_PORT: number | null = null

const envPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : Number.NaN
const hasValidEnvPort = Number.isInteger(envPort) && envPort >= 1 && envPort <= 65535

if (hasValidEnvPort) {
  PORT = envPort
} else {
  if (process.env.PORT) {
    log.warn(`Invalid PORT environment variable "${process.env.PORT}". Falling back to an available port.`)
  }
  PORT = await getPort({ port: [...portNumbers(3000, 4000)] })
}

if (DEVELOPMENT) {
  HMR_PORT = await getPort({ port: [...portNumbers(24678, 24778)] })
}

const app = express()

if (DEVELOPMENT) {
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: {
        middlewareMode: true,
        ...(HMR_PORT
          ? {
              hmr: {
                port: HMR_PORT,
                clientPort: HMR_PORT
              }
            }
          : {})
      }
    })
  )
  app.use(viteDevServer.middlewares)
  app.use(async (req, res, next) => {
    try {
      const source: { app: typeof app } = (await viteDevServer.ssrLoadModule(SERVER_APP_PATH)) as { app: typeof app }
      return await source.app(req, res, next)
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error)
      }
      next(error)
    }
  })
} else {
  app.use("/assets", express.static(BUILD_ASSETS_PATH, { immutable: true, maxAge: "1y" }))
  app.use(express.static(BUILD_CLIENT_PATH, { maxAge: "1h" }))
  app.use(await import(pathToFileURL(BUILD_PATH).href).then((mod) => mod.app))
}

const server = process.env.HOST ? app.listen(PORT, process.env.HOST, onListen) : app.listen(PORT, onListen)

process.once("SIGTERM", stopHandler)
process.once("SIGINT", stopHandler)

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err)
})

async function getUpdateMessage() {
  if (process.env.NODE_ENV === "development") {
    return " (development build)"
  }

  const [latestVersion] = await promiseHelper(getLatestVersion())

  if (!latestVersion) {
    return " (offline)"
  }

  if (semverCompare(latestVersion, pkg.version) !== 1) {
    return " (latest)"
  }

  const isExperimental = pkg.version.startsWith("0.0.0")

  if (isExperimental) {
    return " (experimental build)"
  }

  return ` [!] Update available: ${latestVersion}

To update, run:
npm install -g git-truck@latest

See what's changed here:
${generateVersionComparisonLink({ currentVersion: pkg.version, latestVersion: latestVersion })}

`
}

async function stopHandler() {
  const promise = InstanceManager.closeAllDBInstances()
  log.info("Shutting down server")
  server.close(console.error)
  log.info("Web server shut down")
  await describeAsyncJob({
    job: () => promise,
    beforeMsg: "Stopping Git Truck...",
    afterMsg: "Successfully stopped Git Truck",
    errorMsg: "Failed to stop Git Truck"
  })
}

async function onListen() {
  const url = `http://localhost:${PORT}`
  const publicURL = process.env.PORTLESS_URL || url

  if (!args.headless && process.env.NODE_ENV === "development") {
    args.headless = true
  }

  console.log(`Application available at ${publicURL}`)

  if (!args.headless) {
    const openURL = publicURL
    // + (extension && isValidURI(extension) ? extension : "")

    log.debug(`Opening ${openURL}`)
    await describeAsyncJob({
      job: () => open(openURL),
      beforeMsg: "Opening Git Truck in your browser",
      afterMsg: "Opened Git Truck in your browser",
      errorMsg: `Failed to open Git Truck in your browser. To continue, open this link manually:\n\n${openURL}\n`
    })
  }
}
