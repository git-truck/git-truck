import type { LoaderArgs } from "@remix-run/node"
import { GitCaller } from "~/analyzer/git-caller.server";
import { gatherCommitsFromGitLog } from "~/analyzer/hydrate.server";
import type { GitLogEntry } from "~/analyzer/model";

export const loader = async ({ request }: LoaderArgs) => {
    const url = new URL(request.url);
    const commitHashes = url.searchParams.get("commits")?.split(",") ?? []
    const commits = new Map<string, GitLogEntry>()
    const gitShowResult = await GitCaller.getInstance().gitShow(commitHashes)
    gatherCommitsFromGitLog(gitShowResult, commits, false)
    const array: GitLogEntry[] = []
    for (const [_, commit] of commits) array.push(commit)
    return array
}
