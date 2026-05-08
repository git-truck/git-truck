import { invariant, isBlob } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/viewParams"
import type { Route } from "./+types/api.contributor-distribution"
import { AnalysisManager } from "~/server/AnalysisManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectHash } = loadViewSearchParams(request)
  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectHash, "objectHash is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch })

  const obj = await instance.db.getObjectFromHash(objectHash)
  invariant(obj, `Object ${objectHash} not found`)

  const objectPath = obj?.path
  const objIsBlob = isBlob(obj)

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, objIsBlob),
    contributorDistribution: await instance.db.getContributorDistributionForPath(objectPath),
    lineChangesSum: await instance.db.getLineChangesSumForPath(objectPath)
  }
}
