import { estimatedLetterWidth } from "~/const"
import { useClickedObject } from "~/contexts/ClickedContext"
import type { MetricLegendProps } from "./Legend"

export type GradLegendData = [
  minValue: string,
  maxValue: string,
  minValueAltFormat: string | undefined,
  maxValueAltFormat: string | undefined,
  minColor: string,
  maxColor: string
]

export function GradientLegend({ metricCache }: MetricLegendProps) {
  const [minValue, maxValue, minValueAltFormat, maxValueAltFormat, minColor, maxColor] =
    metricCache.legend as GradLegendData

  const { clickedObject } = useClickedObject()

  const blobLightness = getLightness(metricCache.colormap.get(clickedObject?.path ?? "") ?? "")
  let offset = -1
  if (blobLightness !== -1) {
    const min = getLightness(minColor)
    const max = getLightness(maxColor)
    offset = (blobLightness - min) / (max - min)
  }

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
        className="h-4 w-full rounded-full"
        style={{
          backgroundImage: `linear-gradient(to right, ${minColor}, ${maxColor})`,
        }}
      >
        {offset !== -1 ? (
          <i
            className="relative bottom-3 w-min transition-all"
            style={{
              left: `calc(${offset * 100}% - ${estimatedLetterWidth}px)`,
            }}
          >
            {"\u25B2"}
          </i>
        ) : null}
      </div>
    </>
  )
}

function getLightness(hsl: string): number {
  const regex = /%,((?:\d|\.)+?)%\)/gm
  const ent = regex.exec(hsl)?.entries()
  ent?.next()
  const res = parseFloat(ent?.next().value[1] ?? "-1")
  return res
}
