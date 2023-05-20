export const SizeMetric = {
  EQUAL_SIZE: "Equal",
  FILE_SIZE: "File size",
  MOST_COMMITS: "Number of commits",
  TRUCK_FACTOR: "Truck factor",
  RANDOM: "Random",
}

export type SizeMetricType = keyof typeof SizeMetric
