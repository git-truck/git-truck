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
import { getPathFromRepoAndHead } from "./util"
import { describeAsyncJob, getDirName, isValidURI } from "./analyzer/util.server"
import { log, setLogLevel } from "./analyzer/log.server"
import InstanceManager from "./analyzer/InstanceManager.server"

async function main() {
  const args = parseArgs()
  if (args?.log) {
    setLogLevel(args.log as string)
  }
  const options = getArgsWithDefaults()

  // Soft clear the console
  process.stdout.write("\u001b[2J\u001b[0;0H")
  console.log()

  console.log(`Git Truck version ${pkg.version} (${process.env.NODE_ENV ?? "production"})`)

  log.debug(process.env.NODE_ENV)

  if (args.h || args.help) {
    console.log()
    console.log(`See ${pkg.homepage} for usage instructions.`)
    console.log()
    process.exit(0)
  }
  const getPortLib = await import("get-port")
  const getPort = getPortLib.default
  const port = await getPort({
    port: [...getPortLib.portNumbers(3000, 4000)]
  })

  log.debug(process.env.NODE_ENV)

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
      log.error(extensionError)
    }

    log.debug(process.env.NODE_ENV)

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

  const viteDevServer =
    process.env.NODE_ENV === "production"
      ? undefined
      : await import("vite").then((vite) =>
          vite.createServer({
            server: { middlewareMode: true }
          })
        )

  const remixHandler = createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : await import("../build/server/index.js")
  })

  const app = express()

  app.use(compression())

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by")

  // handle asset requests
  if (viteDevServer) {
    app.use(viteDevServer.middlewares)
  } else {
    // Vite fingerprints its assets so we can cache forever.
    app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }))
  }

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.static("build/client", { maxAge: "1h" }))

  app.use(morgan("tiny"))

  // handle SSR requests
  app.all("*", remixHandler)

  const server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen)
  ;["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, () => server.close(console.error))
    process.once(signal, async () => await InstanceManager.closeAllDBConnections())
  })
}

main()
