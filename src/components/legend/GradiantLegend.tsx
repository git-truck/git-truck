import { useClickedObject } from "~/state/stores/clicked-object"
import { LegendBarIndicator } from "~/components/util"
import { numToFriendlyString } from "~/shared/util"
import type { GitObject } from "~/shared/model"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { useData } from "~/contexts/DataContext"
import type { MetricType } from "~/metrics/metrics"

export type GradLegendData = {
  /**
   * @deprecated
   * @todo remove deprecated fields and add support for multi stop gradients
   */
  minValue: number
  /**
   * @deprecated
   * @todo remove deprecated fields and add support for multi stop gradients
   */
  maxValue: number
  minValueAltFormat: string | undefined
  maxValueAltFormat: string | undefined
  minColor: `#${string}`
  maxColor: `#${string}`
}

export function GradientLegend({ hoveredObject }: { hoveredObject: GitObject | null }) {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const data = useData()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")
  const { minValue, maxValue, minColor, maxColor } = metricCache.legend as GradLegendData

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
        className="relative h-4 rounded-sm"
        style={{
          backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
        }}
      >
        <LegendBarIndicator offset={(clickedOffset ?? 0) * 100} visible={clickedOffset !== null} />
        <LegendBarIndicator offset={(hoveredOffset ?? 0) * 100} visible={hoveredOffset !== null} />
      </div>
      <div className="flex justify-between">
        <span className="font-bold" title={minValue.toLocaleString()}>
          {numToFriendlyString(minValue)}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 font-bold" title={midValue.toLocaleString()}>
          {numToFriendlyString(midValue)}
        </span>
        <span className="font-bold" title={maxValue.toLocaleString()}>
          {numToFriendlyString(maxValue)}
        </span>
      </div>
    </div>
  )
}
