import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import { CheckboxWithLabel } from "./util"
import { Icon } from "@mdi/react"
import { memo, useState } from "react"
import {
  mdiChartBubble,
  mdiCogOutline,
  mdiChartTree,
  mdiPodiumGold,
  mdiFileCodeOutline,
  mdiUpdate,
  mdiResize,
  mdiSourceCommit,
  mdiAccountGroupOutline,
  mdiDice3Outline,
  mdiScaleBalance,
  mdiAccountAlertOutline,
  mdiTruckFastOutline,
  mdiLink,
  mdiLinkOff,
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/size-metric"
import { SizeMetric } from "~/metrics/size-metric"
import { useLocalStorage } from "react-use"

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

  const [linkMetricAndSizeMetric, setLinkMetricAndSizeMetric] = useLocalStorage<boolean>(
    "LINK_METRIC_AND_SIZE_METRIC",
    true
  )

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_COMMITS: mdiSourceCommit,
    SINGLE_AUTHOR: mdiAccountAlertOutline,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    TRUCK_FACTOR: mdiTruckFastOutline,
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    TRUCK_FACTOR: mdiAccountGroupOutline,
    RANDOM: mdiDice3Outline,
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree,
  }

  const relatedSizeMetric: Partial<Record<MetricType, SizeMetricType>> = {
    FILE_TYPE: "FILE_SIZE",
    TRUCK_FACTOR: "TRUCK_FACTOR",
    TOP_CONTRIBUTOR: "TRUCK_FACTOR",
    MOST_COMMITS: "MOST_COMMITS",
    SINGLE_AUTHOR: "TRUCK_FACTOR",
    LAST_CHANGED: "EQUAL_SIZE",
  }

  return (
    <div className="card">
      <h2 className="card__title">
        Options
        <Icon path={mdiCogOutline} size={1} />
      </h2>
      <EnumSelect
        label={<div className="flex justify-between gap-2">Color</div>}
        enum={Metric}
        defaultValue={metricType}
        onChange={(metric: MetricType) => {
          setMetricType(metric)
          if (!linkMetricAndSizeMetric) {
            return
          }
          const relatedSizeMetricType = relatedSizeMetric[metric]
          if (relatedSizeMetricType) {
            setSizeMetricType(relatedSizeMetricType)
          }
        }}
        iconMap={visualizationIcons}
      />
      <CheckboxWithLabel
        className="gap-1"
        checked={Boolean(linkMetricAndSizeMetric)}
        onChange={(e) => setLinkMetricAndSizeMetric(e.target.checked)}
        checkedIcon={mdiLink}
        uncheckedIcon={mdiLinkOff}
      >
        <span>Link size metric to color metric</span>
      </CheckboxWithLabel>
      <EnumSelect
        label={<div className="flex justify-between gap-2">Size</div>}
        enum={SizeMetric}
        defaultValue={sizeMetric}
        onChange={(sizeMetric: SizeMetricType) => setSizeMetricType(sizeMetric)}
        iconMap={sizeMetricIcons}
      />
      <EnumSelect
        label={<div className="flex justify-between gap-2">Chart layout</div>}
        enum={Chart}
        defaultValue={chartType}
        onChange={(chartType: ChartType) => setChartType(chartType)}
        iconMap={chartTypeIcons}
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
