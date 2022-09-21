import fs from "fs"
import { exec, execSync } from "child_process"
import yargsParser from "yargs-parser"
import pkg from "./../package.json"
import { compare, valid, clean } from "semver"
import open from "open"
import latestVersion from "latest-version"

async function main() {
  const args = parseArgs()

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

  if (!fs.existsSync("build") || args["invalidateCache"]) {
    console.log("Building application...")

    // TODO: Respect log level
    execSync("npm run build", { stdio: "ignore" })
  }
  const proc = exec("npm run start", {}, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
  })

  if (!proc.stdout) throw new Error("No stdout")

  // Enable logging after the server has started successfully
  // TODO: Respect log level
  let silenced = true
  proc.stdout.on("data", (data) => {
    if (!silenced) {
      // Forward logging from child process
      process.stdout.write(data)
    }

    const regex = /^Remix App Server started at (\S+)/
    if (data.toString().match(regex)?.[1]) {
      printOpen(port)
      silenced = false
    }
  })

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

  async function printOpen(port: number) {
    console.log()
    const url = `http://localhost:${port}`
    console.log(`Application available at ${url}`)
    console.log()

    if (process.env.NODE_ENV !== "development") {
      // TODO: Open correct project, if run against a single repo
      // const url = `http://localhost:${port}/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`
      console.log(`Opening in your browser...`)
      await open(url)
    }
  }
}

main()
