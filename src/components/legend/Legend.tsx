import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "@mdi/react"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"
import type { GitObject } from "~/analyzer/model"
import { useDeferredValue } from "react"
import { getPathFromRepoAndHead } from "~/util"
import { useData } from "~/contexts/DataContext"
import { useNavigation, useSubmit } from "@remix-run/react"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({
  hoveredObject,
  showUnionAuthorsModal,
  className = ""
}: {
  hoveredObject: GitObject | null
  showUnionAuthorsModal: () => void
  className?: string
}) {
  const submit = useSubmit()
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const deferredHoveredObject = useDeferredValue(hoveredObject)
  const { repo } = useData()
  const transitionState = useNavigation()

  const metricCache = metricsData.get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch (getMetricLegendType(metricType)) {
    case "POINT":
      legend = <PointLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
    case "GRADIENT":
      legend = <GradientLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
    case "SEGMENTS":
      legend = <SegmentLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
  }

  function rerollColors() {
    const form = new FormData()
    form.append("rerollColors", "")

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }

  return (
    <div className={`card flex-shrink-0 overflow-hidden ${className}`}>
      <h2 className="card__title">Legend</h2>
      <h3 className="card__subtitle">{Metric[metricType]}</h3>
      <p className="card-p">{getMetricDescription(metricType)}</p>
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <>
          <button className="btn" onClick={showUnionAuthorsModal}>
            <Icon path={mdiAccountMultiple} />
            Group authors
          </button>
          <button className="btn" disabled={transitionState.state !== "idle"} onClick={rerollColors}>
            <Icon path={mdiDiceMultipleOutline} />
            Generate new author colors
          </button>
        </>
      ) : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  hoveredObject: GitObject | null
  metricCache: MetricCache
}
