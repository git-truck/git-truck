import type { GitBlobObject, GitTreeObject } from "~/analyzer/model"
import type { MetricCache } from "./metrics"
import type { PointInfo } from "~/components/legend/PointLegend"
import { loadDomainConfig } from "./semanticDomains/loader.server"
import { calculateAllIntensities } from "./semanticDomains"
import type { DomainDefinition } from "./semanticDomains"

/**
 * Creates a semantic domain metric that colors files based on
 * their semantic purpose (Database, UI, API, etc.)
 *
 * This uses multi-signal analysis (path patterns, imports, keywords)
 * to determine file intensity (0-100) and converts to a gradient.
 *
 * NOTE: This must be called server-side only as it reads files from disk.
 */
export function createSemanticMetric(
  repoPath: string,
  domainName: string,
  fileTree: GitTreeObject,
  fileContents: Map<string, string>
): (blob: GitBlobObject, cache: MetricCache) => void {
  // Load domain config
  const domains = loadDomainConfig(repoPath)
  const domain = domains[domainName]

  if (!domain) {
    console.warn(`Domain ${domainName} not found in config`)
    return () => {} // No-op if domain doesn't exist
  }

  // Calculate intensities for all files
  const intensities = calculateAllIntensities(fileContents, { [domainName]: domain })

  // Extract domain color as HSL
  const [h, s] = hexToHSL(domain.color)

  // Return metric calculator function
  return (blob: GitBlobObject, cache: MetricCache) => {
    if (!cache.legend) {
      cache.legend = new Map<string, PointInfo>()
    }

    const intensity = intensities.get(blob.path)?.get(domainName) || 0

    if (intensity > 5) {
      // Convert intensity (0-100) to lightness (95-40)
      // Higher intensity = darker color
      const lightness = 95 - (intensity / 100) * 55
      const color = hslToHex(h, s, lightness)

      cache.colormap.set(blob.path, color)

      // Add to legend
      const legend = cache.legend as Map<string, PointInfo>
      const intensityBucket = Math.floor(intensity / 20) * 20 // Bucket by 20s

      const key = `${intensityBucket}-${intensityBucket + 20}`
      if (!legend.has(key)) {
        legend.set(key, { color, count: 0 })
      }
      const entry = legend.get(key)!
      entry.count++
    }
  }
}

/**
 * Converts hex color to HSL
 */
function hexToHSL(hex: string): [number, number, number] {
  // Remove # if present
  hex = hex.replace("#", "")

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/**
 * Converts HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): `#${string}` {
  const sNorm = s / 100
  const lNorm = l / 100

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0,
    g = 0,
    b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    r = 0
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    g = 0
    b = c
  } else if (h >= 300 && h < 360) {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Gets all available semantic domains for a repository
 */
export function getSemanticDomains(repoPath: string): Record<string, DomainDefinition> {
  return loadDomainConfig(repoPath)
}
