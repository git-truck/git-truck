import { invariant } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/view"
import type { Route } from "./+types/view.api.inspect.metrics"
import InstanceManager from "~/analyzer/InstanceManager.server"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectPath, objectType } = loadViewSearchParams(request)

  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")
  invariant(objectType, "objectType is required")

  const instance = await InstanceManager.getOrCreateInstance({ repositoryPath: path, branch })

  const isBlob = objectType === "blob"

  const topContributorData = await instance.db.getContributorDistributionForPath(objectPath)

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, isBlob),
    topContributor: topContributorData,
    multiTopContributors:
      topContributorData.length > 1 && topContributorData[0].contribs === topContributorData[1].contribs,
    amountOfCommits: await instance.db.getCommitCountForPath(objectPath),
    contributors: await instance.db.getUniqueContributorsForPath(objectPath)
  }
}
