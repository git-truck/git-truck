type DataItem =
  | "cache"
  | "rename"
  | "dominantAuthor"
  | "commitCounts"
  | "lastChanged"
  | "authorCounts"
  | "maxMinCommitCount"
  | "newestOldestChangeDate"
  | "authors"
  | "authorunions"
  | "filetree"
  | "hiddenfiles"
  | "lastRunInfo"
  | "colorSeed"
  | "authorColors"
  | "commitCountPerDay"
  | "loadRepoData"
  | "contribSumPerFile"
  | "contributorsForPath"
  | "maxMinContribCounts"
  | "commitCount"
  | "analyzedRepos"

export type InvocationReason =
  | "refresh"
  | "show"
  | "hide"
  | "open"
  | "unionedAuthors"
  | "rerollColors"
  | "timeseriesstart"
  | "timeseriesend"
  | "authorcolor"
  | "unknown"
  | "none"

// TODO: handle when start of range is increased, so renames do not need refresh
const refreshPolicy: Record<InvocationReason, DataItem[]> = {
  refresh: [
    "cache",
    "analyzedRepos",
    "commitCount",
    "rename",
    "dominantAuthor",
    "commitCounts",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "authorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors",
    "authorunions",
    "filetree",
    "hiddenfiles",
    "lastRunInfo",
    "colorSeed",
    "authorColors",
    "commitCountPerDay",
    "loadRepoData"
  ],
  show: [
    "cache",
    "commitCount",
    "dominantAuthor",
    "commitCounts",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "authorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors",
    "hiddenfiles"
  ],
  hide: [
    "cache",
    "commitCount",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors",
    "hiddenfiles"
  ],
  open: [],
  unionedAuthors: ["cache", "dominantAuthor", "authorCounts", "authors", "authorunions"],
  rerollColors: ["colorSeed"],
  timeseriesstart: [
    "cache",
    "commitCount",
    "rename",
    "dominantAuthor",
    "commitCounts",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "authorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors"
  ],
  timeseriesend: [
    "cache",
    "commitCount",
    "rename",
    "dominantAuthor",
    "commitCounts",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "authorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors",
    "filetree"
  ],
  authorcolor: ["authorColors"],
  unknown: [
    "cache",
    "analyzedRepos",
    "commitCount",
    "rename",
    "dominantAuthor",
    "commitCounts",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "authorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "authors",
    "authorunions",
    "filetree",
    "hiddenfiles",
    "lastRunInfo",
    "colorSeed",
    "authorColors",
    "commitCountPerDay",
    "loadRepoData"
  ],
  none: []
}

export function shouldUpdate(reason: InvocationReason, item: DataItem) {
  return refreshPolicy[reason].find((x) => x === item) !== undefined
}
