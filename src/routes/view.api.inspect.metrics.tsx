import { invariant } from "~/shared/util"
import { currentRepositoryContext } from "~/routes/view"
import type { Route } from "./+types/view.api.inspect.metrics"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const objectPath = url.searchParams.get("objectPath")
  const objectType = url.searchParams.get("objectType")
  const { instance } = context.get(currentRepositoryContext)
  invariant(objectPath, "path is required")
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
