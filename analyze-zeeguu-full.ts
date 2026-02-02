#!/usr/bin/env tsx
// Full analysis of Zeeguu API codebase
import { loadDomainConfig, calculateAllIntensities } from './src/metrics/semanticDomains'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ZEEGUU_PATH = '/Users/gh/zeeguu/api'

console.log('🔍 Finding all Python files in Zeeguu API...\n')

// Find all .py files
const output = execSync(`find ${ZEEGUU_PATH} -name "*.py" -type f`, { encoding: 'utf-8' })
const allFiles = output.trim().split('\n').filter(f =>
  !f.includes('__pycache__') &&
  !f.includes('.egg-info') &&
  !f.includes('node_modules')
)

console.log(`Found ${allFiles.length} Python files\n`)

// Load files
const testFiles = new Map<string, string>()
const MAX_FILES = 50 // Sample to avoid taking too long

const sampledFiles = allFiles
  .sort(() => Math.random() - 0.5) // Shuffle
  .slice(0, MAX_FILES)

for (const fullPath of sampledFiles) {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    const relPath = path.relative(ZEEGUU_PATH, fullPath)
    testFiles.set(relPath, content)
  } catch (err) {
    // Skip files we can't read
  }
}

console.log(`Analyzing ${testFiles.size} sampled files...\n`)

const domains = loadDomainConfig(ZEEGUU_PATH)
const results = calculateAllIntensities(testFiles, domains)

// Aggregate statistics
const domainTotals = new Map<string, { count: number; totalScore: number; maxScore: number }>()

for (const [name] of Object.entries(domains)) {
  domainTotals.set(name, { count: 0, totalScore: 0, maxScore: 0 })
}

for (const [filepath, scores] of results) {
  for (const [domain, score] of scores) {
    if (score > 10) { // Only count significant matches
      const stats = domainTotals.get(domain)!
      stats.count++
      stats.totalScore += score
      stats.maxScore = Math.max(stats.maxScore, score)
    }
  }
}

// Display distribution
console.log('=== Domain Distribution Across Codebase ===\n')

const sortedDomains = [...domainTotals.entries()]
  .sort((a, b) => b[1].count - a[1].count)

for (const [domain, stats] of sortedDomains) {
  if (stats.count === 0) continue

  const percentage = Math.round((stats.count / testFiles.size) * 100)
  const avgScore = Math.round(stats.totalScore / stats.count)
  const bar = '█'.repeat(Math.min(50, Math.round(percentage / 2)))

  const domainColor = domains[domain]?.color || '#999999'

  console.log(`${domainColor} ${domain.padEnd(12)} ${stats.count.toString().padStart(3)} files (${percentage.toString().padStart(2)}%)  ${bar}`)
  console.log(`${''.padEnd(22)}  avg: ${avgScore}/100, max: ${stats.maxScore}/100\n`)
}

// Show top files per domain
console.log('\n=== Top Files per Domain ===\n')

for (const [domain] of sortedDomains) {
  const filesForDomain = [...results.entries()]
    .map(([filepath, scores]) => ({ filepath, score: scores.get(domain) || 0 }))
    .filter(f => f.score > 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (filesForDomain.length === 0) continue

  console.log(`${domain}:`)
  for (const { filepath, score } of filesForDomain) {
    console.log(`  ${score}/100  ${filepath}`)
  }
  console.log()
}

// File type breakdown
console.log('\n=== File Type Analysis ===\n')

const byPath = {
  models: [...results.entries()].filter(([p]) => p.includes('/model/')),
  api: [...results.entries()].filter(([p]) => p.includes('/api/') || p.includes('/endpoints/')),
  tests: [...results.entries()].filter(([p]) => p.includes('/test')),
  core: [...results.entries()].filter(([p]) => p.includes('/core/') && !p.includes('/model/') && !p.includes('/test')),
  config: [...results.entries()].filter(([p]) => p.endsWith('.cfg') || p.endsWith('setup.py')),
}

for (const [category, files] of Object.entries(byPath)) {
  if (files.length === 0) continue

  console.log(`${category.padEnd(12)} ${files.length} files`)

  // Show dominant domain for this category
  const domainScores = new Map<string, number>()
  for (const [_, scores] of files) {
    for (const [domain, score] of scores) {
      if (score > 10) {
        domainScores.set(domain, (domainScores.get(domain) || 0) + 1)
      }
    }
  }

  const topDomain = [...domainScores.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topDomain) {
    const [domain, count] = topDomain
    const pct = Math.round((count / files.length) * 100)
    console.log(`              → ${pct}% ${domain}`)
  }
  console.log()
}
