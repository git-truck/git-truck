#!/usr/bin/env node

import express from "express"
import compression from "compression"
import morgan from "morgan"
import { createRequestHandler } from "@remix-run/express"
import path from "path"
import pkg from "../package.json"
import open from "open"
import { GitCaller } from "./analyzer/git-caller.server"
import { getArgsWithDefaults, parseArgs } from "./analyzer/args.server"
import { semverCompare, getPathFromRepoAndHead } from "./util"
import { describeAsyncJob, getDirName, isValidURI, getLatestVersion } from "./analyzer/util.server"
import { log, setLogLevel } from "./analyzer/log.server"
import type { NextFunction } from "express-serve-static-core"
import InstanceManager from "./analyzer/InstanceManager.server"

async function main() {
  const args = parseArgs()
  if (args?.log) {
    setLogLevel(args.log as string)
  }
  const options = getArgsWithDefaults()

  const currentV = pkg.version
  let updateMessage = ""
  try {
    const latestV = await getLatestVersion()

    // Soft clear the console
    process.stdout.write("\u001b[2J\u001b[0;0H")
    console.log()

    updateMessage =
      latestV && semverCompare(latestV, currentV) === 1
        ? ` [!] Update available: ${latestV}

To update, run:

npx git-truck@latest

Or to install globally:

npm install -g git-truck@latest

`
        : " (latest)"
  } catch (e) {
    // ignore
  }
  console.log(`Git Truck version ${currentV}${updateMessage}\n`)

  if (args.h || args.help) {
    console.log()
    console.log(`See

${pkg.homepage}

for usage instructions.`)
    console.log()
    process.exit(0)
  }
  const getPortLib = await import("get-port")
  const getPort = getPortLib.default
  const port = await getPort({
    port: [...getPortLib.portNumbers(3000, 4000)]
  })

  // Serve application build

  const onListen = async () => {
    const url = `http://localhost:${port}`

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
      console.error(extensionError)
    }

    if (process.env.NODE_ENV !== "development") {
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
  }

  describeAsyncJob({
    job: async () => {
      const app = createApp(
        "./build/index.js",
        process.env.NODE_ENV ?? "production",
        "/build",
        path.join(__dirname, "public", "build")
      )

      const server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen)
      ;["SIGTERM", "SIGINT"].forEach((signal) => {
        process.once(signal, () => server?.close(console.error))
        process.once(signal, async () => await InstanceManager.closeAllDBConnections())
      })
    },
    beforeMsg: "Starting app",
    afterMsg: "App started",
    errorMsg: "Failed to start app"
  })
}

main()

function createApp(
  buildPath: string,
  mode = "production",
  publicPath = "/build/",
  assetsBuildDirectory = "public/build/"
) {
  const app = express()

  app.disable("x-powered-by")

  // @ts-expect-error This error is wrong, the types are incorrect
  app.use(compression())

  // @ts-expect-error This error is wrong, the types are incorrect
  app.use(publicPath, express.static(assetsBuildDirectory, { immutable: true, maxAge: "1y" }))

  // @ts-expect-error This error is wrong, the types are incorrect
  app.use(express.static("public", { maxAge: "1h" }))

  if (mode === "development") {
    // @ts-expect-error This error is wrong, the types are incorrect
    app.use(morgan("dev"))
  }

  let requestHandler: ReturnType<typeof createRequestHandler> | undefined
  app.all("*", async (req, res, next) => {
    try {
      if (!requestHandler) {
        const build = await import(buildPath)
        requestHandler = createRequestHandler({ build, mode })
      }

      return await requestHandler(req, res, next as NextFunction)
    } catch (error) {
      next?.(error)
    }
  })

  return app
}
