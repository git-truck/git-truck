const fs = require("fs")

const shebang = "#!/usr/bin/env node\n"
const buildPath = "./build/index.js"

const data = fs.readFileSync(buildPath)
const fd = fs.openSync(buildPath, "w+")
const insert = Buffer.from(shebang)
fs.writeSync(fd, insert, 0, insert.length, 0)
fs.writeSync(fd, data, 0, data.length, insert.length)
fs.close(fd, (err) => {
  if (err) throw err
})
fs.chmodSync(buildPath, "755")
