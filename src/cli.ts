import fs from "fs"
import { exec, execSync } from "child_process"
import yargsParser from "yargs-parser"
import pkg from "./../package.json"
import { compare, valid, clean } from "semver"
import open from "open"
import latestVersion from "latest-version"
import { GitCaller } from "./analyzer/git-caller.server"
import { getBaseDirFromPath } from "./analyzer/util.server"
import { resolve } from "path"
import { getArgsWithDefaults } from "./analyzer/args.server"
import { getPathFromRepoAndHead } from "./util"

async function main() {
  const args = parseArgs()
  const options = getArgsWithDefaults()

  const currentV = pkg.version
  let updateMessage = ""
  try {
    const latestV = await latestVersion(pkg.name)

    console.log("latestV", latestV)

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
  console.log(`Git Truck version ${currentV}${updateMessage}`)

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

  process.env["PORT"] = port.toString()
  process.argv[2] = "build"
  console.log("Starting Git Truck...");

  // Save console.log to be restored later
  const log = global.console.log

  // Override console.log
  global.console.log = async (message?: string) => {
    const regex = /^Remix App Server started at (\S+)/
    if (message?.toString().match(regex)?.[1]) {
      // Restore console.log to original when server is started
      global.console.log = log.bind(global.console)
      const url = `http://localhost:${port}`
      let extension = ""

      // If CWD or path argument is a git repo, go directly to that repo in the visualizer
      if (await GitCaller.isGitRepo(options.path)) {
        const repo = await GitCaller.getRepoMetadata(options.path)
        if (repo) {
          extension = `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`
        }
      }
      printOpen(url, extension)
    }
  }
  // Serve application build
  await import("node_modules/@remix-run/serve/dist/cli.js");

  function parseArgs(rawArgs = process.argv.slice(2)) {
    return yargsParser(rawArgs, {
      configuration: {
        "duplicate-arguments-array": false,
      },
    })
  }

  function semverCompare(a: string, b: string) {
    const validA = valid(clean(a))
    const validB = valid(clean(b))

    if (!validA || !validB) {
      if (validA) return 1
      if (validB) return -1
      return a.toLowerCase().localeCompare(b.toLowerCase())
    }

    return compare(validA, validB)
  }

  async function printOpen(url: string, extension: string) {
    console.log()

    console.log(`Application available at ${url}`)
    console.log()

    if (process.env.NODE_ENV !== "development") {
      // TODO: Open correct project, if run against a single repo
      // const url = `http://localhost:${port}/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`
      console.log(`Opening in your browser...`)
      await open(url + extension)
    }
  }
}

main()
