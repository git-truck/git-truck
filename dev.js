// eslint-disable-next-line @typescript-eslint/no-var-requires
const runAll = require("npm-run-all")

runAll([
  `dev:node -- ${process.argv.join(" ")}`,
  "dev:remix",
], {
  parallel: true,
  stdout: process.stdout,
  stderr: process.stderr,
})
