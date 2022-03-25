import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { Toggle } from "./Toggle"
import { useState } from "react"
import { GradientLegendDiv, LegendGradient, LegendLable } from "./util"
import { GradLegendData, isGradientMetric, PointLegendData } from "../metrics"
import { useMetricCaches } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { Box } from "./util"
import { useClickedBlob } from "~/contexts/ClickedContext"
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

const GradArrow = styled.i<{ vis: boolean, pos: number }>`
  display: ${({vis}) => (vis)? "block" : "none"};
  transition: 500ms;
  position: relative;
  bottom: 11px;
  left: calc(${({pos}) => pos*100}% - ${estimatedLetterWidth}px);
`

export function Legend() {
  const { metricType } = useOptions()
  const metricCaches = useMetricCaches()
  const [collapse, setCollapse] = useState<boolean>(true)
  const {clickedBlob} = useClickedBlob()

  if (!isGradientMetric(metricType)) {
    const items = Array.from(
      metricCaches.get(metricType)?.legend as PointLegendData
    ).sort(([, info1], [, info2]) => {
      if (info1.weight < info2.weight) return 1
      if (info1.weight > info2.weight) return -1
      return 0
    })

    if (items.length === 0) return null
    if (items.length <= legendCutoff + 1)
      return (
        <Box>
          <LegendFragment show={true} items={items} />
        </Box>
      )
    else
      return (
        <Box>
          <LegendFragment show={true} items={items.slice(0, legendCutoff)} />
          <LegendFragment show={!collapse} items={items.slice(legendCutoff)} />
          <LegendOther
            show={collapse}
            items={items.slice(legendCutoff)}
            toggle={() => setCollapse(!collapse)}
          />
          <Toggle
            relative={false}
            collapse={collapse}
            toggle={() => setCollapse(!collapse)}
          />
        </Box>
      )
  } else {
    const [minValue, maxValue, minColor, maxColor] = metricCaches.get(metricType)
      ?.legend as GradLegendData

    const blobLightness = getLightness(metricCaches.get(metricType)?.colormap.get(clickedBlob?.path ?? "") ?? "")
    let offset = -1
    if (blobLightness !== -1) {
      const min = getLightness(minColor)
      const max = getLightness(maxColor)
      offset = (blobLightness - min) / (max - min)
    }

    return (
      <Box>
        <GradientLegendDiv>
          <LegendLable>{minValue}</LegendLable>
          <LegendLable>{maxValue}</LegendLable>
        </GradientLegendDiv>
        <LegendGradient min={minColor} max={maxColor} />
        <GradArrow vis={offset !== -1} pos={offset}>{'\u25B2'}</GradArrow>
      </Box>
    )
  }
}
