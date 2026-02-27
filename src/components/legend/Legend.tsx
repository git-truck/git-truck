import { useDeferredValue, useMemo, type ReactNode } from "react"
import type { GitObject } from "~/shared/model"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { colorMetricDescriptions, getMetricLegendType, sizeMetricLegendDescriptions } from "~/metrics/metrics"
import { ShuffleColorsButton } from "~/components/buttons/ShuffleColorsButton"
import { GradientLegend } from "~/components/legend/GradiantLegend"
import { PointLegend } from "~/components/legend/PointLegend"
import { SegmentLegend } from "~/components/legend/SegmentLegend"
import { PercentageSlider } from "~/components/PercentageSlider"
import { GroupAuthorsButton } from "~/components/buttons/GroupAuthorsButton"

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
      {metricType === "TOP_CONTRIBUTOR" ? (
        <div className="mt-2 grid w-full grid-cols-[1fr_1fr] gap-2">
          <GroupAuthorsButton />
          <ShuffleColorsButton />
        </div>
      ) : null}
    </>
  )
}
