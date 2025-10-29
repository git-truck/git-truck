import { memo } from "react"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { getMetricDescription, Metric } from "../metrics/metrics"
import { IconRadioGroup } from "./EnumSelect"

import {
  mdiChartBubble,
  mdiChartTree,
  mdiFileCodeOutline,
  mdiKnife,
  mdiPlusMinusVariant,
  mdiPodiumGold,
  mdiResize,
  mdiScaleBalance,
  mdiSourceCommit,
  mdiUpdate
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { CollapsableSettings } from "./Settings"

export const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
  FILE_TYPE: "FILE_SIZE",
  TOP_CONTRIBUTOR: "MOST_CONTRIBS",
  MOST_COMMITS: "MOST_COMMITS",
  LAST_CHANGED: "LAST_CHANGED",
  MOST_CONTRIBUTIONS: "MOST_CONTRIBS"
}

export const Options = memo(function Options() {
  const { metricType, chartType, sizeMetric, linkMetricAndSizeMetric, setMetricType, setChartType, setSizeMetricType } =
    useOptions()

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_COMMITS: mdiSourceCommit,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    LAST_CHANGED: mdiUpdate,
    MOST_CONTRIBS: mdiPlusMinusVariant
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree,
    PARTITION: mdiKnife
  }

  return (
    <>
      <div className="absolute top-2 right-2">
        <CollapsableSettings />
      </div>
      <div className="not-last:border-secondary-border not-last:border-b not-last:pb-2">
        <h2 className="card__title">Layout</h2>
        <IconRadioGroup
          // large
          group={Chart}
          defaultValue={chartType}
          onChange={(chartType: ChartType) => setChartType(chartType)}
          iconMap={chartTypeIcons}
        />
      </div>
      <div className="not-last:border-secondary-border not-last:border-b not-last:pb-2">
        <h2 className="card__title">Size</h2>
        <IconRadioGroup
          // large
          group={SizeMetric}
          defaultValue={sizeMetric}
          onChange={(sizeMetric: SizeMetricType) => setSizeMetricType(sizeMetric)}
          iconMap={sizeMetricIcons}
        />
      </div>
      <div>
        <h2 className="card__title">Color</h2>
        <IconRadioGroup
          titleMap={Object.keys(Metric).reduce(
            (acc, key) => {
              acc[key as MetricType] = getMetricDescription(key as MetricType)
              return acc
            },
            {} as Record<MetricType, string>
          )}
          group={Metric}
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
      </div>
    </>
  )
})
