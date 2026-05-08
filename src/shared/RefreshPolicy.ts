import { log } from "~/server/log"

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

// TODO: handle when start of range is increased, so renames do not need refresh
const refreshPolicy: Record<InvocationReason, DataItem[]> = {
  refresh: [
    // Will refresh everything
  ],
  show: [
    "fileTree",
    "cache",
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
    "newestOldestChangeDate",
    "contributors",
    "hiddenFiles"
  ],
  hide: [
    "cache",
    "commitCount",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "newestOldestChangeDate",
    "contributors",
    "hiddenFiles"
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
    "contributorsForPath",
    "lastChanged",
    "contributorCounts",
    "maxMinCommitCount",
    "maxMinContribCounts",
    "maxMinFileSize",
    "newestOldestChangeDate",
    "contributors",
    "clickedObjectData"
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
    "clickedObjectData"
  ],
  timeUnit: ["commitCountPerDay"],
  clickedObject: ["clickedObjectData"],
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
    "maxMinFileSize"
  ],
  none: []
}

export function shouldUpdate(reason: InvocationReason, item: DataItem) {
  // TODO: Re implement this caching behavior
  // return true
  const willUpdate = reason === "refresh" || refreshPolicy[reason].find((x) => x === item) !== undefined
  if (willUpdate) {
    log.warn(`Updating ${item} because of reason ${reason}`)
  } else {
    log.warn(`Not updating ${item} because of reason ${reason}`)
  }
  return willUpdate
}
