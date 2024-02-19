import { useFetcher } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useMemo } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import anitruck from "~/assets/truck.gif"

type ProgressData = {
  progress: number
  totalCommitCount: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator({ className = "" }: { loadingText?: string; className?: string }) {
  const fetcher = useFetcher<ProgressData>()

  useEffect(() => {
    if (fetcher.state === "idle") fetcher.load(`/progress`)
  }, [fetcher.state])

  const progressText = useMemo(() => {
    if (!fetcher.data) return "Starting analyzation"
    const { progress, totalCommitCount, analyzationStatus } = fetcher.data
    if (!analyzationStatus || analyzationStatus === "Starting") return "Starting analyzation"
    if (analyzationStatus === "GeneratingChart") return "Generating chart"
    const percentage = progress && totalCommitCount ? Math.round((progress / totalCommitCount) * 100) : 0
    return "Analyzing commits: " + percentage + "% done"
  }, [fetcher.data])

  return (
    <div
      className={clsx("grid h-full w-full place-items-center", className)}
      style={{
        backgroundColor: "var(--global-bg-color)"
      }}
    >
      <div className="flex animate-hide-initially flex-col px-2 py-2 opacity-0">
        <p className="text-center text-3xl font-bold opacity-70">{progressText}</p>
        <img src={anitruck} alt={"🚛"} className="w-full min-w-0 max-w-sm self-center" />
      </div>
    </div>
  )
}
