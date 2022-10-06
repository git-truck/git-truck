import pkg from "../package.json"
import open from "open"
import latestVersion from "latest-version"
import { GitCaller } from "./analyzer/git-caller.server"
import { getArgsWithDefaults, parseArgs } from "./analyzer/args.server"
import { getPathFromRepoAndHead } from "./util"
import { createApp } from "@remix-run/serve"
import { semverCompare } from "./components/util"

async function main() {
  const args = parseArgs()
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

  console.log("Starting Git Truck...")


  // Serve application build

  const onListen = async () => {
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

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const build = require(path.join(__dirname, "./build"))

  const app = createApp("./build", process.env.NODE_ENV, build.publicPath, build.assetsBuildDirectory)
  const server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen)

  ;["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, () => server?.close(console.error))
  })
}

main()

async function printOpen(url: string, extension: string) {
  console.log()

  console.log(`Application available at ${url}`)
  console.log()
  if (process.env.NODE_ENV !== "development") {
    console.log(`Opening in your browser...`)
    await open(url + extension)
  }
}
