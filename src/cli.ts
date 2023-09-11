#!/usr/bin/env node

import path from "path"
import pkg from "../package.json"
import open from "open"
import latestVersion from "latest-version"
import { GitCaller } from "./analyzer/git-caller.server"
import { getArgsWithDefaults, parseArgs } from "./analyzer/args.server"
import { getPathFromRepoAndHead } from "./util"
// import { createApp } from "@remix-run/serve"
import { semverCompare } from "./util"
import { describeAsyncJob, getDirName } from "./analyzer/util.server"
import { log, setLogLevel } from "./analyzer/log.server"

async function main() {
  const args = parseArgs()
  if (args?.log) {
    setLogLevel(args.log as string)
  }
  const options = getArgsWithDefaults()

  const currentV = pkg.version
  let updateMessage = ""
  try {
    const latestV = await latestVersion(pkg.name)

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
    port: [...getPortLib.portNumbers(3000, 4000)],
  })

  // Serve application build

  process.argv[2] = path.join(__dirname, "build", "index.js")
  void new Promise(() => require("@remix-run/serve/dist/cli.js"))

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
    errorMsg: "Failed to check for git repo",
  })

  if (extensionError) {
    console.error(extensionError)
  }

  if (process.env.NODE_ENV !== "development") {
    const openURL = url + (extension ?? "")
    let err: Error | null = null

    if (!args.headless) {
      log.debug(`Opening ${openURL}`)
      ;[, err] = await describeAsyncJob({
        job: () => open(openURL),
        beforeMsg: "Opening Git Truck in your browser",
        afterMsg: `Succesfully opened Git Truck in your browser`,
        errorMsg: `Failed to open Git Truck in your browser. To continue, open this link manually:\n\n${openURL}`,
      })
    }
    if (!err) console.log(`\nApplication available at ${url}\n`)
  }
}

main()
