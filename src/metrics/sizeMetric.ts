export const SizeMetric = {
  MOST_COMMITS: "Commits",
  FILE_SIZE: "File size",
  MOST_CONTRIBUTIONS: "Line changes",
  EQUAL_SIZE: "Equal",
  LAST_CHANGED: "Last changed"
}

export type SizeMetricType = keyof typeof SizeMetric
