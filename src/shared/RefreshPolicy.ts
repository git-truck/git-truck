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
  | "fileTree"
  | "hiddenFiles"
  | "lastRunInfo"
  | "colorSeed"
  | "contributorColors"
  | "commitCountPerDay"
  | "loadRepoData"
  | "contribSumPerFile"
  | "contributorsForPath"
  | "maxMinContribCounts"
  | "commitCount"
  | "analyzedRepos"
  | "clickedObjectData"
  | "commitCountPerTimeIntervalForClickedObject"

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
  | "timeUnit"
  | "clickedObject"
  | "zoomPath"

// TODO: handle when start of range is increased, so renames do not need refresh
const refreshPolicy: Record<InvocationReason, DataItem[]> = {
  refresh: [
    // Will refresh everything
  ],
  show: [
    "commitCount",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "hiddenFiles",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  hide: [
    "commitCount",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "hiddenFiles",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  open: [],
  groupedContributors: [
    "cache",
    "topContributor",
    "contributorCounts",
    "contributors",
    "groupedContributors",
    "contributorsForPath",
    "commitCountPerDay",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  rerollColors: ["colorSeed"],
  timeseriesstart: [
    "cache",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  timeseriesend: [
    "cache",
    "commitCount",
    "rename",
    "topContributor",
    "commitCounts",
    "fileSizes",
    "contribSumPerFile",
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "fileTree",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  timeUnit: ["commitCountPerDay", "commitCountPerTimeIntervalForClickedObject"],
  clickedObject: ["clickedObjectData", "commitCountPerTimeIntervalForClickedObject"],
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
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "contributors",
    "groupedContributors",
    "fileTree",
    "hiddenFiles",
    "lastRunInfo",
    "colorSeed",
    "contributorColors",
    "commitCountPerDay",
    "loadRepoData",
    "maxMinFileSize",
    "clickedObjectData",
    "commitCountPerTimeIntervalForClickedObject"
  ],
  zoomPath: ["clickedObjectData", "commitCountPerTimeIntervalForClickedObject"],
  none: []
}

export function shouldUpdate(reason: InvocationReason, item: DataItem) {
  return reason === "refresh" || refreshPolicy[reason].includes(item)
}
