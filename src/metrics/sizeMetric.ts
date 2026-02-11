export const SizeMetric = {
  FILE_SIZE: "File size",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  EQUAL_SIZE: "Equal",
  LAST_CHANGED: "Last changed"
}

export type SizeMetricType = keyof typeof SizeMetric
