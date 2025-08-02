import { useClickedObject } from "~/contexts/ClickedContext"
import type { MetricLegendProps } from "./Legend"
import { LegendBarIndicator } from "../util"
import { useMemo } from "react"
import { getLightness, numToFriendlyString } from "~/shared/util"
import { noEntryColor } from "~/const"

export type GradLegendData = {
  minValue: number
  maxValue: number
  minValueAltFormat: string | undefined
  maxValueAltFormat: string | undefined
  minColor: `#${string}`
  maxColor: `#${string}`
}

export function GradientLegend({ hoveredObject, metricCache }: MetricLegendProps) {
  const { minValue, maxValue, minValueAltFormat, maxValueAltFormat, minColor, maxColor } =
    metricCache.legend as GradLegendData

  const { clickedObject } = useClickedObject()

  const path = clickedObject?.path ?? hoveredObject?.path ?? null
  const color = path ? metricCache.colormap.get(path) : null
  let blobLightness = color ? getLightness(color) : -1
  if (color === noEntryColor) blobLightness = -1

  const offset = useMemo(() => {
    const min = getLightness(minColor)
    const max = getLightness(maxColor)
    const diff = max - min
    if (diff === 0) return 1
    return (blobLightness - min) / diff
  }, [blobLightness, maxColor, minColor])

  const visible = path !== null

  const midValue = Math.round((maxValue - minValue) / 2)
  return (
    <div>
      <div
        className="relative h-4 rounded-sm"
        style={{
          backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
        }}
      >
        <LegendBarIndicator offset={offset * 100} visible={visible} />
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
