import type { LoaderArgs } from "@remix-run/node"
import { GitCaller } from "~/analyzer/git-caller.server";
import { gatherCommitsFromGitLog } from "~/analyzer/hydrate.server";
import type { GitLogEntry } from "~/analyzer/model";

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
    console.log("jeg er thomas", path, isFile)
    const commits = new Map<string, GitLogEntry>()
    if (path && !Number.isNaN(count) && !Number.isNaN(skip)) {
        const slicedPath = path.substring(path.indexOf("/")+1)
        if (skip === 0) {
            totalCount = Number(await GitCaller.getInstance().getCommitCount(slicedPath))
        }
        const gitLogResult = await GitCaller.getInstance().getFileCommits(slicedPath, isFile, skip, count)
        gatherCommitsFromGitLog(gitLogResult, commits, false)
    }
    const array: GitLogEntry[] = []
    for (const [_, commit] of commits) array.push(commit)

    return { commits: array, totalCount, path} as CommitsPayload
}
