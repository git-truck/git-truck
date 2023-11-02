import type { LoaderArgs } from "@remix-run/node"
import { GitCaller } from "~/analyzer/git-caller.server";
import { gatherCommitsFromGitLog } from "~/analyzer/hydrate.server";
import type { GitLogEntry } from "~/analyzer/model";

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const isFile = url.searchParams.get("isFile") === "true";
    const count = Number(url.searchParams.get("count"))
    const skip = Number(url.searchParams.get("skip"))
    console.log("jeg er thomas", path, isFile)
    const commits = new Map<string, GitLogEntry>()
    if (path) {
        const gitLogResult = await GitCaller.getInstance().getFileCommits(path.substring(path.indexOf("/")+1), isFile, skip, count)
        gatherCommitsFromGitLog(gitLogResult, commits, false)
    }
    const array: GitLogEntry[] = []
    for (const [_, commit] of commits) array.push(commit)

    return array
}
