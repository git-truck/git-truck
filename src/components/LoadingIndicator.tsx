import { useFetcher, useLocation } from "react-router"
import clsx from "clsx"
import { useEffect, useMemo, type ReactNode } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import anitruck from "~/assets/truck.gif"
import { useCreateLink } from "~/hooks"

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
      // const [, repo, branch] = location.pathname.split("/") ?? ["", "", ""]
      fetcher.load(
        createLink({
          segments: ["view", "progress"]
        }).url
      )
    }
  }, [fetchProgress, fetcher, fetcher.state, location.pathname, showProgress])

  const [progressText, progress] = useMemo<[string, number]>(() => {
    if (!fetcher.data) return ["Starting analysis", 0]
    const { progress, analyzationStatus } = fetcher.data
    switch (analyzationStatus) {
      case "Starting":
        return ["Starting analysis", 0]
      case "GeneratingChart":
        return ["Generating chart", 100]
      default:
        return ["Analyzing commit history", progress]
    }
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center", className)}>
      <div className="flex flex-col gap-6 px-2 py-2">
        {showProgress ? <div className="text-center text-3xl font-bold opacity-70">{progressText}</div> : null}
        {showProgress ? (
          <div className="grid h-6 rounded-2xl bg-gray-300">
            <div
              className="bg-blue-primary h-[calc(100%-4px)] min-w-[calc(var(--spacing)*6-4px)] translate-x-[2px] translate-y-[2px] rounded-2xl transition-[width] ease-in-out"
              style={{ width: `calc(${Math.min(progress, 100)}% - 4px)` }}
            />
          </div>
        ) : null}
        <img src={anitruck} alt={"🚛"} className="w-full max-w-sm min-w-0 self-center" />
        {loadingText ? <p className="text-center font-bold opacity-70">{loadingText}</p> : null}
      </div>
    </div>
  )
}
