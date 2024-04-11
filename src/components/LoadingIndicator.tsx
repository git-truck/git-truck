import { Navigation, useFetcher } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useMemo } from "react"
import type { AnalyzationStatus } from "~/analyzer/ServerInstance.server"
import anitruck from "~/assets/truck.gif"

export type ProgressData = {
  progress: number
  analyzationStatus: AnalyzationStatus
}

export function LoadingIndicator(props: {transitionData: Navigation}) {
  const fetcher = useFetcher<ProgressData>()
  useEffect(() => {
    if (fetcher.state === "idle") {
      const [, repo, branch] = props.transitionData.location?.pathname.split("/") ?? ["", "", ""]
      fetcher.load(`/progress?repo=${repo}&branch=${branch}`)
    }
  }, [fetcher, fetcher.state])

  const progressText = useMemo(() => {
    if (!fetcher.data) return "Starting analysis"
    const { progress, analyzationStatus } = fetcher.data
    if (!analyzationStatus || analyzationStatus === "Starting") return "Starting analysis"
    if (analyzationStatus === "GeneratingChart") return "Generating chart"
    return "Analyzing commits: " + progress + "% done"
  }, [fetcher.data])

  return (
    <div className={clsx("grid h-full w-full place-items-center", "")}>
      <div className="flex animate-hide-initially flex-col px-2 py-2 opacity-0">
        <p className="text-center text-3xl font-bold opacity-70">{progressText}</p>
        <img src={anitruck} alt={"🚛"} className="w-full min-w-0 max-w-sm self-center" />
      </div>
    </div>
  )
}
