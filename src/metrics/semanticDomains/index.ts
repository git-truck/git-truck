/**
 * Semantic Domain Highlighting System
 *
 * Provides configurable semantic analysis of codebases to highlight files
 * based on their purpose (Database, UI, API, Testing, etc.) rather than
 * just git metrics.
 *
 * Features:
 * - Built-in defaults for common patterns across multiple languages
 * - User-configurable via .git-truck.json
 * - Extensible: add custom domains or extend existing ones
 * - Multi-signal analysis: path patterns, imports, keywords
 * - Intensity scoring (0-100) for gradient visualization
 *
 * @example
 * ```typescript
 * import { loadDomainConfig, calculateAllIntensities } from './semanticDomains'
 *
 * const domains = loadDomainConfig('/path/to/repo')
 * const files = new Map([
 *   ['src/db/users.ts', fileContent1],
 *   ['src/components/Button.tsx', fileContent2]
 * ])
 * const intensities = calculateAllIntensities(files, domains)
 * ```
 */

export { calculateDomainIntensity, calculateAllIntensities } from "./calculator"
export { DEFAULT_DOMAINS } from "./defaults"
export type { DomainDefinition, DomainConfig, DomainIntensities } from "./types"

// Server-only exports (use dynamic import from ./loader.server)
// export { loadDomainConfig, hashDomainConfig, generateConfigTemplate, initConfigFile } from "./loader.server"
