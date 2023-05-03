import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { mdiAccountMultiple } from "@mdi/js"
import { Icon } from "@mdi/react"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"
import type { HydratedGitObject } from "~/analyzer/model"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({
  hoveredObject,
  showUnionAuthorsModal,
  className = "",
}: {
  hoveredObject: HydratedGitObject | null
  showUnionAuthorsModal: () => void
  className?: string
}) {
  const { metricType, authorshipType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData[authorshipType].get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch (getMetricLegendType(metricType)) {
    case "POINT":
      legend = <PointLegend metricCache={metricCache} hoveredObject={hoveredObject} />
      break
    case "GRADIENT":
      legend = <GradientLegend metricCache={metricCache} hoveredObject={hoveredObject} />
      break
    case "SEGMENTS":
      legend = <SegmentLegend metricCache={metricCache} hoveredObject={hoveredObject} />
      break
  }

  return (
    <div className={`card flex-shrink-0 overflow-hidden ${className}`}>
      <h2 className="card__title">Legend</h2>
      <h3 className="card__subtitle">{Metric[metricType]}</h3>
      <p className="card-p">{getMetricDescription(metricType, authorshipType)}</p>
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <button className="btn" onClick={showUnionAuthorsModal}>
          <Icon path={mdiAccountMultiple} />
          Group authors
        </button>
      ) : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  hoveredObject: HydratedGitObject | null
  metricCache: MetricCache
}
