import { invariant } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/view"
import type { Route } from "./+types/view.api.contributor-distribution"
import AnalyzationInstanceManager from "~/server/AnalyzationInstanceManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectPath, objectType } = loadViewSearchParams(request)
  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")

  const instance = await AnalyzationInstanceManager.getOrCreateInstance({ repositoryPath: path, branch })
  const isBlob = objectType === "blob"

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, isBlob),
    contributorDistribution: await instance.db.getContributorDistributionForPath(objectPath),
    lineChangesSum: await instance.db.getLineChangesSumForPath(objectPath)
  }
}
