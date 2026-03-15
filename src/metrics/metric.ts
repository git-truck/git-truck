import type { GitObject } from "~/shared/model";

type Metric {
  name: string;
  description: string;
  compute: (obj: GitObject) => number | string;
  categorize: (obj: GitObject) => string;
}

const linesChangedMetric: Metric = {
  name: "Lines Changed",
  description: "The total number of lines added and removed in a commit.",
