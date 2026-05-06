import { invariant } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/view"
import type { Route } from "./+types/api.contributor-distribution"
import { AnalysisManager } from "~/server/AnalysisManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectPath } = loadViewSearchParams(request)
  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch })
  const isBlob = await instance.db.getObjectType(objectPath) === "blob"

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, isBlob),
    contributorDistribution: await instance.db.getContributorDistributionForPath(objectPath),
    lineChangesSum: await instance.db.getLineChangesSumForPath(objectPath)
  }
}
