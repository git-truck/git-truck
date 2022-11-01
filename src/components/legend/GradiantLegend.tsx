import styled from "styled-components"
import { estimatedLetterWidth } from "~/const"
import { useClickedObject } from "~/contexts/ClickedContext"
import { GradientLegendDiv, LegendGradient, LegendLabel } from "../util"
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
        <LegendLabel title={minValueAltFormat}>{minValue}</LegendLabel>
        <LegendLabel title={maxValueAltFormat}>{maxValue}</LegendLabel>
      </GradientLegendDiv>
      <LegendGradient min={minColor} max={maxColor} />
      <GradArrow visible={offset !== -1} position={offset}>
        {"\u25B2"}
      </GradArrow>
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

const GradArrow = styled.i<{ visible: boolean; position: number }>`
  display: ${({ visible }) => (visible ? "initital" : "none")};
  transition: 500ms;
  position: relative;
  bottom: 11px;
  left: calc(${({ position }) => position * 100}% - ${estimatedLetterWidth}px);
  filter: drop-shadow(0px -2px 0px #fff);
`
