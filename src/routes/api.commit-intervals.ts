import { loadViewSearchParams } from "~/shared/viewParams"
import { AnalysisManager } from "~/server/AnalysisManager"
import { invariant } from "~/shared/util"
import type { Route } from "./+types/api.commit-intervals"

export async function loader({ request }: Route.LoaderArgs): Promise<{
  clickedObjectPath: string

  commitCountPerTimeIntervalForClickedObject: {
    date: string
    count: number
    timestamp: number
    contributors: Record<string, number>
  }[]
}> {
  const viewParams = loadViewSearchParams(request, {
    strict: true
  })
  const { start, end, timeUnit, path: repositoryPath, branch } = viewParams

  const { objectPath } = viewParams

  invariant(repositoryPath, "repositoryPath is required")
  invariant(branch, "branch is required")
  invariant(start !== null, "start is required")
  invariant(end !== null, "end is required")
  invariant(timeUnit, "timeUnit is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: repositoryPath, branch })

  const selectedObjectPath = objectPath ?? instance.repositoryName

  using _timeInterval = await instance.withTimeInterval(start, end)

  const commitCountPerTimeIntervalForClickedObject = await instance.db.getCommitCountPerTimeForClickedObject({
    timerange: [start, end],
    timeUnit,
    objectPath: selectedObjectPath
  })

  return {
    clickedObjectPath: selectedObjectPath,
    commitCountPerTimeIntervalForClickedObject
  }
}
