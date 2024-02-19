import type { LoaderFunctionArgs } from "@remix-run/node"
import invariant from "tiny-invariant"
import { log } from "~/analyzer/log.server"
import type { GitLogEntry } from "~/analyzer/model"
import { describeAsyncJob } from "~/analyzer/util.server"
import InstanceManager from "~/analyzer/InstanceManager"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []

  const commitHashes = url.searchParams.get("commits")?.split(",") ?? []
  const commitsMap = new Map<string, GitLogEntry>()

  const [gitShowResult, gitShowError] = await describeAsyncJob({
    job: () => instance.gitCaller.gitShow(commitHashes),
    beforeMsg: "Loading commits",
    afterMsg: "Loaded commits",
    errorMsg: "Failed to load commits"
  })

  if (gitShowError) {
    log.error(gitShowError)
    throw gitShowError
  }

  instance.gatherCommitsFromGitLog(gitShowResult, commitsMap, false)
  return Array.from(commitsMap.values())
}
