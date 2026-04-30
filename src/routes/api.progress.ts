import { invariant, sleep } from "~/shared/util"
import type { ProgressData } from "~/components/LoadingIndicator"
import type { Route } from "./+types/api.progress"
import { loadViewSearchParams } from "~/routes/view"
import { AnalysisManager } from "~/server/AnalysisManager"
import { parseAsInteger } from "nuqs"
import { createLoader } from "nuqs/server"

const POLLING_RATE = 1000
const LONG_POLL_TIMEOUT = 30000

const progressSearchParamsConfig = {
  lastSeenRevision: parseAsInteger.withDefault(-1)
}

const loadProgressSearchParams = createLoader(progressSearchParamsConfig)

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path: repositoryPath, branch } = loadViewSearchParams(request)
  invariant(repositoryPath, "path is required")
  invariant(branch, "branch is required")

  const { lastSeenRevision } = loadProgressSearchParams(request)

  const instanceIsAborted = AnalysisManager.getInstanceIsAborted({ repositoryPath, branch })
  if (instanceIsAborted) {
    return {
      progress: 0,
      analysisStatus: "Aborted" as const,
      progressRevision: -1
    } satisfies ProgressData
  }

  const progressData = AnalysisManager.getInstanceProgress({ repositoryPath, branch })
  if (!progressData) {
    return
  }

  // If we already have a newer revision, return immediately
  if (progressData.progressRevision > lastSeenRevision) {
    return {
      progress: progressData.progressPercentage,
      analysisStatus: progressData.status,
      progressRevision: progressData.progressRevision
    } satisfies ProgressData
  }

  // Otherwise, long-poll until revision changes or timeout
  const startTime = Date.now()
  while (Date.now() - startTime < LONG_POLL_TIMEOUT && !request.signal.aborted) {
    try {
      await sleep(POLLING_RATE, { signal: request.signal })
    } catch {
      return
    }
    if (request.signal.aborted) {
      return
    }

    const updatedProgress = AnalysisManager.getInstanceProgress({ repositoryPath, branch })
    if (!updatedProgress) {
      return
    }
    if (updatedProgress.progressRevision > lastSeenRevision) {
      return {
        progress: updatedProgress.progressPercentage,
        analysisStatus: updatedProgress.status,
        progressRevision: updatedProgress.progressRevision
      } satisfies ProgressData
    }
  }

  // Timeout reached, return current state
  const finalProgress = AnalysisManager.getInstanceProgress({ repositoryPath, branch })

  if (!finalProgress) {
    return
  }

  return {
    progress: finalProgress.progressPercentage,
    analysisStatus: finalProgress.status,
    progressRevision: finalProgress.progressRevision
  } satisfies ProgressData
}
