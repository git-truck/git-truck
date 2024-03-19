import { sleep } from "~/analyzer/util.server"
import InstanceManager from "~/analyzer/InstanceManager"
import type { LoaderFunctionArgs } from "@remix-run/node"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"

type ProgressResponse = { progress: number; totalCommitCount: number; analyzationStatus: AnalyzationStatus }

const defaultResponse: ProgressResponse = { progress: 0, totalCommitCount: 1, analyzationStatus: "Starting" }

// TODO this does not update progress. Rework using defer

export const loader = async ({ request }: LoaderFunctionArgs): Promise<ProgressResponse> => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  if (!repo || !branch) return defaultResponse
  const instance = InstanceManager.getInstance(branch, repo)
  if (!instance) return defaultResponse
  await sleep(700)

  return {
    progress: instance.progress,
    totalCommitCount: instance.totalCommitCount,
    analyzationStatus: instance.analyzationStatus
  }
}
