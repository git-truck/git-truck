type DataItem =
  | "cache"
  | "rename"
  | "topContributor"
  | "commitCounts"
  | "lastChanged"
  | "fileSizes"
  | "contributorCounts"
  | "maxMinCommitCount"
  | "newestOldestChangeDate"
  | "maxMinFileSize"
  | "contributors"
  | "groupedContributors"
  | "filetree"
  | "hiddenfiles"
  | "lastRunInfo"
  | "colorSeed"
  | "contributorColors"
  | "commitCountPerDay"
  | "loadRepoData"
  | "contribSumPerFile"
  | "maxMinContribCounts"
  | "commitCount"
  | "analyzedRepos"

export type InvocationReason =
  | "refresh"
  | "show"
  | "hide"
  | "open"
  | "groupedContributors"
  | "rerollColors"
  | "timeseriesstart"
  | "timeseriesend"
  | "contributorColor"
  | "unknown"
  | "none"

// TODO: handle when start of range is increased, so renames do not need refresh
const refreshPolicy: Record<InvocationReason, DataItem[]> = {
  refresh: [
    "cache",
    "analyzedRepos",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "groupedContributors",
    "filetree",
    "hiddenfiles",
    "lastRunInfo",
    "colorSeed",
    "contributorColors",
    "commitCountPerDay",
    "loadRepoData"
  ],
  show: [
    "cache",
    "commitCount",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "contributors",
    "hiddenfiles"
  ],
  hide: [
    "cache",
    "commitCount",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "contributors",
    "hiddenfiles"
  ],
  open: [],
  groupedContributors: ["cache", "topContributor", "contributorCounts", "contributors", "groupedContributors"],
  rerollColors: ["colorSeed"],
  timeseriesstart: [
    "cache",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors"
  ],
  timeseriesend: [
    "cache",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "filetree"
  ],
  contributorColor: ["contributorColors"],
  unknown: [
    "cache",
    "analyzedRepos",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "contributors",
    "groupedContributors",
    "filetree",
    "hiddenfiles",
    "lastRunInfo",
    "colorSeed",
    "contributorColors",
    "commitCountPerDay",
    "loadRepoData",
    "maxMinFileSize"
  ],
  none: []
}

export function shouldUpdate(reason: InvocationReason, item: DataItem) {
  return refreshPolicy[reason].find((x) => x === item) !== undefined
}
