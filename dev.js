/* eslint-disable @typescript-eslint/no-var-requires */
const runAll = require("npm-run-all")
const open = require("open")

;(async () => {
  const getPort = (await import("get-port")).default
  const port = await getPort({
    port: [3000, 3001, 3002],
  })

  console.log("Opening in browser")
  open("http://localhost:" + port)
  await runAll(
    [`dev:node -- --port ${port} ${process.argv.join(" ")}`, "dev:remix"],
    {
      parallel: true,
      stdout: process.stdout,
      stderr: process.stderr,
    }
  )
})()
