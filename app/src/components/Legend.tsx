import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { LegendToggle } from "./LegendToggle"
import { useState } from "react"
import {
  GradientLegendDiv,
  LegendGradient,
  LegendLable,
} from "./util"
import { GradLegendData, isGradientMetric, PointLegendData } from "../metrics"
import { useMetricCaches } from "../MetricContext"
import { useOptions } from "../OptionsContext"
import { Box } from "./util"

const cutoff = 3

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
    if (items.length <= cutoff + 1)
      return (
        <Box>
          <LegendFragment show={true} items={items} />
        </Box>
      )
    else
      return (
        <Box>
          <LegendFragment show={true} items={items.slice(0, cutoff)} />
          <LegendFragment show={!collapse} items={items.slice(cutoff)} />
          <LegendOther show={collapse} items={items.slice(cutoff)} />
          <LegendToggle
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
