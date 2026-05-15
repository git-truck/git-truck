import { useOptions } from "~/contexts/OptionsContext"
import type { MetricType } from "~/metrics/metrics"
import { Metrics, sizeMetricDescriptions } from "~/metrics/metrics"
import { IconDropdownGroup } from "~/components/EnumSelect"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { pickKey as pickKey } from "~/shared/utils/object"
import { LayoutGroups, Layouts, type LayoutType } from "~/layouts/layouts"
import { FileSizeMetric } from "~/metrics/fileSize"
import { CommitsMetric } from "~/metrics/mostCommits"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import { mdiScaleBalance } from "@mdi/js"
import { LastChangedMetric } from "~/metrics/lastChanged"

export const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
  FILE_TYPE: "FILE_SIZE",
  FILE_SIZE: "FILE_SIZE",
  TOP_CONTRIBUTOR: "MOST_CONTRIBUTIONS",
  MOST_COMMITS: "MOST_COMMITS",
  LAST_CHANGED: "LAST_CHANGED",
  MOST_CONTRIBUTIONS: "MOST_CONTRIBUTIONS",
  CONTRIBUTORS: "EQUAL_SIZE"
}

export function Options() {
  const { metricType, chartType, sizeMetric, linkMetricAndSizeMetric, setMetricType, setChartType, setSizeMetricType } =
    useOptions()

  const colorMetricIcons = pickKey(Metrics, "icon")
  const colorMetricDescriptions = pickKey(Metrics, "description")

  const layoutTypeIcons: Record<LayoutType, string> = pickKey(Layouts, "icon")

  const sizeMetricIcons = pickKey(
    {
      FILE_SIZE: FileSizeMetric,
      MOST_COMMITS: CommitsMetric,
      MOST_CONTRIBUTIONS: LinesChangedMetric,
      EQUAL_SIZE: { icon: mdiScaleBalance },
      LAST_CHANGED: LastChangedMetric
    },
    "icon"
  )

  return (
    <div className="grid grid-flow-col grid-cols-3 grid-rows-[auto_auto] items-start gap-0">
      <label
        htmlFor="layout"
        className="text-tertiary-text dark:text-tertiary-text-dark ml-8 text-xs font-bold whitespace-nowrap"
      >
        Layout
      </label>
      <IconDropdownGroup
        group={LayoutGroups}
        defaultValue={chartType}
        iconMap={layoutTypeIcons}
        ariaLabel="Select layout"
        onChange={(chartType: LayoutType) => setChartType(chartType)}
      />
      <h3
        className="text-tertiary-text dark:text-tertiary-text-dark ml-8 text-xs font-bold whitespace-nowrap"
        title="Select the metric used to size the visualization"
      >
        Node Size
      </h3>
      {/* <span className="bg-secondary-bg dark:bg-secondary-bg-dark h-0.75 flex-1 rounded-full" /> */}
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
      {/* </div> */}
      {/* <div className="flex items-center justify-between gap-2"> */}
      <h3
        className="text-tertiary-text dark:text-tertiary-text-dark ml-8 text-xs font-bold whitespace-nowrap"
        title="Select the metric used to color the visualization"
      >
        Node Color
      </h3>
      <IconDropdownGroup
        titleMap={colorMetricDescriptions}
        group={
          Object.fromEntries(Object.entries(Metrics).map(([key, metric]) => [key, metric.name])) as Record<
            MetricType,
            string
          >
        }
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
  )
}
