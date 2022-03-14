import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { Toggle } from "./Toggle"
import { useState } from "react"
import { GradientLegendDiv, LegendGradient, LegendLable } from "./util"
import { GradLegendData, isGradientMetric, PointLegendData } from "../metrics"
import { useMetricCaches } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { Box } from "./util"

const legendCutoff = 3

export function Legend() {
  const { metricType } = useOptions()
  const metricCaches = useMetricCaches()
  const [collapse, setCollapse] = useState<boolean>(true)

  if (!isGradientMetric(metricType)) {
    let items = Array.from(
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
    let [minValue, maxValue, minColor, maxColor] = metricCaches.get(metricType)
      ?.legend as GradLegendData

    return (
      <Box>
        <GradientLegendDiv>
          <LegendLable>{minValue}</LegendLable>
          <LegendLable>{maxValue}</LegendLable>
        </GradientLegendDiv>
        <LegendGradient min={minColor} max={maxColor} />
      </Box>
    )
  }
}
