import fs from "fs"

const raw = fs.readFileSync("./bun.lock", "utf8")

let version = ""
const match = raw.match(/"@playwright\/test"\s*:\s*\[\s*"@playwright\/test@([^"\s]+)/)
if (match && match[1]) {
  version = match[1]
}

console.log(version)
if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `PLAYWRIGHT_VERSION=${version}\n`)
}
