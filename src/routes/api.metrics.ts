import { loadViewSearchParams } from "~/routes/viewParams"
import { AnalysisManager } from "~/server/AnalysisManager"
import { invariant, isBlob } from "~/shared/util"
import type { Route } from "../+types/root"

export async function loader({ request }: Route.LoaderArgs) {
  const {
    objectPath,
    path: repositoryPath,
    branch
  } = loadViewSearchParams(request, {
    strict: true
  })

  invariant(objectPath, "opbjectPath is required")
  invariant(repositoryPath, "repositoryPath is required")
  invariant(branch, "branch is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: repositoryPath, branch })

  const objIsBlob = isBlob(await instance.db.getObjectFromPath(objectPath))

  const topContributorData = await instance.db.getContributorDistributionForPath(objectPath)

  return {
    path: objectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, objIsBlob),
    topContributor: topContributorData,
    multiTopContributors:
      topContributorData.length > 1 && topContributorData[0].contribs === topContributorData[1].contribs,
    amountOfCommits: await instance.db.getCommitCountForPath(objectPath),
    contributors: await instance.db.getUniqueContributorsForPath(objectPath),
    contributions: await instance.db.getContributionsForPath(objectPath),
    lastChanged: await instance.db.getLastChangedForPath(objectPath)
  }
}
