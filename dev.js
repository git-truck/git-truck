/* eslint-disable @typescript-eslint/no-var-requires */
const runAll = require("npm-run-all")
const open = require("open")

;(async () => {
  const getPortLib = (await import("get-port"))
  const getPort = getPortLib.default
  const port = await getPort({
    port: getPortLib.portNumbers(3000, 4000),
  })

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
