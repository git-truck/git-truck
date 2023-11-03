import type { LoaderArgs } from "@remix-run/node"
import { GitCaller } from "~/analyzer/git-caller.server";
import { gatherCommitsFromGitLog } from "~/analyzer/hydrate.server";
import type { GitLogEntry } from "~/analyzer/model";
import { getSeparator } from "~/util";

export interface CommitsPayload {
    totalCount: number,
    path: string,
    commits: GitLogEntry[]
}


let totalCount = 0

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const isFile = url.searchParams.get("isFile") === "true";
    const count = Number(url.searchParams.get("count"))
    const skip = Number(url.searchParams.get("skip"))
    const commits = new Map<string, GitLogEntry>()
    if (path && !Number.isNaN(count) && !Number.isNaN(skip)) {
        const sep = getSeparator(path)
        const split = path.split(sep)
        split.shift()
        const slicedPath = "." + sep + split.join(sep)
        if (skip === 0) {
            totalCount = await GitCaller.getInstance().getCommitCount(slicedPath, isFile)
        }
        const gitLogResult = await GitCaller.getInstance().getFileCommits(slicedPath, isFile, skip, count)
        gatherCommitsFromGitLog(gitLogResult, commits, false)
    }
    const array: GitLogEntry[] = []
    for (const [_, commit] of commits) array.push(commit)

    return { commits: array, totalCount, path} as CommitsPayload
}
