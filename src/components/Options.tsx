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
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="card__subtitle whitespace-nowrap">Visualization Layout</h3>
        <span className="bg-primary-bg dark:bg-text-primary h-0.75 w-full rounded-full opacity-20" />
        <div className="ml-auto min-w-45">
          <IconDropdownGroup
            group={LayoutGroups}
            defaultValue={chartType}
            iconMap={layoutTypeIcons}
            ariaLabel="Select layout"
            onChange={(chartType: LayoutType) => setChartType(chartType)}
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
      </div>
    </>
  )
}
