import { memo } from "react"
import type { ChartType } from "~/contexts/OptionsContext"
import { Chart, useOptions } from "~/contexts/OptionsContext"
import type { MetricType } from "~/metrics/metrics"
import { colorMetricDescriptions, Metric, sizeMetricDescriptions } from "~/metrics/metrics"
import { IconDropdownGroup } from "~/components/EnumSelect"
import {
  mdiChartBubble,
  mdiChartTree,
  mdiFileCodeOutline,
  mdiKnife,
  mdiPlusMinusVariant,
  mdiPodiumGold,
  mdiPulse,
  mdiScaleBalance,
  mdiSourceCommit
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { FileSizeMetric } from "~/metrics/fileSize";

export const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
  FILE_TYPE: "FILE_SIZE",
  FILE_SIZE: "FILE_SIZE",
  TOP_CONTRIBUTOR: "MOST_CONTRIBUTIONS",
  MOST_COMMITS: "MOST_COMMITS",
  LAST_CHANGED: "LAST_CHANGED",
  MOST_CONTRIBUTIONS: "MOST_CONTRIBUTIONS"
}

export const Options = memo(function Options() {
  const { metricType, chartType, sizeMetric, linkMetricAndSizeMetric, setMetricType, setChartType, setSizeMetricType } =
    useOptions()

  const colorMetricIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    FILE_SIZE: FileSizeMetric.icon,
    LAST_CHANGED: mdiPulse,
    MOST_COMMITS: mdiSourceCommit,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: FileSizeMetric.icon,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    LAST_CHANGED: mdiPulse,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree,
    PARTITION: mdiKnife
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="card__subtitle whitespace-nowrap">Visualization Layout</h3>
        <span className="bg-primary-bg dark:bg-text-primary h-0.75 w-full rounded-full opacity-20" />
        <div className="ml-auto min-w-45">
          <IconDropdownGroup
            group={Chart}
            defaultValue={chartType}
            iconMap={chartTypeIcons}
            ariaLabel="Select layout"
            onChange={(chartType: ChartType) => setChartType(chartType)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="card__subtitle whitespace-nowrap" title="Select the metric used to size the visualization">
          Node Size
        </h3>
        <span className="bg-primary-bg dark:bg-text-primary h-0.75 w-full rounded-full opacity-20" />
        <div className="ml-auto min-w-45">
          <IconDropdownGroup
            titleMap={sizeMetricDescriptions}
            group={SizeMetric}
            defaultValue={sizeMetric}
            iconMap={sizeMetricIcons}
            ariaLabel="Select size metric"
            onChange={(sizeMetric: SizeMetricType) => {
              setSizeMetricType(sizeMetric)
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="card__subtitle whitespace-nowrap" title="Select the metric used to color the visualization">
          Node Color
        </h3>
        <span className="bg-primary-bg dark:bg-text-primary h-0.75 w-full rounded-full opacity-20" />
        <div className="ml-auto min-w-45">
          <IconDropdownGroup
            titleMap={colorMetricDescriptions}
            group={Metric}
            defaultValue={metricType}
            iconMap={colorMetricIcons}
            ariaLabel="Select color metric"
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
          />
        </div>
      </div>
    </>
  )
})
