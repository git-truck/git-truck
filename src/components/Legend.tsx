import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { Toggle } from "./Toggle"
import { useState } from "react"
import { GradientLegendDiv, LegendGradient, LegendLable } from "./util"
import { GradLegendData, isGradientMetric, MetricType, PointLegendData } from "../metrics"
import { useMetricCaches } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { Box } from "./util"
import { InfoTooltip } from "./InfoTooltip"

const legendCutoff = 3

function getMetricTooltipText(metricType: MetricType) {
  switch(metricType) {
    case "FILE_EXTENSION":
      return "A color for each file extension<br/>Sorted by number of files with each extension"
    case "MOST_COMMITS":
      return "The number of commits each file has been involved in"
    case "LAST_CHANGED":
      return "When each file was last changed"
    case "SINGLE_AUTHOR":
      return "Highlighting the files with only one author on the chart<br/>Indicating that the development team relies heavily on that person"
    case "TOP_CONTRIBUTOR":
      return "Coloring each file on the chart corresponding to the most contributing author for that file"
    default:
      throw new Error(`Unknown metric: ${metricType}`)
  }
}

export function Legend() {
  const { metricType } = useOptions()
  const metricCaches = useMetricCaches()
  const [collapse, setCollapse] = useState<boolean>(true)

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
          <InfoTooltip text={getMetricTooltipText(metricType)}/>
          <LegendFragment show={true} items={items} />
        </Box>
      )
    else
      return (
        <Box>
          <InfoTooltip text={getMetricTooltipText(metricType)}/>
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

    return (
      <Box>
        <InfoTooltip text={getMetricTooltipText(metricType)}/>
        <GradientLegendDiv>
          <LegendLable>{minValue}</LegendLable>
          <LegendLable>{maxValue}</LegendLable>
        </GradientLegendDiv>
        <LegendGradient min={minColor} max={maxColor} />
      </Box>
    )
  }
}
