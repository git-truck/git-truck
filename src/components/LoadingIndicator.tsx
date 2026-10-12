import { href } from "react-router"
import clsx from "clsx"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import type { AnalysisStatus } from "~/server/Analysis"
import drivingTruck from "~/assets/drivingTruck_48x.gif"
import loadingTruck from "~/assets/loadingTruck_48x.gif"
import unloadingTruck from "~/assets/unloadingTruck_48x.gif"
import crashedTruck from "~/assets/crashedTruck_48x.gif"
import { cn } from "~/styling"
import { useQueryState } from "nuqs"
import { progressSerializer } from "~/routes/api.progress"

export type ProgressData = {
  progress: number
  analysisStatus: AnalysisStatus
  progressRevision?: number
}

const PROGRESS_POLL_INTERVAL_MS = 1000

export function pollAnalysisProgress(path: string, branch: string, onProgress: (data: ProgressData) => void) {
  const controller = new AbortController()
  let timeoutId: number | undefined
  let lastSeenRevision = -1

  const pollProgress = async () => {
    let shouldContinue = true
    try {
      const response = await fetch(href("/api/progress") + progressSerializer({ path, branch, lastSeenRevision }), {
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`Progress request failed: ${response.status}`)

      if (response.status !== 204) {
        const nextData: ProgressData | null = await response.json()
        if (controller.signal.aborted) return

        if (nextData) {
          onProgress(nextData)
          lastSeenRevision = nextData.progressRevision ?? -1
          shouldContinue = nextData.analysisStatus !== "Aborted" && nextData.analysisStatus !== "CommitHistoryProcessed"
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) console.warn("Could not fetch analysis progress", error)
    } finally {
      if (!controller.signal.aborted && shouldContinue) {
        timeoutId = window.setTimeout(() => void pollProgress(), PROGRESS_POLL_INTERVAL_MS)
      }
    }
  }

  void pollProgress()

  return () => {
    controller.abort()
    window.clearTimeout(timeoutId)
  }
}

export function LoadingIndicator({
  className = "",
  showProgress = false,
  fetchProgress = true,
  loadingText: LoadingText
}: {
  loadingText?: React.FC<{ status: AnalysisStatus }>
  showProgress?: boolean
  fetchProgress?: boolean
  className?: string
}) {
  const [path] = useQueryState("path")
  const [branch] = useQueryState("branch")

  const [data, setData] = useState<ProgressData>()

  useEffect(() => {
    if (!showProgress || !fetchProgress || !path || !branch) return

    setData(undefined)
    return pollAnalysisProgress(path, branch, setData)
  }, [branch, fetchProgress, path, showProgress])

  const [progressText, progress, gif] = useMemo<[string, number, string]>(() => {
    if (!data) return ["Loading truck...", 0, loadingTruck]
    const { progress, analysisStatus: analyzationStatus } = data

    switch (analyzationStatus) {
      case "Initialized":
        return ["Loading truck...", 0, loadingTruck]
      case "CommitHistoryProcessed":
        return ["Unloading truck...", 0, unloadingTruck]
      case "Aborted":
        return ["Aborted", 0, crashedTruck]
      case "ProcessingCommitHistory":
        return progress < 100
          ? ["Driving to destination...", progress, drivingTruck]
          : ["Unloading truck...", progress, unloadingTruck]
    }
  }, [data])

  return (
    <div className={clsx("grid h-full w-full place-items-center px-4", className)}>
      <div className="flex w-full max-w-[clamp(16rem,80vw,36rem)] flex-col gap-4 px-2 py-2">
        <img src={showProgress ? gif : drivingTruck} alt="🚛" className="pixelated aspect-square w-full" />
        {showProgress ? <div className="text-center text-3xl font-bold">{progressText}</div> : null}
        {showProgress && data?.analysisStatus !== "Aborted" ? (
          <div
            className={cn("h-6 w-3/4 self-center rounded-2xl bg-gray-300 transition-opacity", {
              "opacity-0": !progress
            })}
          >
            <div
              className={cn(
                "bg-blue-primary h-[calc(100%-4px)] min-w-[calc(var(--spacing)*6-4px)] translate-x-0.5 translate-y-0.5 rounded-2xl transition-[width] duration-1000 ease-in-out"
              )}
              style={{ width: progress ? `calc(${Math.min(progress, 100)}% - 4px)` : "40px" }}
            />
          </div>
        ) : null}
        {LoadingText ? (
          <div className="text-center">
            <LoadingText status={data?.analysisStatus ?? "Initialized"} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
