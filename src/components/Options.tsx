import { memo } from "react"
import type { ChartType } from "~/contexts/OptionsContext"
import { Chart, useOptions } from "~/contexts/OptionsContext"
import type { MetricType } from "~/metrics/metrics"
import { colorMetricDescriptions, Metric, sizeMetricDescriptions } from "~/metrics/metrics"
import { IconRadioGroup } from "~/components/EnumSelect"

import {
  mdiAccountMultiple,
  mdiChartBubble,
  mdiChartTree,
  mdiFileCodeOutline,
  mdiKnife,
  mdiPlusMinusVariant,
  mdiPodiumGold,
  mdiPulse,
  mdiResize,
  mdiScaleBalance,
  mdiSourceCommit
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"

export const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
  FILE_TYPE: "FILE_SIZE",
  TOP_CONTRIBUTOR: "MOST_CONTRIBUTIONS",
  MOST_COMMITS: "MOST_COMMITS",
  LAST_CHANGED: "LAST_CHANGED",
  MOST_CONTRIBUTIONS: "MOST_CONTRIBUTIONS",
  CONTRIBUTORS: "EQUAL_SIZE"
}

export const Options = memo(function Options() {
  const { metricType, chartType, sizeMetric, linkMetricAndSizeMetric, setMetricType, setChartType, setSizeMetricType } =
    useOptions()

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiPulse,
    MOST_COMMITS: mdiSourceCommit,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant,
    CONTRIBUTORS: mdiAccountMultiple
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
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
      <div>
        <h3 className="card__subtitle">Layout</h3>
        <IconRadioGroup
          group={Chart}
          defaultValue={chartType}
          iconMap={chartTypeIcons}
          ariaLabel="Select layout"
          onChange={(chartType: ChartType) => setChartType(chartType)}
        />
      </div>
      <div>
        <h3 className="card__subtitle" title="Select the metric used to size the visualization">
          Size
        </h3>
        <IconRadioGroup
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
      <div>
        <h3 className="card__subtitle" title="Select the metric used to color the visualization">
          Color
        </h3>
        <IconRadioGroup
          titleMap={colorMetricDescriptions}
          group={Metric}
          defaultValue={metricType}
          iconMap={visualizationIcons}
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
    </>
  )
})
