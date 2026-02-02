import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import { DEFAULT_DOMAINS } from "./defaults"
import type { DomainDefinition, DomainConfig } from "./types"

const CONFIG_FILENAME = ".git-truck.json"

/**
 * Loads semantic domain configuration with three-tier merge:
 * 1. Built-in defaults (lowest priority)
 * 2. User config file (extends/overrides defaults)
 * 3. Disabled domains are filtered out
 *
 * @param repoPath - Root path of the repository
 * @returns Merged domain definitions, ready to use
 */
export function loadDomainConfig(repoPath: string): Record<string, DomainDefinition> {
  // Start with defaults
  const domains = deepClone(DEFAULT_DOMAINS)

  // Look for user config
  const configPath = path.join(repoPath, CONFIG_FILENAME)

  if (!fs.existsSync(configPath)) {
    return domains
  }

  try {
    const userConfig = loadConfigFile(configPath)

    if (!userConfig.semanticDomains) {
      return domains
    }

    // Merge user config with defaults
    mergeDomains(domains, userConfig.semanticDomains)

    // Filter out disabled domains
    return filterEnabledDomains(domains)
  } catch (error) {
    console.warn(`Warning: Failed to load semantic domain config from ${configPath}:`, error)
    return domains
  }
}

/**
 * Loads and parses the config file (supports JSON and YAML)
 */
function loadConfigFile(configPath: string): DomainConfig {
  const content = fs.readFileSync(configPath, "utf-8")

  // Try JSON first
  if (configPath.endsWith(".json")) {
    return JSON.parse(content)
  }

  // Try YAML (if yaml extension or parsing JSON failed)
  if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
    // Note: Would need to add yaml parser dependency for full YAML support
    // For now, just support JSON
    throw new Error("YAML config not yet supported, please use .git-truck.json")
  }

  // Default to JSON parsing
  return JSON.parse(content)
}

/**
 * Merges user domain configuration into base domains.
 * Strategy:
 * - Scalar fields (name, color, enabled): user overrides
 * - Array fields (keywords, imports, pathPatterns): concatenate (user extends)
 * - Weights: merge with user overriding specific weight values
 */
function mergeDomains(
  baseDomains: Record<string, DomainDefinition>,
  userDomains: Record<string, Partial<DomainDefinition>>
): void {
  for (const [domainName, userDomain] of Object.entries(userDomains)) {
    const base = baseDomains[domainName]

    if (base) {
      // Extend existing domain
      baseDomains[domainName] = {
        name: userDomain.name ?? base.name,
        color: userDomain.color ?? base.color,
        // Arrays are concatenated (deduplicated)
        keywords: dedupeArray([...(base.keywords || []), ...(userDomain.keywords || [])]),
        imports: dedupeArray([...(base.imports || []), ...(userDomain.imports || [])]),
        pathPatterns: dedupeArray([...(base.pathPatterns || []), ...(userDomain.pathPatterns || [])]),
        // Weights are merged
        weights: {
          ...(base.weights || {}),
          ...(userDomain.weights || {})
        },
        enabled: userDomain.enabled ?? base.enabled ?? true
      }
    } else {
      // New domain defined by user
      baseDomains[domainName] = {
        name: userDomain.name ?? domainName,
        color: userDomain.color ?? generateDomainColor(domainName),
        keywords: userDomain.keywords || [],
        imports: userDomain.imports || [],
        pathPatterns: userDomain.pathPatterns || [],
        weights: userDomain.weights || { keyword: 1, import: 5, path: 10 },
        enabled: userDomain.enabled ?? true
      }
    }
  }
}

/**
 * Filters out disabled domains
 */
function filterEnabledDomains(domains: Record<string, DomainDefinition>): Record<string, DomainDefinition> {
  return Object.fromEntries(Object.entries(domains).filter(([_, domain]) => domain.enabled !== false))
}

/**
 * Removes duplicate entries from an array while preserving order
 */
function dedupeArray<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Deep clones an object (simple implementation for config data)
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Generates a deterministic color for a domain based on its name
 */
function generateDomainColor(domainName: string): `#${string}` {
  const hash = createHash("md5").update(domainName).digest("hex")
  // Use first 6 chars of hash as color
  return `#${hash.substring(0, 6)}`
}

/**
 * Generates a hash of the domain configuration for cache invalidation.
 * When config changes, cached intensities should be recomputed.
 */
export function hashDomainConfig(domains: Record<string, DomainDefinition>): string {
  // Create stable string representation
  const stableConfig = Object.entries(domains)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, domain]) => ({
      name,
      keywords: domain.keywords.sort(),
      imports: domain.imports.sort(),
      pathPatterns: domain.pathPatterns.sort(),
      weights: domain.weights
    }))

  const configString = JSON.stringify(stableConfig)
  return createHash("sha256").update(configString).digest("hex")
}

/**
 * Generates a template config file with all default domains.
 * Useful for `git-truck --init-semantic-config` command.
 */
export function generateConfigTemplate(): string {
  const template = {
    semanticDomains: Object.fromEntries(
      Object.entries(DEFAULT_DOMAINS).map(([name, domain]) => [
        name,
        {
          color: domain.color,
          keywords: ["<add custom keywords>"],
          imports: ["<add custom imports>"],
          pathPatterns: ["<add custom path patterns>"],
          enabled: true,
          // Show default weights as comment guide
          weights: domain.weights
        }
      ])
    )
  }

  return (
    "// git-truck semantic domains configuration\n" +
    "// This extends the built-in defaults. Arrays (keywords, imports, pathPatterns) are merged.\n" +
    "// Set enabled: false to disable a domain.\n\n" +
    JSON.stringify(template, null, 2)
  )
}

/**
 * Writes a template config file to the specified path
 */
export function initConfigFile(repoPath: string): string {
  const configPath = path.join(repoPath, CONFIG_FILENAME)

  if (fs.existsSync(configPath)) {
    throw new Error(`Config file already exists: ${configPath}`)
  }

  const template = generateConfigTemplate()
  fs.writeFileSync(configPath, template, "utf-8")

  return configPath
}
