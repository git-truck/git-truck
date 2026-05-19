import { invariant, isBlob } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/viewParams"
import type { Route } from "./+types/api.contributor-distribution"
import { AnalysisManager } from "~/server/AnalysisManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectPath, start, end } = loadViewSearchParams(request)
  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")
  invariant(start !== null, "start is required")
  invariant(end !== null, "end is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch })

  using _timeInterval = await instance.withTimeInterval(start, end)

  const obj = await instance.db.getObjectFromPath(objectPath)
  invariant(obj, `Object ${objectPath} not found`)

  const objPath = obj.path
  const objIsBlob = isBlob(obj)

  return {
    path: objPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objPath, objIsBlob),
    contributorDistribution: await instance.db.getContributorDistributionForPath({
      objectPath: objPath,
      startSecs: start,
      endSecs: end
    }),
    lineChangesSum: await instance.db.getLineChangesSumForPath(objPath)
  }
}
