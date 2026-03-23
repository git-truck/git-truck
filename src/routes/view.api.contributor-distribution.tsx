import { invariant } from "~/shared/util"
import { currentRepositoryContext } from "~/routes/view"
import type { Route } from "./+types/view.api.contributor-distribution"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const objectPath = url.searchParams.get("objectPath")
  const objectType = url.searchParams.get("objectType")
  const { instance } = context.get(currentRepositoryContext)
  invariant(objectPath, "path is required")
  const isBlob = objectType === "blob"

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, isBlob),
    contributorDistribution: await instance.db.getContributorDistributionForPath(objectPath)
  }
}
