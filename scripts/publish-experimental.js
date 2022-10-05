/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require("child_process")

async function main() {
  const commitHash = execSync("git rev-parse --short HEAD").toString().trim()
  const versionTag = `0.0.0-${commitHash}`
  execSync(`npm version ${versionTag} --no-git-tag-version`)
  execSync(`npm publish --tag experimental`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

