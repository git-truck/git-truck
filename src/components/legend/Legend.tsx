import { useDeferredValue, useMemo, type ReactNode } from "react"
import type { GitObject } from "~/shared/model"
import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { AuthorOptions } from "../AuthorOptions"
import { GradientLegend } from "./GradiantLegend"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"

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

  const legend = useMemo<ReactNode>(() => {
    if (metricCache === undefined) return null

    switch (getMetricLegendType(metricType)) {
      case "POINT": {
        return <PointLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      }

      case "GRADIENT": {
        return <GradientLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      }

      case "SEGMENTS": {
        return <SegmentLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      }
    }
  }, [metricCache, deferredHoveredObject, metricType])

  if (legend === null) return null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div>
        <h2 className="card__title">Legend: {Metric[metricType]}</h2>
        <p className="card-p mb-2">{getMetricDescription(metricType)}</p>
        {legend}
      </div>
      {metricType === "TOP_CONTRIBUTOR" ? <AuthorOptions showUnionAuthorsModal={showUnionAuthorsModal} /> : null}
    </div>
  )
}

export interface MetricLegendProps {
  hoveredObject: GitObject | null
  metricCache: MetricCache
}
