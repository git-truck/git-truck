import gitcolors from "github-colors/colors.json"
import langMap from "lang-map"

interface ColorResult {
  lang: string
  color: string | null
}

const lowercasedColors = new Map<string, ColorResult>()
for (const [key, value] of Object.entries(gitcolors)) {
  lowercasedColors.set(key.toLowerCase(), {
    ...value,
    lang: key,
  })
}

export function getColorFromExtension(extension: string) {
  const langMatches = langMap.languages(extension.toLowerCase())
  const langs = []
  if (!langMatches) return null
  let colorResult = null
  // Loop through lang resuts
  for (const langResult of langMatches) {
    // If we have a color for the language, return it
    const match = lowercasedColors.get(langResult)
    if (match) {
      colorResult = match
      langs.push(colorResult.lang)
      break
    }
  }
  if (!colorResult) return null
  return colorResult.color
}
