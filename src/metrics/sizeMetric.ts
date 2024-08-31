export const SizeMetric = {
  FILE_SIZE: "File size",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBS: "Line changes",
  EQUAL_SIZE: "Equal",
  LAST_CHANGED: "Last changed"
}

export type SizeMetricType = keyof typeof SizeMetric
