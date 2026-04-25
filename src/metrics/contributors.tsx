import { type CategoricalMetric } from "./metrics"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiAccountGroup } from "@mdi/js"
import { PointInfo, PointLegend, type PointLegendData } from "~/components/legend/PointLegend"
import { LegendDot } from "~/components/util"

export const ContributorsMetric: CategoricalMetric = {
  name: "Contributors",
  description: "Files are colored based on which contributors have contributed to it.",
  icon: mdiAccountGroup,
  inspectionPanels: [PointLegend],
  getTooltipContent(obj, dbi, { contributorColors }) {
    const contributors = dbi.contributorsForPath[obj.path] ?? []
    if (contributors.length === 0) {
      return "No contributors"
    }
    const maxToShow = 5
    return (
      <div className="flex flex-col gap-1">
        {contributors.slice(0, maxToShow).map((c) => (
          <span key={c.contributor} className="flex items-center gap-1">
            <LegendDot key={c.contributor} dotColor={contributorColors[c.contributor]} /> {c.contributor}
          </span>
        ))}

        {contributors.length > maxToShow ? `and ${contributors.length - maxToShow} more...` : null}
      </div>
    )
  },
  getCategories(obj, dbi) {
    return (dbi.contributorsForPath[obj.path] ?? []).map((c) => c.contributor)
  },
  //For now we don't use _root for calculation
  metricFunctionFactory:
    (data, root, { contributorColors }) =>
    (blob, cache) => {
      const legend: PointLegendData = (cache.legend as PointLegendData) ?? new Map<string, PointInfo>()

      const contributors = data.databaseInfo.contributorsForPath[blob.path] ?? []
      for (const { contributor } of contributors) {
        const color = contributorColors[contributor] ?? noEntryColor
        if (legend.has(contributor)) {
          legend.get(contributor)?.add(1)
        } else {
          legend.set(contributor, new PointInfo(color, 1))
        }
      }
      if (contributors.length === 0) {
        if (!legend.has(UNKNOWN_CATEGORY)) {
          legend.set(UNKNOWN_CATEGORY, new PointInfo(noEntryColor, 0))
        }
        legend.get(UNKNOWN_CATEGORY)?.add(1)
      }

      const colors = contributors.map((c) => ({ category: c.contributor, color: contributorColors[c.contributor] }))

      cache.categoriesMap.set(blob.path, colors)
      cache.legend = legend
    }
}
