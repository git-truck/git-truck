import { useFetcher, useLocation } from "react-router"
import clsx from "clsx"
import { useEffect, useMemo, type ReactNode } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import truck from "~/assets/truck.png"
import anitruck from "~/assets/truck.gif"
import { useCreateLink } from "~/hooks"
import { cn } from "~/styling"

export type ProgressData = {
  progress: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator({
  className = "",
  showProgress = false,
  fetchProgress = true,
  loadingText
}: {
  loadingText?: ReactNode
  showProgress?: boolean
  fetchProgress?: boolean
  className?: string
}) {
  const location = useLocation()
  const fetcher = useFetcher<ProgressData>()
  const createLink = useCreateLink()
  useEffect(() => {
    if (fetcher.state === "idle" && showProgress && fetchProgress) {
      fetcher.load(createLink({ segments: ["view", "progress"] }).url)
    }
  }, [createLink, fetchProgress, fetcher, fetcher.state, location.pathname, showProgress])

  const [progressText, progress] = useMemo<[string, number]>(() => {
    if (!fetcher.data) return ["Loading truck...", 0]
    const { progress, analyzationStatus } = fetcher.data
    switch (analyzationStatus) {
      case "Starting":
        return ["Loading truck...", 0]
      case "GeneratingChart":
        return ["Unloading truck...", 100]
      default:
        return [progress < 100 ? "Driving to destination..." : "Parking truck...", progress]
    }
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center px-4", className)}>
      <div className="flex w-full max-w-[clamp(16rem,80vw,36rem)] flex-col gap-4 px-2 py-2">
        <img
          src={!showProgress || (progress > 0 && progress < 100) ? anitruck : truck}
          alt="🚛"
          className="pixelated aspect-square w-full"
        />
        {showProgress ? <div className="text-center text-3xl font-bold">{progressText}</div> : null}
        {showProgress ? (
          <div className="h-6 w-3/4 self-center rounded-2xl bg-gray-300">
            <div
              className={cn(
                "bg-blue-primary h-[calc(100%-4px)] min-w-[calc(var(--spacing)*6-4px)] translate-x-0.5 translate-y-0.5 rounded-2xl transition-[width] ease-in-out",
                {
                  "animate-skeet": !progress
                }
              )}
              style={{ width: progress ? `calc(${Math.min(progress, 100)}% - 4px)` : "40px" }}
            />
          </div>
        ) : null}
        {loadingText ? <div className="text-center font-bold">{loadingText}</div> : null}
      </div>
    </div>
  )
}
