import { useFetcher } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useMemo } from "react"
import type { AnalyzationStatus } from "~/analyzer/analyze.server"
import anitruck from "~/assets/truck.gif"
import { cn } from "~/styling"

type ProgressData = {
  progress: number
  totalCommitCount: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator({
  className = "",
  hideInitially = true,
  loadingText
}: {
  loadingText?: string
  hideInitially?: boolean
  className?: string
}) {
  const fetcher = useFetcher<ProgressData>()

  useEffect(() => {
    if (fetcher.state === "idle") fetcher.load(`/progress`)
  }, [fetcher, fetcher.state])

  const progressText = useMemo(() => {
    if (!fetcher.data) return "Starting analyzation"
    const { progress, totalCommitCount, analyzationStatus } = fetcher.data
    if (!analyzationStatus || analyzationStatus === "Starting") return "Starting analyzation"
    if (analyzationStatus === "GeneratingChart") return "Generating chart"
    const percentage = progress && totalCommitCount ? Math.round((progress / totalCommitCount) * 100) : 0
    return "Analyzing commits: " + percentage + "% done"
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center", className)}>
      <div className={cn("flex  flex-col px-2 py-2", { "animate-hide-initially opacity-0": hideInitially })}>
        <p className="text-center text-3xl font-bold opacity-70">{loadingText ?? progressText}</p>
        <img src={anitruck} alt={"🚛"} className="w-full min-w-0 max-w-sm self-center" />
      </div>
    </div>
  )
}
