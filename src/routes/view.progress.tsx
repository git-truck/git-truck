import { sleep } from "~/shared/util"
import type { ProgressData } from "~/components/LoadingIndicator"
import type { Route } from "./+types/view.progress"
import { currentRepositoryContext } from "~/routes/view"

export const loader = async ({ context }: Route.LoaderArgs): Promise<ProgressData> => {
  const { instance } = context.get(currentRepositoryContext)
  let progressPercentage = instance.progress.reduce((acc, curr) => acc + curr, 0)
  let status = instance.analyzationStatus
  while (
    instance.prevProgress.str === status + progressPercentage ||
    instance.prevProgress.timestamp + 1000 > Date.now()
  ) {
    await sleep(1000)
    progressPercentage =
      instance.totalCommitCount > 0
        ? Math.min(
            Math.floor((instance.progress.reduce((acc, curr) => acc + curr, 0) / instance.totalCommitCount) * 100),
            100
          )
        : 0
    status = instance.analyzationStatus
  }
  instance.prevProgress.str = status + progressPercentage
  instance.prevProgress.timestamp = Date.now()
  return {
    progress: progressPercentage,
    analyzationStatus: instance.analyzationStatus
  } as ProgressData
}
