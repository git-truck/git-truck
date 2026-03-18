import { invariant } from "~/shared/util"
import { currentRepositoryContext } from "~/routes/view"
import type { Route } from "./+types/view.api.contributor-distribution"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const objectPath = url.searchParams.get("objectPath")
  const { instance } = context.get(currentRepositoryContext)
  invariant(objectPath, "path is required")

  return {
    path: objectPath,
    contributorDistribution: await instance.db.getContributorDistributionForPath(objectPath)
  }
}
