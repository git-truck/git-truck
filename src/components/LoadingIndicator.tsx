import { useFetcher, useLocation } from "react-router"
import clsx from "clsx"
import { useEffect, useMemo, type ReactNode } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import anitruck from "~/assets/truck.gif"

export type ProgressData = {
  progress: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator({
  className = "",
  showProgress = false,
  loadingText
}: {
  loadingText?: ReactNode
  showProgress?: boolean
  className?: string
}) {
  const location = useLocation()
  const fetcher = useFetcher<ProgressData>()
  useEffect(() => {
    if (fetcher.state === "idle") {
      const [, repo, branch] = location.pathname.split("/") ?? ["", "", ""]
      fetcher.load(`/progress?repo=${repo}&branch=${branch}`)
    }
  }, [fetcher, fetcher.state, location.pathname])

  const [progressText, progress] = useMemo<[string, number]>(() => {
    if (!fetcher.data) return ["Starting analysis", 0]
    const { progress, analyzationStatus } = fetcher.data
    console.log(analyzationStatus)
    switch (analyzationStatus) {
      case "Starting":
        return ["Starting analysis", 0]
      case "GeneratingChart":
        return ["Generating chart", 100]
      default:
        return ["Analyzing commits", progress]
    }
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center", className)}>
      <div className="flex flex-col gap-6 px-2 py-2">
        {showProgress ? <p className="text-center text-3xl font-bold opacity-70">{progressText}</p> : null}
        {showProgress ? (
          <div className="grid overflow-hidden rounded-2xl bg-gray-300">
            <div
              className="bg-blue-primary h-6 rounded-2xl px-4 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        <img src={anitruck} alt={"🚛"} className="w-full max-w-sm min-w-0 self-center" />
        {loadingText ? <p className="text-center font-bold opacity-70">{loadingText}</p> : null}
      </div>
    </div>
  )
}
