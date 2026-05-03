import { type CategoricalMetric } from "./metrics"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiAccountGroup, mdiAccountMultiple, mdiDice5 } from "@mdi/js"
import { PointInfo, PointLegend, type PointLegendData } from "~/components/legend/PointLegend"
import { LegendDot } from "~/components/util"
import { countLeafNodes } from "~/metrics/metricUtils"

export const ContributorsMetric: CategoricalMetric = {
  name: "Contributors",
  description: "Files are colored based on which contributors have contributed to it.",
  icon: mdiAccountGroup,
  inspectionPanels: [
    {
      title: "Contributors",
      content: PointLegend,
      description:
        "Shows how many files a contributor has modified. Click on a contributor to isolate the files they have contributed to.",
      actions: { search: true, clear: true },
      menuItems: [
        { icon: mdiAccountMultiple, label: "Group Contributors", actionId: "group-contributors" },
        { icon: mdiDice5, label: "Shuffle Colors", actionId: "shuffle-colors" }
      ]
    }
  ],
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
      let legend: PointLegendData | undefined = cache.legend as PointLegendData | undefined

      if (!legend) {
        legend = {
          entries: new Map<string, PointInfo>(),
          totalWeight: countLeafNodes(root)
        }
      }

      const contributors = data.databaseInfo.contributorsForPath[blob.path] ?? []
      for (const { contributor } of contributors) {
        const color = contributorColors[contributor] ?? noEntryColor
        if (legend.entries.has(contributor)) {
          legend.entries.get(contributor)?.add(1)
        } else {
          legend.entries.set(contributor, new PointInfo(color, 1))
        }
      }
      if (contributors.length === 0) {
        if (!legend.entries.has(UNKNOWN_CATEGORY)) {
          legend.entries.set(UNKNOWN_CATEGORY, new PointInfo(noEntryColor, 0))
        }
        legend.entries.get(UNKNOWN_CATEGORY)?.add(1)
      }

      const colors = contributors.map((c) => ({ category: c.contributor, color: contributorColors[c.contributor] }))

      cache.categoriesMap.set(blob.path, colors)
      cache.legend = legend
    }
}
