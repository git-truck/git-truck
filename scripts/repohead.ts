import { execSync } from "child_process"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * Benchmark script comparing two methods to get the current git branch:
 *
 * Method 1: Using `git rev-parse --abbrev-ref HEAD` (process execution)
 * Method 2: Reading `.git/HEAD` file directly (file system access)
 *
 * Run with: `bun scripts/repohead.ts [repo-path] [iterations]`
 * Example: `bun scripts/repohead.ts . 1000`
 */

interface BenchmarkResult {
  method: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  medianTime: number
}

// Parse command line arguments
const repoPath = process.argv[2] || "."
const iterations = Number(process.argv[3]) || 1000

console.log()
console.log("╔════════════════════════════════════════════════════════════════╗")
console.log("║   Git Branch Retrieval Benchmark: Process vs File System      ║")
console.log("╚════════════════════════════════════════════════════════════════╝")
console.log()
console.log(`Repository: ${repoPath}`)
console.log(`Iterations: ${iterations}`)
console.log()

/**
 * Method 1: Using git command (process execution)
 * Pros: Official git API, always accurate
 * Cons: Spawns a child process, potentially slower
 */
function getBranchViaGitCommand(dir: string): string {
  const result = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: dir,
    encoding: "utf-8"
  })
  return result.trim()
}

/**
 * Method 2: Reading .git/HEAD file directly
 * Pros: Direct file system access, no process overhead
 * Cons: Must parse the file content, relies on git file structure
 */
function getBranchViaFileRead(dir: string): string {
  const headPath = join(dir, ".git", "HEAD")
  const content = readFileSync(headPath, "utf-8")
  return content.trim().replace("ref: refs/heads/", "")
}

// Validate both methods return the same result
console.log("Validating methods return same result...")
const method1Result = getBranchViaGitCommand(repoPath)
const method2Result = getBranchViaFileRead(repoPath)

if (method1Result !== method2Result) {
  console.error(`❌ Methods return different results!`)
  console.error(`  Method 1 (git command): ${method1Result}`)
  console.error(`  Method 2 (file read): ${method2Result}`)
  process.exit(1)
}
console.log(`✓ Both methods return: "${method1Result}"`)
console.log()

// Warm up - ensure caches are populated
console.log("Warming up...")
for (let i = 0; i < 10; i++) {
  getBranchViaGitCommand(repoPath)
  getBranchViaFileRead(repoPath)
}
console.log()

// Helper function to calculate statistics
function calculateStats(times: number[]): Omit<BenchmarkResult, "method" | "iterations"> {
  const sorted = [...times].sort((a, b) => a - b)
  const total = times.reduce((a, b) => a + b, 0)
  const avg = total / times.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const median = sorted[Math.floor(sorted.length / 2)]

  return {
    totalTime: total,
    avgTime: avg,
    minTime: min,
    maxTime: max,
    medianTime: median
  }
}

// Benchmark Method 1: Git command
console.log(`Running benchmark for Method 1 (git command)... ${iterations} iterations`)
const method1Times: number[] = []
let progress = 0

for (let i = 0; i < iterations; i++) {
  const start = performance.now()
  getBranchViaGitCommand(repoPath)
  const end = performance.now()
  method1Times.push(end - start)

  if (++progress % Math.ceil(iterations / 10) === 0) {
    process.stdout.write(`\r  ${((progress / iterations) * 100).toFixed(0)}%`)
  }
}
console.log("\r✓ Method 1 complete")

// Benchmark Method 2: File read
console.log(`Running benchmark for Method 2 (file read)... ${iterations} iterations`)
const method2Times: number[] = []
progress = 0

for (let i = 0; i < iterations; i++) {
  const start = performance.now()
  getBranchViaFileRead(repoPath)
  const end = performance.now()
  method2Times.push(end - start)

  if (++progress % Math.ceil(iterations / 10) === 0) {
    process.stdout.write(`\r  ${((progress / iterations) * 100).toFixed(0)}%`)
  }
}
console.log("\r✓ Method 2 complete")

// Calculate results
const result1: BenchmarkResult = {
  method: "git rev-parse --abbrev-ref HEAD (Process)",
  iterations,
  ...calculateStats(method1Times)
}

const result2: BenchmarkResult = {
  method: "Read .git/HEAD file (File System)",
  iterations,
  ...calculateStats(method2Times)
}

// Display results
console.log()
console.log("═══════════════════════════════════════════════════════════════")
console.log("RESULTS (all times in milliseconds)")
console.log("═══════════════════════════════════════════════════════════════")
console.log()

const results = [result1, result2]
console.table(results, ["method", "iterations", "avgTime", "medianTime", "minTime", "maxTime", "totalTime"])

// Calculate improvement
const improvement = ((result1.avgTime - result2.avgTime) / result1.avgTime) * 100
const speedup = result1.avgTime / result2.avgTime

console.log()
console.log("═══════════════════════════════════════════════════════════════")
console.log("ANALYSIS")
console.log("═══════════════════════════════════════════════════════════════")
console.log()

if (improvement > 0) {
  console.log(`✓ File read method is ${improvement.toFixed(2)}% faster`)
  console.log(`✓ File read method is ${speedup.toFixed(2)}x faster`)
} else {
  console.log(`✓ Git command method is ${Math.abs(improvement).toFixed(2)}% faster`)
  console.log(`✓ Git command method is ${Math.abs(1 / speedup).toFixed(2)}x faster`)
}

console.log()
console.log("Average time per call:")
console.log(`  Method 1 (Process): ${result1.avgTime.toFixed(4)}ms`)
console.log(`  Method 2 (File):    ${result2.avgTime.toFixed(4)}ms`)
console.log(`  Difference:         ${Math.abs(result1.avgTime - result2.avgTime).toFixed(4)}ms`)
console.log()

console.log("Estimated time saved per 1000 calls:")
const timePerThousand = (result1.avgTime - result2.avgTime) * 10
console.log(`  ${timePerThousand.toFixed(2)}ms (${(timePerThousand / 1000).toFixed(3)}s)`)
console.log()

// Recommendations
console.log("═══════════════════════════════════════════════════════════════")
console.log("RECOMMENDATION")
console.log("═══════════════════════════════════════════════════════════════")
console.log()

if (improvement > 20) {
  console.log("✓ Use file read method for performance-critical code")
  console.log("  The file read method is significantly faster and has no")
  console.log("  measurable accuracy loss for the common case.")
} else if (improvement < -20) {
  console.log("✓ Use git command method")
  console.log("  The git command method is faster or equally performant.")
} else {
  console.log("✓ Both methods are comparable in performance")
  console.log("  Choose based on code clarity and maintainability.")
  console.log("  Git command method is more robust and official.")
}

console.log()
