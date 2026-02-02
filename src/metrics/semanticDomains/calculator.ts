import minimatch from "minimatch"
import type { DomainDefinition } from "./types"

/**
 * Calculates how strongly a file belongs to a semantic domain (0-100).
 * Uses three signals with configurable weights:
 * 1. Path patterns - file location (strongest signal)
 * 2. Import statements - dependencies (strong signal)
 * 3. Keyword frequency - content analysis (weaker, normalized by file size)
 */
export function calculateDomainIntensity(
  filePath: string,
  fileContent: string,
  domain: DomainDefinition
): number {
  const weights = domain.weights || {}
  const keywordWeight = weights.keyword ?? 1
  const importWeight = weights.import ?? 5
  const pathWeight = weights.path ?? 10

  let score = 0

  // Signal 1: Path pattern matching
  score += calculatePathScore(filePath, domain.pathPatterns, pathWeight)

  // Signal 2: Import statement matching
  score += calculateImportScore(fileContent, domain.imports, importWeight)

  // Signal 3: Keyword density
  score += calculateKeywordScore(fileContent, domain.keywords, keywordWeight)

  // Normalize to 0-100 range with soft cap
  return normalizeScore(score)
}

/**
 * Checks if file path matches any of the domain's patterns.
 * Returns weight if matched, 0 otherwise.
 */
function calculatePathScore(filePath: string, patterns: string[], weight: number): number {
  for (const pattern of patterns) {
    if (minimatch(filePath, pattern, { nocase: true, matchBase: true })) {
      return weight
    }
  }
  return 0
}

/**
 * Extracts and matches import statements.
 * Supports multiple import syntaxes across languages.
 */
function calculateImportScore(fileContent: string, domainImports: string[], weight: number): number {
  const imports = extractImports(fileContent)
  let score = 0

  for (const domainImport of domainImports) {
    // Check if any extracted import contains the domain import string
    const hasMatch = imports.some((imp) => imp.includes(domainImport))
    if (hasMatch) {
      score += weight
    }
  }

  return score
}

/**
 * Extracts import statements from various programming languages:
 * - JavaScript/TypeScript: import/require
 * - Python: import/from
 * - Go: import
 * - Rust: use
 */
function extractImports(fileContent: string): string[] {
  const imports: string[] = []

  // JavaScript/TypeScript: import ... from "package"
  const jsImportRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
  for (const match of fileContent.matchAll(jsImportRegex)) {
    imports.push(match[1])
  }

  // JavaScript/TypeScript: require("package")
  const jsRequireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of fileContent.matchAll(jsRequireRegex)) {
    imports.push(match[1])
  }

  // Python: from package import ... / import package
  const pyImportRegex = /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g
  for (const match of fileContent.matchAll(pyImportRegex)) {
    imports.push(match[1] || match[2])
  }

  // Go: import "package" / import ("package1", "package2")
  const goImportRegex = /import\s+(?:\(([^)]+)\)|"([^"]+)")/g
  for (const match of fileContent.matchAll(goImportRegex)) {
    if (match[1]) {
      // Multiple imports in parens
      const pkgs = match[1].match(/"([^"]+)"/g)
      if (pkgs) {
        imports.push(...pkgs.map((p) => p.replace(/"/g, "")))
      }
    } else if (match[2]) {
      imports.push(match[2])
    }
  }

  // Rust: use package::module;
  const rustUseRegex = /use\s+([\w:]+)/g
  for (const match of fileContent.matchAll(rustUseRegex)) {
    imports.push(match[1])
  }

  return imports
}

/**
 * Calculates keyword density using TF-IDF-inspired approach.
 * Normalizes by file size to avoid bias toward longer files.
 */
function calculateKeywordScore(fileContent: string, keywords: string[], weight: number): number {
  const tokens = fileContent.split(/\s+/)
  const totalTokens = tokens.length

  if (totalTokens === 0) {
    return 0
  }

  let totalMatches = 0

  for (const keyword of keywords) {
    // Case-insensitive, whole-word matching
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi")
    const matches = (fileContent.match(regex) || []).length
    totalMatches += matches
  }

  // Term frequency normalized by document length, scaled to reasonable range
  const normalizedFrequency = (totalMatches / totalTokens) * 100
  return normalizedFrequency * weight
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Normalizes score to 0-100 range with soft ceiling.
 * Uses logarithmic scaling to prevent extreme values.
 */
function normalizeScore(score: number): number {
  if (score <= 0) return 0
  if (score >= 100) return 100

  // Soft cap using logarithmic scaling for scores over 50
  if (score > 50) {
    const excess = score - 50
    const damped = 50 + Math.log10(excess + 1) * 15
    return Math.min(Math.round(damped), 100)
  }

  return Math.round(score)
}

/**
 * Batch calculates intensities for multiple files across all domains.
 * Returns a map of filepath -> domain -> intensity score.
 */
export function calculateAllIntensities(
  files: Map<string, string>,
  domains: Record<string, DomainDefinition>
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()

  for (const [filepath, content] of files) {
    const fileScores = new Map<string, number>()

    for (const [domainName, domain] of Object.entries(domains)) {
      const intensity = calculateDomainIntensity(filepath, content, domain)
      fileScores.set(domainName, intensity)
    }

    result.set(filepath, fileScores)
  }

  return result
}
