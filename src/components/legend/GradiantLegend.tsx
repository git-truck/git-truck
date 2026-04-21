import { useClickedObject } from "~/state/stores/clicked-object"
import { LegendBarIndicator } from "~/components/util"
import { formatLargeNumber } from "~/shared/util"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { useData } from "~/contexts/DataContext"
import type { MetricType } from "~/metrics/metrics"
import { Tick } from "~/components/sliderUtils"
import { useHoveredObject } from "~/state/stores/hovered-object"

export type GradLegendData = {
  minValue: number
  maxValue: number
  minValueAltFormat: string | undefined
  maxValueAltFormat: string | undefined
  /**
   * @deprecated
   */
  minColor: `#${string}`
  /**
   * @deprecated
   */
  maxColor: `#${string}`
  gradientColorSteps: Array<`#${string}`>
}

export function GradientLegend() {
  const hoveredObject = useHoveredObject()
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const data = useData()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")
  const { minValue, maxValue, gradientColorSteps } = metricCache.legend as GradLegendData

  const clickedObject = useClickedObject()

  const getMetricValue = (path: string | null, metric: MetricType): number | null => {
    if (!path) return null

    switch (metric) {
      case "MOST_COMMITS":
        return data.databaseInfo.commitCounts[path] ?? null
      case "MOST_CONTRIBUTIONS":
        return data.databaseInfo.contribSumPerFile[path] ?? null
      case "LAST_CHANGED":
        return data.databaseInfo.lastChanged[path] ?? null
      case "FILE_SIZE":
        return data.databaseInfo.fileSizes[path] ?? null
      default:
        return null
    }
  }

  const calculateOffset = (value: number | null, min: number, max: number): number | null => {
    if (value === null || Number.isNaN(value)) return null
    const diff = max - min
    if (diff === 0) return 1
    const offset = (value - min) / diff
    return Math.min(1, Math.max(0, offset))
  }

  const clickedOffset = calculateOffset(getMetricValue(clickedObject?.path ?? null, metricType), minValue, maxValue)
  const hoveredOffset = calculateOffset(getMetricValue(hoveredObject?.path ?? null, metricType), minValue, maxValue)

  const midValue = Math.round(minValue + (maxValue - minValue) / 2)
  return (
    <div>
      <div
        className="relative mt-9 h-4 rounded-sm"
        style={{
          backgroundImage: `linear-gradient(to right, ${gradientColorSteps.join(", ")})`
        }}
      >
        <LegendBarIndicator offset={(clickedOffset ?? 0) * 100} visible={clickedOffset !== null} />
        <LegendBarIndicator offset={(hoveredOffset ?? 0) * 100} visible={hoveredOffset !== null} />
      </div>
      <div className="relative mt-0 mb-2 flex h-5">
        <Tick className="absolute -top-6 left-1" />
        <span className="absolute -top-10 left-1 text-xs" title={minValue.toLocaleString()}>
          {formatLargeNumber(minValue)}
        </span>
        <Tick className="absolute left-1/2 -translate-x-1/2" />
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs" title={midValue.toLocaleString()}>
          {formatLargeNumber(midValue)}
        </span>
        <Tick className="absolute -top-6 right-1" />
        <span className="absolute -top-10 right-1 text-xs" title={maxValue.toLocaleString()}>
          {formatLargeNumber(maxValue)}
        </span>
      </div>
    </div>
  )
}
