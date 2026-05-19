import { loadViewSearchParams } from "~/routes/viewParams"
import { AnalysisManager } from "~/server/AnalysisManager"
import { invariant, isBlob } from "~/shared/util"
import type { Route } from "../+types/root"

export async function loader({ request }: Route.LoaderArgs) {
  const viewParams = loadViewSearchParams(request, {
    strict: true
  })
  const { path: repositoryPath, branch, start, end } = viewParams

  const { objectPath } = viewParams

  invariant(repositoryPath, "repositoryPath is required")
  invariant(branch, "branch is required")
  invariant(start !== null, "start is required")
  invariant(end !== null, "end is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: repositoryPath, branch })

  const selectedObjectPath = objectPath ?? instance.repositoryName

  using _timeInterval = await instance.withTimeInterval(start, end)

  const objIsBlob = isBlob(await instance.db.getObjectFromPath(selectedObjectPath))

  const topContributorData = await instance.db.getContributorDistributionForPath({
    objectPath: selectedObjectPath,
    startSecs: start,
    endSecs: end
  })

  return {
    path: selectedObjectPath,
    existsInRange: await instance.db.pathExistsInSelectedRange(selectedObjectPath, objIsBlob),
    topContributor: topContributorData,
    multiTopContributors:
      topContributorData.length > 1 && topContributorData[0].contribs === topContributorData[1].contribs,
    amountOfCommits: await instance.db.getCommitCountForPath({
      objectPath: selectedObjectPath,
      startSecs: start,
      endSecs: end,
      contributors: []
    }),
    contributors: await instance.db.getUniqueContributorsForPath(selectedObjectPath),
    contributions: await instance.db.getContributionsForPath({
      objectPath: selectedObjectPath,
      startSecs: start,
      endSecs: end
    }),
    lastChanged: await instance.db.getLastChangedForPath({
      objectPath: selectedObjectPath,
      startSecs: start,
      endSecs: end
    })
  }
}
