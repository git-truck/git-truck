import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { ExpandUp } from "./Toggle"
import { useState } from "react"
import { GradientLegendDiv, LegendGradient, LegendLabel } from "./util"
import { GradLegendData, isGradientMetric, MetricCache, MetricType, PointLegendData, getMetricDescription, Metric } from "../metrics"
import { useMetricCaches } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { Box } from "./util"
import { useClickedObject } from "~/contexts/ClickedContext"
import styled from "styled-components"
import { estimatedLetterWidth } from "~/const"

const legendCutoff = 3

function getLightness(hsl: string) : number {
  const regex = /%,((?:\d|\.)+?)%\)/gm
  const ent = regex.exec(hsl)?.entries()
  ent?.next()
  const res = parseFloat(ent?.next().value[1] ?? "-1")
  return res
}

const GradArrow = styled.i<{ visible: boolean, position: number }>`
  display: ${({visible}) => (visible)? "initital" : "none"};
  transition: 500ms;
  position: relative;
  bottom: 11px;
  left: calc(${({position}) => position*100}% - ${estimatedLetterWidth}px);
  filter: drop-shadow(0px -2px 0.5px #fff);
`

const StyledBox = styled(Box)`
  position: sticky;
  bottom: 0;
`

const StyledH2 = styled.h2`
  font-size: 0.9em;
`

const StyledP = styled.p`
  font-size: 0.9em;
  opacity: 0.7;
  margin: 0.5em 0 1.5em 0;
`

export function Legend() {
  const { metricType } = useOptions()
  const metricCaches = useMetricCaches()

  if (metricCaches.get(metricType)?.legend === undefined) return null

  return (
    <StyledBox>
      <StyledH2>
        {
          Metric[metricType]
        }
      </StyledH2>
      <StyledP>
        {getMetricDescription(metricType)}
      </StyledP>
      {
        (isGradientMetric(metricType))
        ? <GradientMetricLegend metricType={metricType} metricCaches={metricCaches}></GradientMetricLegend>
        : <PointMetricLegend metricType={metricType} metricCaches={metricCaches}></PointMetricLegend>
      }
    </StyledBox>
  )
}

interface MetricLegendProps {
  metricType: MetricType
  metricCaches: Map<"FILE_EXTENSION" | "MOST_COMMITS" | "LAST_CHANGED" | "SINGLE_AUTHOR" | "TOP_CONTRIBUTOR", MetricCache>
}

export function GradientMetricLegend({ metricType, metricCaches }: MetricLegendProps) {
  const [minValue, maxValue, minValueAltFormat, maxValueAltFormat, minColor, maxColor] = metricCaches.get(metricType)
      ?.legend as GradLegendData

  const { clickedObject } = useClickedObject()

  const blobLightness = getLightness(metricCaches.get(metricType)?.colormap.get(clickedObject?.path ?? "") ?? "")
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
      <GradArrow visible={offset !== -1} position={offset}>{'\u25B2'}</GradArrow>
    </>
  )
}

export function PointMetricLegend({ metricType, metricCaches }: MetricLegendProps) {
  const [collapse, setCollapse] = useState<boolean>(true)

  const items = Array.from(
    metricCaches.get(metricType)?.legend as PointLegendData
  ).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  if (items.length === 0) return null
  if (items.length <= legendCutoff + 1) {
    return (
      <>
        <LegendFragment show={true} items={items} />
      </>
    )
  } else {
    return (
      <>
        <LegendFragment show={true} items={items.slice(0, legendCutoff)} />
        <LegendFragment show={!collapse} items={items.slice(legendCutoff)} />
        <LegendOther
          show={collapse}
          items={items.slice(legendCutoff)}
          toggle={() => setCollapse(!collapse)}
        />
        <ExpandUp
          collapse={collapse}
          toggle={() => setCollapse(!collapse)}
        />
      </>
    )
  }
}
