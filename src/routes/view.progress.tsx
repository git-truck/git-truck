import { sleep } from "~/shared/util"
import type { ProgressData } from "~/components/LoadingIndicator"
import type { Route } from "./+types/view.progress"
import { currentRepositoryContext } from "~/routes/view"

const POLLING_RATE = 1000

export const loader = async ({ context }: Route.LoaderArgs): Promise<ProgressData> => {
  const { instance } = context.get(currentRepositoryContext)
  let progressPercentage = calculateProgressPercentage(instance.progress, instance.totalCommitCount)
  let status = instance.analyzationStatus
  while (
    instance.prevProgress.str === status + progressPercentage ||
    instance.prevProgress.timestamp + POLLING_RATE > Date.now()
  ) {
    await sleep(POLLING_RATE)
    progressPercentage = calculateProgressPercentage(instance.progress, instance.totalCommitCount)
    status = instance.analyzationStatus
  }
  instance.prevProgress.str = status + progressPercentage
  instance.prevProgress.timestamp = Date.now()
  return {
    progress: progressPercentage,
    analyzationStatus: instance.analyzationStatus
  } as ProgressData
}

function calculateProgressPercentage(progress: number[], totalCommitCount: number): number {
  return totalCommitCount > 0
    ? Math.min(Math.floor((progress.reduce((acc, curr) => acc + curr, 0) / totalCommitCount) * 100), 100)
    : 0
}
