export const ColorMetric = {
  FILE_SIZE: "File size",
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  CONTRIBUTORS: "Contributors",
  LAST_CHANGED: "Last changed"
}

export type ColorMetricType = keyof typeof ColorMetric
