#!/usr/bin/env tsx
// Test semantic domain analysis on Zeeguu API (Python/Flask project)
import { loadDomainConfig, calculateAllIntensities } from './src/metrics/semanticDomains'
import fs from 'fs'
import path from 'path'

const ZEEGUU_PATH = '/Users/gh/zeeguu/api'

// Sample diverse files from the Zeeguu API project
const testFiles = new Map<string, string>()

const filesToTest = [
  // Database models
  'zeeguu/core/model/user.py',
  'zeeguu/core/model/article.py',
  'zeeguu/core/model/bookmark.py',

  // API endpoints
  'zeeguu/api/endpoints/user.py',
  'zeeguu/api/endpoints/articles.py',

  // Tests
  'zeeguu/core/test/test_user.py',
  'zeeguu/core/test/test_feed.py',

  // Auth
  'zeeguu/core/account_management/user_account_creation.py',

  // Config
  'setup.py',
  'api.cfg',
]

console.log('Loading files from Zeeguu API...\n')

for (const relPath of filesToTest) {
  const fullPath = path.join(ZEEGUU_PATH, relPath)
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    testFiles.set(relPath, content)
    console.log(`✓ Loaded ${relPath}`)
  } catch (err) {
    console.log(`✗ Skip ${relPath} (not found)`)
  }
}

if (testFiles.size === 0) {
  console.error('\nNo files found! Check that /Users/gh/zeeguu/api exists')
  process.exit(1)
}

console.log(`\n=== Analyzing ${testFiles.size} files from Zeeguu API ===\n`)

// Load default domains (no custom config)
const domains = loadDomainConfig(ZEEGUU_PATH)
const results = calculateAllIntensities(testFiles, domains)

// Display results
for (const [filepath, scores] of results) {
  console.log(`\n📄 ${filepath}`)

  const sortedScores = [...scores.entries()]
    .filter(([_, score]) => score > 5)
    .sort((a, b) => b[1] - a[1])

  if (sortedScores.length === 0) {
    console.log('   ⚪ No strong domain signals')
  } else {
    for (const [domain, score] of sortedScores) {
      const bar = '█'.repeat(Math.min(20, Math.round(score / 5)))
      const emoji = score > 30 ? '🟢' : score > 15 ? '🟡' : '🔵'
      const padding = ' '.repeat(Math.max(0, 12 - domain.length))
      console.log(`   ${emoji} ${domain}${padding} ${score.toString().padStart(3)}/100  ${bar}`)
    }
  }
}

// Summary statistics
console.log('\n\n=== Summary ===\n')

const domainCounts = new Map<string, number>()
for (const scores of results.values()) {
  for (const [domain, score] of scores) {
    if (score > 10) {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
    }
  }
}

console.log('Files per domain (with score > 10):')
for (const [domain, count] of [...domainCounts.entries()].sort((a, b) => b[1] - a[1])) {
  const percentage = Math.round((count / testFiles.size) * 100)
  console.log(`  ${domain.padEnd(12)} ${count}/${testFiles.size} files (${percentage}%)`)
}

console.log('\n\nDomain definitions loaded:')
for (const [name, domain] of Object.entries(domains)) {
  console.log(`  ${domain.color} ${name}`)
}
