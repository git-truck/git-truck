import { useDeferredValue, useMemo, type ReactNode } from "react"
import type { GitObject } from "~/shared/model"
import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import { colorMetricDescriptions, getMetricLegendType, sizeMetricLegendDescriptions } from "../../metrics/metrics"
import { AuthorOptions } from "../AuthorOptions"
import { GradientLegend } from "./GradiantLegend"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { PercentageSlider } from "../PercentageSlider"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({ hoveredObject }: { hoveredObject: GitObject | null }) {
  const { sizeMetric, metricType } = useOptions()
  const [metricsData] = useMetrics()
  const deferredHoveredObject = useDeferredValue(hoveredObject)

  const metricCache = metricsData.get(metricType) ?? undefined

  const legend = useMemo<ReactNode>(() => {
    if (metricCache === undefined) return null

    switch (getMetricLegendType(metricType)) {
      case "POINT": {
        return <PointLegend />
      }

      case "GRADIENT": {
        return <GradientLegend hoveredObject={deferredHoveredObject} />
      }

      case "SEGMENTS": {
        return <SegmentLegend hoveredObject={deferredHoveredObject} />
      }
    }
  }, [metricCache, deferredHoveredObject, metricType])

  if (legend === null) return null

  return (
    <>
      <h3 className="card__subtitle">Size legend</h3>
      <p className="mb-2 text-sm">{sizeMetricLegendDescriptions[sizeMetric]}</p>
      <h3 className="card__subtitle">Color legend</h3>
      <p className="mb-4 text-sm">{colorMetricDescriptions[metricType]}</p>
      {metricType === "TOP_CONTRIBUTOR" ? <PercentageSlider className="my-4" /> : null}
      {legend}
      {metricType === "TOP_CONTRIBUTOR" ? <AuthorOptions /> : null}
    </>
  )
}
