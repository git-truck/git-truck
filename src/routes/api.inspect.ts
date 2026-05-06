import { invariant } from "~/shared/util"
import { loadViewSearchParams } from "~/routes/view"
import type { Route } from "./+types/api.inspect"
import { AnalysisManager } from "~/server/AnalysisManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch, objectPath,  } = loadViewSearchParams(request)

  invariant(path, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch })

  const isBlob = await instance.db.getObjectType(objectPath) === "blob"

  const topContributorData = await instance.db.getContributorDistributionForPath(objectPath)

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, isBlob),
    topContributor: topContributorData,
    multiTopContributors:
      topContributorData.length > 1 && topContributorData[0].contribs === topContributorData[1].contribs,
    amountOfCommits: await instance.db.getCommitCountForPath(objectPath),
    contributors: await instance.db.getUniqueContributorsForPath(objectPath),
    contributions: await instance.db.getContributionsForPath(objectPath),
    lastChanged: await instance.db.getLastChangedForPath(objectPath)
  }
}
