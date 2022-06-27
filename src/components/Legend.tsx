import { useState } from "react"
import styled from "styled-components"
import { Spacer } from "~/components/Spacer"
import { estimatedLetterWidth } from "~/const"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import {
  getMetricDescription,
  getMetricLegendType,
  GradLegendData,
  SegmentLegendData,
  Metric,
  MetricCache,
  PointLegendData,
} from "../metrics"
import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { ExpandUp } from "./Toggle"
import { Box, BoxP, BoxSubTitle, GradientLegendDiv, LegendGradient, LegendLabel, Button } from "./util"
import { PeopleAlt } from "@styled-icons/material"

const legendCutoff = 3

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

const SegmentArrow = styled.i<{ visible: boolean; position: number; height: number }>`
display: ${({ visible }) => (visible ? "initital" : "none")};
transition: 500ms;
position: relative;
bottom: ${({height}) => `${height}px`};
left: calc(${({ position }) => position}% - ${estimatedLetterWidth}px);
filter: drop-shadow(0px -2px 0px #fff);
`

const StyledBox = styled(Box)`
  position: sticky;
  bottom: 0;
`

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend(props: { showUnionAuthorsModal: () => void }) {
  const { metricType, authorshipType } = useOptions()
  const [metricsData, _] = useMetrics()

  const metricCache = metricsData[authorshipType].get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch(getMetricLegendType(metricType)) {
    case "POINT":
      legend = <PointMetricLegend metricCache={metricCache}></PointMetricLegend>
      break
    case "GRADIENT":
      legend = <GradientMetricLegend metricCache={metricCache}></GradientMetricLegend>
      break
    case "SEGMENTS":
      legend = <SegmentMetricLegend metricCache={metricCache}></SegmentMetricLegend>
      break
  }
  
  return (
    <StyledBox>
      <BoxSubTitle>{Metric[metricType]}</BoxSubTitle>
      <Spacer />
      <BoxP>{getMetricDescription(metricType, authorshipType)}</BoxP>
      <Spacer lg />
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <>
          <Button onClick={props.showUnionAuthorsModal}>
            <PeopleAlt display="inline-block" height="1rem" />
            Merge duplicate users
          </Button>
          <Spacer lg />
        </>
      ) : null}
      {legend}
    </StyledBox>
  )
}

interface MetricLegendProps {
  metricCache: MetricCache
}

export function SegmentMetricLegend({ metricCache}: MetricLegendProps) {
  const [steps, textGenerator, colorGenerator, offsetStepCalc] = metricCache.legend as SegmentLegendData
  const width = 100 / steps

  let arrowVisible = false
  let arrowOffset = 0
  const { clickedObject } = useClickedObject()
  
  if (clickedObject?.type == "blob") {
    arrowVisible = true
    arrowOffset = (width / 2) + width * (offsetStepCalc(clickedObject))
  }

  return (
    <>
      <div style={{display: `flex`, flexDirection: `row`}}>
        {[...Array(steps).fill(1)].map((_,i) => {
          return (steps > 5) 
            ? <MetricSegment key={`legend-${i}`} width={width} color={colorGenerator(i)} text={textGenerator(i)} top={ i % 2 === 0 }></MetricSegment>
            : <TopMetricSegment key={`legend-${i}`} width={width} color={colorGenerator(i)} text={textGenerator(i)}></TopMetricSegment>
        })}
      </div>
      <SegmentArrow visible={arrowVisible} position={arrowOffset} height={(steps > 5 ? 50 : 10)}>
        {"\u25B2"}
      </SegmentArrow>
    </>
  )
}

interface SegmentMetricProps {
  width: number
  color: string
  text: string
  top: boolean
}

export function MetricSegment({width, color, text, top} : SegmentMetricProps) {
  if (top) return (
    <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
      <div style={{textAlign: 'left', height: '20px', marginBottom: '-6px'}}>{text}</div>
      <div style={{textAlign: 'left', height: '20px', marginBottom: '-2px'}}>{'/'}</div>
      <div style={{backgroundColor: color, height: '20px'}}></div>
      <div style={{textAlign: 'left', height: '40px'}}></div>
    </div>
  )
  else return (
    <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
      <div style={{textAlign: 'left', height: '32px'}}></div>
      <div style={{backgroundColor: color, height: '20px'}}></div>
      <div style={{textAlign: 'left', height: '20px', marginTop: '-7px'}}>{'\\'}</div>
      <div style={{textAlign: 'left', height: '20px', marginTop: '-4px'}}>{text}</div>
    </div>
  )
}

interface TopSegmentMetricProps {
  width: number
  color: string
  text: string
}

export function TopMetricSegment({width, color, text} : TopSegmentMetricProps) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', width: `${width}%`}}>
      <div style={{textAlign: 'left', height: '20px', marginBottom: '-6px'}}>{text}</div>
      <div style={{textAlign: 'left', height: '20px', marginBottom: '-2px'}}>{'/'}</div>
      <div style={{backgroundColor: color, height: '20px'}}></div>
    </div>
  )
}

export function GradientMetricLegend({ metricCache }: MetricLegendProps) {
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

export function PointMetricLegend({ metricCache }: MetricLegendProps) {
  const [collapse, setCollapse] = useState<boolean>(true)

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  if (items.length === 0) return null
  if (items.length <= legendCutoff + 1) {
    return <LegendFragment show={true} items={items} />
  } else {
    return (
      <>
        <LegendFragment show={true} items={items.slice(0, legendCutoff)} />
        <LegendFragment show={!collapse} items={items.slice(legendCutoff)} />
        <LegendOther show={collapse} items={items.slice(legendCutoff)} toggle={() => setCollapse(!collapse)} />
        <ExpandUp collapse={collapse} toggle={() => setCollapse(!collapse)} />
      </>
    )
  }
}
