export type DataItem = 
    "cache"|
    "rename"|
    "dominantAuthor"|
    "commitCounts"|
    "lastChanged"|
    "authorCounts"|
    "maxMinCommitCount"|
    "newestOldestChangeDate"|
    "authors"|
    "authorunions"|
    "filetree"|
    "hiddenfiles"|
    "lastRunInfo"|
    "colorSeed"|
    "authorColors"|
    "commitCountPerDay"|
    "loadRepoData"

export type InvocationReason = 
    "refresh"|
    "unignore"|
    "ignore"|
    "open"|
    "unionedAuthors"|
    "rerollColors"|
    "timeseriesstart"|
    "timeseriesend"|
    "authorcolor"|
    "unknown"|
    "none"

    // TODO: handle when start of range is increased, so renames do not need refresh
const refreshPolicy: Record<InvocationReason, DataItem[]> = {
    "refresh": ["cache", "rename", "dominantAuthor", "commitCounts", "lastChanged", "authorCounts", "maxMinCommitCount", "newestOldestChangeDate", "authors", "authorunions", "filetree", "hiddenfiles", "lastRunInfo", "colorSeed", "authorColors", "commitCountPerDay", "loadRepoData"],
    "unignore": ["cache", "dominantAuthor", "commitCounts", "lastChanged", "authorCounts", "maxMinCommitCount", "newestOldestChangeDate", "authors", "hiddenfiles"],
    "ignore": ["cache", "maxMinCommitCount", "newestOldestChangeDate", "authors"],
    "open": [],
    "unionedAuthors": ["cache", "dominantAuthor", "authorCounts", "authors", "authorunions"],
    "rerollColors": ["colorSeed"],
    "timeseriesstart": ["cache", "rename", "dominantAuthor", "commitCounts", "lastChanged", "authorCounts", "maxMinCommitCount", "newestOldestChangeDate", "authors"],
    "timeseriesend": ["cache", "rename", "dominantAuthor", "commitCounts", "lastChanged", "authorCounts", "maxMinCommitCount", "newestOldestChangeDate", "authors", "filetree"],
    "authorcolor": ["authorColors"],
    "unknown": ["cache", "rename", "dominantAuthor", "commitCounts", "lastChanged", "authorCounts", "maxMinCommitCount", "newestOldestChangeDate", "authors", "authorunions", "filetree", "hiddenfiles", "lastRunInfo", "colorSeed", "authorColors", "commitCountPerDay", "loadRepoData"],
    "none": []
}

export function shouldUpdate(reason: InvocationReason, item: DataItem) {
    return refreshPolicy[reason].find(x => x === item) !== undefined
}
