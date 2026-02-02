#!/usr/bin/env tsx
// Demo: Test the semantic domain calculator on real git-truck files
import { loadDomainConfig, calculateAllIntensities } from './src/metrics/semanticDomains'
import fs from 'fs'

const testFiles = new Map([
  ['src/analyzer/DB.server.ts', fs.readFileSync('src/analyzer/DB.server.ts', 'utf-8')],
  ['src/components/Chart.tsx', fs.readFileSync('src/components/Chart.tsx', 'utf-8')],
  ['src/routes/$repo.$.tsx', fs.readFileSync('src/routes/$repo.$.tsx', 'utf-8')],
  ['src/analyzer/coauthors.server.test.ts', fs.readFileSync('src/analyzer/coauthors.server.test.ts', 'utf-8')],
])

const domains = loadDomainConfig(process.cwd())
const results = calculateAllIntensities(testFiles, domains)

console.log('\n=== Semantic Domain Analysis of git-truck Files ===\n')

for (const [filepath, scores] of results) {
  console.log(`📄 ${filepath}`)

  const sortedScores = [...scores.entries()]
    .filter(([_, score]) => score > 5)
    .sort((a, b) => b[1] - a[1])

  if (sortedScores.length === 0) {
    console.log('   No strong domain signals')
  } else {
    for (const [domain, score] of sortedScores) {
      const bar = '█'.repeat(Math.round(score / 5))
      const padding = ' '.repeat(Math.max(0, 15 - domain.length))
      console.log(`   ${domain}${padding} ${score.toString().padStart(3)}/100 ${bar}`)
    }
  }
  console.log()
}

console.log('Domain Colors:')
for (const [name, domain] of Object.entries(domains)) {
  console.log(`  ${name}: ${domain.color}`)
}
