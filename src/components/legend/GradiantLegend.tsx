import styled from "styled-components"
import { estimatedLetterWidth } from "~/const"
import { useClickedObject } from "~/contexts/ClickedContext"
import { GradientLegendDiv, LegendGradient } from "../util"
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
      <GradientLegendDiv>
        <span className="font-bold" title={minValueAltFormat}>
          {minValue}
        </span>
        <span className="font-bold" title={maxValueAltFormat}>
          {maxValue}
        </span>
      </GradientLegendDiv>
      <LegendGradient min={minColor} max={maxColor} />
      {offset !== -1 ? (
        <i
          className="relative bottom-3 transition-all"
          style={{
            left: `calc(${offset * 100}% - ${estimatedLetterWidth}px)`,
          }}
        >
          {"\u25B2"}
        </i>
      ) : null}
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
