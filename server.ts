import * as serverBuild from "@remix-run/dev/server-build"
import { createRequestHandler } from "@remix-run/express"
import compression from "compression"
import express from "express"
import { portNumbers } from "get-port"
import latestVersion from "latest-version"
import morgan from "morgan"
import open from "open"
import { join } from "path"
import semverCompare from "semver-compare"
import pkg from "./package.json"
import { parseArgs } from "./src/analyzer/args.server"

const args = parseArgs()

;(async () => {
  const latestV = await latestVersion(pkg.name)
  const currentV = pkg.version

  // Soft clear the console
  process.stdout.write("\u001b[2J\u001b[0;0H")
  console.log()

  const updateMessage =
    latestV && semverCompare(latestV, currentV) === 1
      ? ` [!] Update available: ${latestV}

To update, run:

  npx git-truck@latest

Or to install globally:

  npm install -g git-truck@latest

`
      : " (latest)"

  console.log(`Git Truck version ${currentV}${updateMessage}`)

  if (args.h || args.help) {
    console.log()
    console.log(`See

  ${pkg.homepage}

for usage instructions.`)
    console.log()
    process.exit(0)
  }

  const app = express()

  app.use(compression())

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by")

  const staticAssetsPath = join(__dirname, "../public/build")
  // Remix fingerprints its assets so we can cache forever.
  app.use(
    "/build",
    express.static(staticAssetsPath, { immutable: true, maxAge: "1y" })
  )

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.static(staticAssetsPath, { maxAge: "1h" }))

  app.use(morgan("tiny"))

  app.all(
    "*",
    createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
    })
  )

  const ports = []
  if (args.port && !isNaN(parseInt(args.port))) ports.push(parseInt(args.port))
  if (process.env.PORT && !isNaN(parseInt(process.env.PORT)))
    ports.push(parseInt(process.env.PORT))

  const getPortLib = (await import("get-port"))
  const getPort = getPortLib.default
  const port = await getPort({
    port: [...ports, ...getPortLib.portNumbers(3000, 4000)],
  })

  app.listen(port).once("listening", () => printOpen(port))
})()

function printOpen(port: number) {
  console.log()
  const serverport = port
  if (serverport !== port) {
    console.log("Default/Specified port was used by another process")
  }
  console.log(`Now listening on port ${serverport}`)
  if (process.env.NODE_ENV !== "development")
    open("http://localhost:" + serverport)
}
