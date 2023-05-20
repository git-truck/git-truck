import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import { CheckboxWithLabel } from "./util"
import { Icon } from "@mdi/react"
import { memo } from "react"
import {
  mdiChartBubble,
  mdiCogOutline,
  mdiChartTree,
  mdiPodiumGold,
  mdiThermometer,
  mdiFileCodeOutline,
  mdiTruckFastOutline,
  mdiUpdate,
  mdiResize,
  mdiSourceCommit,
  mdiAccountGroupOutline,
  mdiDice3Outline,
  mdiScaleBalance,
  mdiAccountAlertOutline,
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/size-metric"
import { SizeMetric } from "~/metrics/size-metric"

function isMetricWithHistoricalOption(metric: MetricType) {
  switch (metric) {
    case "SINGLE_AUTHOR":
    case "TOP_CONTRIBUTOR":
      return true
  }
  return false
}

export const Options = memo(function Options() {
  const {
    metricType,
    chartType,
    sizeMetric,
    transitionsEnabled,
    setTransitionsEnabled,
    labelsVisible,
    setLabelsVisible,
    setMetricType,
    setChartType,
    setSizeMetricType,
  } = useOptions()

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_COMMITS: mdiThermometer,
    SINGLE_AUTHOR: mdiAccountAlertOutline,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    TRUCK_FACTOR: mdiTruckFastOutline,
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    NUMBER_OF_AUTHORS: mdiAccountGroupOutline,
    RANDOM: mdiDice3Outline,
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree,
  }

  return (
    <div className="card">
      <h2 className="card__title">
        Options
        <Icon path={mdiCogOutline} size={1} />
      </h2>
      <EnumSelect
        label={
          <div className="flex justify-between gap-2">
            Visualization
            <Icon path={visualizationIcons[metricType]} size={1} />
          </div>
        }
        enum={Metric}
        defaultValue={metricType}
        onChange={(metric: MetricType) => setMetricType(metric)}
      />
      <EnumSelect
        label={
          <div className="flex justify-between gap-2">
            Size metric
            <Icon path={sizeMetricIcons[sizeMetric]} size={1} />
          </div>
        }
        enum={SizeMetric}
        defaultValue={sizeMetric}
        onChange={(sizeMetric: SizeMetricType) => setSizeMetricType(sizeMetric)}
      />
      <EnumSelect
        label={
          <div className="flex justify-between gap-2">
            Chart layout
            <Icon path={chartTypeIcons[chartType]} size={1} />
          </div>
        }
        enum={Chart}
        defaultValue={chartType}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      {/* <EnumSelect
        label="Authorship data"
        enum={Authorship}
        onChange={(baseData: AuthorshipType) => setAuthorshipType(baseData)}
        hidden={!isMetricWithHistoricalOption(metricType)}
      />*/}
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={transitionsEnabled}
        onChange={(e) => setTransitionsEnabled(e.target.checked)}
        title="Disable to improve performance when zooming"
      >
        Transitions
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={labelsVisible}
        onChange={(e) => setLabelsVisible(e.target.checked)}
        title="Disable to improve performance"
      >
        Labels
      </CheckboxWithLabel>
    </div>
  )
})
