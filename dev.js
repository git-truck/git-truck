/* eslint-disable @typescript-eslint/no-var-requires */
const runAll = require("npm-run-all")
const open = require("open")

;(async () => {
  const getPortLib = (await import("get-port"))
  const getPort = getPortLib.default
  const port = await getPort({
    port: [...getPortLib.portNumbers(3000, 4000)],
  })

  process.env["PORT"] = port.toString()

  open("http://localhost:" + port)
  await runAll(
    [`dev:node -- ${process.argv.slice(2).join(" ")}`, "dev:remix"],
    {
      parallel: true,
      stdout: process.stdout,
      stderr: process.stderr,
    }
  )
})()
