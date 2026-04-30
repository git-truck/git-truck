import languageMap from "language-map/languages.json" with { type: "json" }
import type { GitObject, HexColor, GitTreeObject } from "~/shared/model"

interface ColorResult {
  lang: string
  color: HexColor | null
}

/**
 * Counts all leaf nodes (blobs) in a tree recursively.
 * @param root The root GitObject to count leaf nodes from
 * @returns The total number of leaf nodes (blobs)
 */
export function countLeafNodes(root: GitObject): number {
  if (root.type === "blob") {
    return 1
  }

  if (root.type === "tree") {
    const treeRoot = root as GitTreeObject
    return treeRoot.children.reduce((sum, child) => sum + countLeafNodes(child), 0)
  }

  return 0
}

const extensionToColor = new Map<string, ColorResult>()

for (const [lang, { color, extensions }] of Object.entries(
  languageMap as Record<
    string,
    {
      color?: string
      extensions?: string[]
    }
  >
)) {
  if (!extensions) {
    continue
  }

  for (const ext of extensions) {
    const extWithoutDot = ext.startsWith(".") ? ext.slice(1) : ext
    extensionToColor.set(extWithoutDot, {
      lang,
      color: (color ?? null) as HexColor | null
    })
  }
}

export function getColorFromExtension(extension: string): ColorResult | null {
  const colorResult = extensionToColor.get(extension)
  if (!colorResult) return null
  return colorResult
}

export class SpectrumTranslater {
  readonly scale: number
  readonly offset: number
  readonly target_max: number
  readonly target_min: number

  constructor(input_min: number, input_max: number, target_min: number, target_max: number) {
    this.scale = (target_max - target_min) / (input_max - input_min)
    this.offset = input_min * this.scale - target_min
    this.target_max = target_max
    this.target_min = target_min
  }

  translate(input: number) {
    return input * this.scale - this.offset
  }

  inverseTranslate(input: number) {
    return this.target_max - this.translate(input) + this.target_min
  }
}

export function getMinMaxValuesForMetric(
  root: GitObject,
  perFileMap: Record<string, number>
): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity

  function traverse(node: GitObject) {
    if (node.type === "blob") {
      const value = perFileMap[node.path]
      if (value !== undefined) {
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    } else {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(root)
  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max }
}
