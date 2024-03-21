import { sleep } from "~/analyzer/util.server"
import InstanceManager from "~/analyzer/InstanceManager"
import type { LoaderFunctionArgs } from "@remix-run/node"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import { ProgressData } from "~/components/LoadingIndicator"

type ProgressResponse = { progress: number; totalCommitCount: number; analyzationStatus: AnalyzationStatus }

const defaultResponse: ProgressResponse = { progress: 0, totalCommitCount: 1, analyzationStatus: "Starting" }

export const loader = async ({ request }: LoaderFunctionArgs): Promise<ProgressResponse> => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  if (!repo || !branch) return defaultResponse
  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return defaultResponse
  let progress = instance.progress
  let status = instance.analyzationStatus
  while (instance.prevProgress === status+progress) {
    await sleep(700)
    progress = instance.progress
    status = instance.analyzationStatus
  }
  instance.prevProgress = status+progress
  return {
    progress: instance.progress,
    totalCommitCount: instance.totalCommitCount,
    analyzationStatus: instance.analyzationStatus
  } as ProgressData
}
