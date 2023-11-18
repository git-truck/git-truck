import { execSync } from "child_process"
import os from "os"
import path from "path"
import invariant from "tiny-invariant"

const npxCacheDir = path.join(os.homedir(), ".npm/_npx/")

console.log()

const args = process.argv.slice(2)

const versionsToCompare = [args[0] || "experimental", "latest"]

const times = []

function cleanUp() {
  // Clear cache to make sure module is not installed
  execSync("npm un -g git-truck", { stdio: "ignore" })
  execSync("npm cache clean --force", { stdio: "ignore" })
  execSync(`npx rimraf ${npxCacheDir}`, { stdio: "ignore" })
}

let reps = Number(args[1]) || 1
let jobIndex = 0

for (let i = 0; i < versionsToCompare.length; i++) {
  const version = versionsToCompare[i]
  const npxTimes = []
  const globalInstallTimes = []

  const totalJobs = versionsToCompare.length * reps
  for (let j = 0; j < reps; j++) {
    const progress = jobIndex / totalJobs
    const progressString = `${(progress * 100).toFixed(2)}%`

    console.clear()
    console.log()
    console.log(`${progressString} (${jobIndex + 1}/${totalJobs}) Benchmarking git-truck@${version}...`)
    console.log()
    cleanUp()
    // Mark time
    const start = performance.now()
    // Install module with specific version
    const output = execSync(`npx git-truck@${version} -y -h`, {
      stdio: "pipe"
    })

    invariant(
      output.toString().includes(`https://github.com/git-truck/git-truck#readme`),
      `Output does not contain expected string: ${output.toString()}`
    )

    // Mark time
    const end = performance.now()
    // Calculate time difference
    npxTimes.push(end - start)

    cleanUp()
    // Mark time
    const start2 = performance.now()
    // Install module with specific version
    execSync(`npm i -g git-truck@${version}`)
    const output2 = execSync(`git-truck -h`, { stdio: "pipe" })

    invariant(
      output2.toString().includes(`https://github.com/git-truck/git-truck#readme`),
      `Output does not contain expected string: ${output2.toString()}`
    )

    // Mark time
    const end2 = performance.now()
    // Calculate time difference
    globalInstallTimes.push(end2 - start2)
    jobIndex++
  }

  // Calculate average
  const npxAverage = npxTimes.reduce((a, b) => a + b, 0) / npxTimes.length
  const globalInstallAverage = globalInstallTimes.reduce((a, b) => a + b, 0) / globalInstallTimes.length

  times.push({
    version,
    "npx average time (in ms)": npxAverage,
    "global install average time (in ms)": globalInstallAverage
  })
}

console.log("Node version: " + process.version)
console.table(times)
