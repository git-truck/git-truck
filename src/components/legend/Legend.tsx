import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"
import type { GitObject } from "~/analyzer/model"
import { useDeferredValue } from "react"
import { AuthorOptions } from "../AuthorOptions"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({
  hoveredObject,
  className = "",
  showUnionAuthorsModal
}: {
  hoveredObject: GitObject | null
  showUnionAuthorsModal: () => void
  className?: string
}) {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const deferredHoveredObject = useDeferredValue(hoveredObject)

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

  return (
    <div className={`card flex-shrink-0 overflow-hidden ${className}`}>
      <h2 className="card__title">Legend: {Metric[metricType]}</h2>
      <p className="card-p">{getMetricDescription(metricType)}</p>
      {metricType === "TOP_CONTRIBUTOR" ? <AuthorOptions showUnionAuthorsModal={showUnionAuthorsModal} /> : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  hoveredObject: GitObject | null
  metricCache: MetricCache
}
