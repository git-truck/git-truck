import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { PeopleAlt } from "@styled-icons/material"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({
  showUnionAuthorsModal,
  className = "",
}: {
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
      legend = <PointLegend metricCache={metricCache} />
      break
    case "GRADIENT":
      legend = <GradientLegend metricCache={metricCache} />
      break
    case "SEGMENTS":
      legend = <SegmentLegend metricCache={metricCache} />
      break
  }

  return (
    <div className={`box bottom-0 ${className}`}>
      <h3 className="box__subtitle">{Metric[metricType]}</h3>
      <p className="box-p">{getMetricDescription(metricType, authorshipType)}</p>
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <button className="btn" onClick={showUnionAuthorsModal}>
          <PeopleAlt />
          Group authors
        </button>
      ) : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  metricCache: MetricCache
}
