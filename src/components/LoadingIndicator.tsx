import { href, useFetcher } from "react-router"
import clsx from "clsx"
import type React from "react"
import { useEffect, useMemo } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import truck from "~/assets/truck.png"
import anitruck from "~/assets/truck.gif"
import { cn } from "~/styling"
import { viewSerializer } from "~/routes/view"
import { useQueryState } from "nuqs"

export type ProgressData = {
  progress: number
  analyzationStatus: AnalyzationStatus
  progressRevision?: number
}

const PROGRESS_POLL_INTERVAL_MS = 1000

export function LoadingIndicator({
  className = "",
  showProgress = false,
  fetchProgress = true,
  loadingText: LoadingText
}: {
  loadingText?: React.FC<{ status: AnalyzationStatus }>
  showProgress?: boolean
  fetchProgress?: boolean
  className?: string
}) {
  const [path] = useQueryState("path")
  const [branch] = useQueryState("branch")

  const { load, data, state } = useFetcher<ProgressData>()

  useEffect(() => {
    if (
      !showProgress ||
      !fetchProgress ||
      !path ||
      !branch ||
      state !== "idle" ||
      data?.analyzationStatus === "Aborted" ||
      data?.analyzationStatus === "GeneratingChart"
    )
      return

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(viewSerializer({ path, branch }).replace(/^\?/, ""))
      params.set("lastSeenRevision", String(data?.progressRevision ?? -1))
      load(`${href("/view/progress")}?${params.toString()}`)
    }, PROGRESS_POLL_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [branch, fetchProgress, state, path, showProgress, data?.progressRevision, load, data?.analyzationStatus])

  const [progressText, progress] = useMemo<[string, number]>(() => {
    if (!data) return ["Loading truck...", 0]
    const { progress, analyzationStatus } = data

    switch (analyzationStatus) {
      case "Starting":
        return ["Loading truck...", 0]
      case "GeneratingChart":
        return ["Unloading truck...", 0]
      case "Aborted":
        return ["Aborted", 0]
      case "Hydrating":
        return [progress < 100 ? "Driving to destination..." : "Parking truck...", progress]
    }
  }, [data])

  return (
    <div className={clsx("grid h-full w-full place-items-center px-4", className)}>
      <div className="flex w-full max-w-[clamp(16rem,80vw,36rem)] flex-col gap-4 px-2 py-2">
        <img
          src={!showProgress || (progress > 0 && progress < 100) ? anitruck : truck}
          alt="🚛"
          className="pixelated aspect-square w-full"
        />
        {showProgress ? <div className="text-center text-3xl font-bold">{progressText}</div> : null}
        {showProgress && data?.analyzationStatus !== "Aborted" ? (
          <div className="h-6 w-3/4 self-center rounded-2xl bg-gray-300">
            <div
              className={cn(
                "bg-blue-primary h-[calc(100%-4px)] min-w-[calc(var(--spacing)*6-4px)] translate-x-0.5 translate-y-0.5 rounded-2xl transition-[width] duration-1000 ease-in-out",
                {
                  "animate-skeet": !progress
                }
              )}
              style={{ width: progress ? `calc(${Math.min(progress, 100)}% - 4px)` : "40px" }}
            />
          </div>
        ) : null}
        {LoadingText ? (
          <div className="text-center">
            <LoadingText status={data?.analyzationStatus ?? "Starting"} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
