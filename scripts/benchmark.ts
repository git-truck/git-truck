import { execSync } from "child_process"
import os from "os"
import path from "path"
import { invariant } from "~/shared/util"

const npxCacheDir = path.join(os.homedir(), ".npm/_npx/")

console.log()

const args = process.argv.slice(2)

const versionsToCompare = [args[0] || "experimental", "latest"]

interface BenchmarkResult {
  version: string
  npx: string
  "npm -g": string
  bunx: string
  "bun -g": string
}

const allMetrics: { version: string; metrics: Record<string, number[]> }[] = []

function cleanUp() {
  // Clear cache to make sure module is not installed
  try {
    execSync("npm un -g git-truck", { stdio: "ignore" })
    execSync("npm cache clean --force", { stdio: "ignore" })
    execSync(`npx rimraf ${npxCacheDir}`, { stdio: "ignore" })
  } catch {
    // ignore
  }
  try {
    execSync("bun remove -g git-truck", { stdio: "ignore" })
    execSync("bun pm cache rm", { stdio: "ignore" })
  } catch {
    // ignore
  }
}

const reps = Number(args[1]) || 1
let jobIndex = 0
const totalJobs = versionsToCompare.length * reps * 4

for (let i = 0; i < versionsToCompare.length; i++) {
  const version = versionsToCompare[i]

  const metrics: Record<string, number[]> = {
    npx: [],
    npmGlobal: [],
    bunx: [],
    bunGlobal: []
  }

  for (let j = 0; j < reps; j++) {
    const runBenchmark = (name: string, cmd: string) => {
      const progress = jobIndex / totalJobs
      const progressString = `${(progress * 100).toFixed(1)}%`
      console.clear()
      console.log(`\n${progressString} (${jobIndex + 1}/${totalJobs}) Benchmarking git-truck@${version} [${name}]...\n`)

      cleanUp()
      const start = performance.now()
      let output
      try {
        output = execSync(cmd, { stdio: "pipe" }).toString()
      } catch (e) {
        output = ""
        console.error(`Error running ${name}`, e)
      }
      const end = performance.now()

      invariant(
        output.includes(`https://github.com/git-truck/git-truck#readme`),
        `Output does not contain expected string for ${name}: ${output}`
      )
      jobIndex++
      return end - start
    }

    metrics.npx.push(runBenchmark("npx", `npx git-truck@${version} -y -h`))
    metrics.npmGlobal.push(runBenchmark("npm global", `npm i -g git-truck@${version} && git-truck -h`))
    metrics.bunx.push(runBenchmark("bunx", `bunx git-truck@${version} -h`))
    metrics.bunGlobal.push(runBenchmark("bun global", `bun add -g git-truck@${version} && git-truck -h`))
  }
  allMetrics.push({ version, metrics })
}

const getMean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length)
const getStats = (arr: number[]) => {
  if (arr.length === 0) return { mean: 0, stdDev: 0, formatted: "N/A" }
  const n = arr.length
  const mean = getMean(arr)
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n > 1 ? n - 1 : 1)
  const stdDev = Math.sqrt(variance)
  return { mean, stdDev, formatted: `${mean.toFixed(0)}ms ± ${stdDev.toFixed(0)}` }
}

const times: BenchmarkResult[] = []

// Calculate baselines (slowest mean per method) to compare against
const methods = ["npx", "npmGlobal", "bunx", "bunGlobal"] as const
const methodKeys = ["npx", "npm -g", "bunx", "bun -g"] as const
const baselines: Record<string, number> = {}

methods.forEach((method) => {
  const allMeans = allMetrics.map((m) => getMean(m.metrics[method]))
  baselines[method] = Math.max(...allMeans)
})

// Sort versions by total time (sum of all method means)
allMetrics.sort((a, b) => {
  const sumA = methods.reduce((acc, m) => acc + getMean(a.metrics[m]), 0)
  const sumB = methods.reduce((acc, m) => acc + getMean(b.metrics[m]), 0)
  return sumA - sumB // Ascending (fastest first)
})

allMetrics.forEach(({ version, metrics }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = { version }

  methods.forEach((method, idx) => {
    const stats = getStats(metrics[method])
    const baseline = baselines[method]
    // If this version is faster than baseline, show how much faster
    // If it's the baseline (slowest), it's 1x
    const speedup = baseline > 0 && stats.mean > 0 ? (baseline / stats.mean).toFixed(1) : "1.0"
    const speedupStr = Number(speedup) > 1.05 ? ` (${speedup}x faster)` : ""
    result[methodKeys[idx]] = `${stats.formatted}${speedupStr}`
  })
  times.push(result as BenchmarkResult)
})

console.log("Node version: " + process.version)
try {
  console.log("Bun version: " + execSync("bun --version").toString().trim())
} catch {
  console.log("Bun version: N/A")
}
console.table(times)
