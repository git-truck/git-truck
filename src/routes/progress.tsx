import InstanceManager from "~/analyzer/InstanceManager.client"
import { ProgressData } from "~/components/LoadingIndicator"
import { sleep } from "~/util"
import { ClientLoaderFunctionArgs } from "@remix-run/react"

const defaultResponse: ProgressData = { progress: 0, analyzationStatus: "Starting" }

export const clientLoader = async ({ request }: ClientLoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  if (!repo || !branch) return defaultResponse
  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return defaultResponse
  let progressPercentage = instance.progress.reduce((acc, curr) => acc + curr, 0)
  let status = instance.analyzationStatus
  while (
    instance.prevProgress.str === status + progressPercentage ||
    instance.prevProgress.timestamp + 1000 > Date.now()
  ) {
    await sleep(1000)
    progressPercentage =
      instance.totalCommitCount > 0
        ? Math.floor((instance.progress.reduce((acc, curr) => acc + curr, 0) / instance.totalCommitCount) * 100)
        : 0
    if (progressPercentage > 100) progressPercentage = 100
    status = instance.analyzationStatus
  }
  instance.prevProgress.str = status + progressPercentage
  instance.prevProgress.timestamp = Date.now()
  const data: ProgressData = {
    progress: progressPercentage,
    analyzationStatus: instance.analyzationStatus
  }

  return data
}
