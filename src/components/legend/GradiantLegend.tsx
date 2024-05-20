import { useClickedObject } from "~/contexts/ClickedContext"
import type { MetricLegendProps } from "./Legend"
import { LegendBarIndicator } from "../util"
import { useMemo } from "react"
import { getLightness } from "~/util"
import { noEntryColor } from "~/const"

export type GradLegendData = [
  minValue: string,
  maxValue: string,
  minValueAltFormat: string | undefined,
  maxValueAltFormat: string | undefined,
  minColor: `#${string}`,
  maxColor: `#${string}`
]

export function GradientLegend({ hoveredObject, metricCache }: MetricLegendProps) {
  const [minValue, maxValue, minValueAltFormat, maxValueAltFormat, minColor, maxColor] =
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

  return (
    <>
      <div className="flex justify-between">
        <span className="font-bold" title={minValueAltFormat}>
          {minValue}
        </span>
        <span className="font-bold" title={maxValueAltFormat}>
          {maxValue}
        </span>
      </div>
      <div
        className="relative h-6 w-full rounded-full"
        style={{
          backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`
        }}
      >
        <LegendBarIndicator offset={offset * 100} visible={visible} />
      </div>
    </>
  )
}
