#!/usr/bin/env node

import express from "express"
import pkg from "../package.json"
import getPort, { portNumbers } from "get-port"
import open from "open"
import { GitCaller } from "./analyzer/git-caller.server.ts"
import { getArgsWithDefaults, parseArgs } from "./analyzer/args.server.ts"
import { getPathFromRepoAndHead, generateVersionComparisonLink, semverCompare } from "./util.ts"
import { describeAsyncJob, getDirName, getLatestVersion, isValidURI, promiseHelper } from "./analyzer/util.server.ts"
import { log, setLogLevel } from "./analyzer/log.server.ts"
import InstanceManager from "./analyzer/InstanceManager.server.ts"

const args = parseArgs()
if (args?.log) {
  setLogLevel(args.log as string)
}
const options = getArgsWithDefaults()

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

const BUILD_PATH = "./build/server/index.js"
const BUILD_CLIENT_PATH = "build/client"
const BUILD_ASSETS_PATH = "build/client/assets"
const SERVER_APP_PATH = "./src/server/app.ts"
const DEVELOPMENT = process.env.NODE_ENV !== "production"
const PORT = await getPort({ port: [...portNumbers(3000, 4000)] })

const app = express()

if (DEVELOPMENT) {
  const viteDevServer = await import("vite").then((vite) => vite.createServer({ server: { middlewareMode: true } }))
  app.use(viteDevServer.middlewares)
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule(SERVER_APP_PATH)
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
  app.use(await import(BUILD_PATH).then((mod) => mod.app))
}

const server = process.env.HOST ? app.listen(PORT, process.env.HOST, onListen) : app.listen(PORT, onListen)

process.once("SIGTERM", stopHandler)
process.once("SIGINT", stopHandler)
process.on("uncaughtException", stopHandler)

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

  return ` [!] Update available: ${latestVersion}

To update, run:
npm install -g git-truck@latest

See what's changed here:
${generateVersionComparisonLink({ currentVersion: pkg.version, latestVersion: latestVersion })}

`
}

async function stopHandler() {
  const promise = InstanceManager.closeAllDBConnections()
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

  const [extension, extensionError] = await describeAsyncJob({
    job: async () => {
      // If CWD or path argument is a git repo, go directly to that repo in the visualizer
      if (await GitCaller.isGitRepo(options.path)) {
        const repoName = getDirName(options.path)
        if (repoName) {
          const currentHead = await GitCaller._getRepositoryHead(options.path)
          return `/${getPathFromRepoAndHead(repoName, currentHead)}`
        } else return ""
      }
    },
    beforeMsg: "Checking for git repo",
    afterMsg: "Done checking for git repo",
    errorMsg: "Failed to check for git repo"
  })

  if (extensionError) {
    log.error(extensionError)
  }

  if (!args.headless && process.env.NODE_ENV === "development") {
    args.headless = true
  }
  const openURL = url + (extension && isValidURI(extension) ? extension : "")

  if (!args.headless) {
    log.debug(`Opening ${openURL}`)
    await describeAsyncJob({
      job: () => open(openURL),
      beforeMsg: "Opening Git Truck in your browser",
      afterMsg: "Opened Git Truck in your browser",
      errorMsg: `Failed to open Git Truck in your browser. To continue, open this link manually:\n\n${openURL}\n`
    })
  } else {
    console.log(`Application available at ${url}`)
  }
}
