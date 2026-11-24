import type { MetricCache } from "~/metrics/metrics"

export function getSelectedFilePaths(
  categoriesMap: MetricCache["categoriesMap"],
  selectedCategories: readonly string[],
  repositoryRoot: string
): string[] {
  const selected = new Set(selectedCategories)
  const prefix = `${repositoryRoot}/`

  return [...categoriesMap]
    .filter(([, categories]) => categories.some(({ category }) => selected.has(category)))
    .map(([path]) => (path.startsWith(prefix) ? path.slice(prefix.length) : path))
    .sort((first, second) => first.localeCompare(second))
}
