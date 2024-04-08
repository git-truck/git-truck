import languageMap from "language-map/languages.json"

interface ColorResult {
  lang: string
  color: `#${string}` | null
}

const extensionToColor = new Map<string, ColorResult>()

for (const [key, value] of Object.entries(
  languageMap as Record<
    string,
    {
      color?: string
      extensions?: string[]
    }
  >
)) {
  if (value.color) {
    if (!value.extensions) {
      continue
    }
    for (const ext of value.extensions) {
      const extWithoutDot = ext.startsWith(".") ? ext.slice(1) : ext
      extensionToColor.set(extWithoutDot, {
        lang: key,
        color: value.color as `#${string}`
      })
    }
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
