import type { GitBlobObject, RepoData } from "~/shared/model"
import { generateAuthorColors, type Metric, type MetricCache } from "./metrics"
import { hslToHex } from "~/shared/util"
import { noEntryColor } from "~/const"
import { mdiAccountGroup } from "@mdi/js"
import { PointInfo, type PointLegendData } from "~/components/legend/PointLegend"

export const ContributorsMetric: Metric = {
  name: "Contributors",
  icon: mdiAccountGroup,
  getTooltipContent(obj, dbi) {
    const count = dbi.contributorsForPath[obj.path].length || 0
    return `${count} contributor${count !== 1 ? "s" : ""}`
  },
  getCategories(obj, dbi) {
    return dbi.contributorsForPath[obj.path].join(", ") || "No contributors"
  },
  metricFunction: (data: RepoData) => (blob: GitBlobObject, cache: MetricCache) => {
    const legend: PointLegendData = (cache.legend as PointLegendData) ?? new Map<string, PointInfo>()
    // const authorColors = data.databaseInfo.authorColors
    const authorColors = generateAuthorColors(data.databaseInfo.authors, "", data.databaseInfo.authorColors)

    const contributors = data.databaseInfo.contributorsForPath[blob.path] ?? []
    for (const { contributor, contribcount } of contributors) {
      const color = authorColors[contributor] ?? noEntryColor
      if (legend.has(contributor)) {
        legend.get(contributor)?.add(contribcount)
      } else {
        legend.set(contributor, new PointInfo(color, contribcount))
      }
    }
    if (contributors.length === 0) {
      if (!legend.has("Unknown")) {
        legend.set("Unknown", new PointInfo(noEntryColor, 0))
      }
      legend.get("Unknown")?.add(1)
    }
    // For simplicity, if there are multiple contributors, we set the color to a default color. A more complex approach could be to create a gradient based on the contributors' colors.
    const colors =
      contributors.length === 1
        ? [authorColors[contributors[0].contributor]]
        : contributors.map((c) => authorColors[c.contributor])
    // noEntryColor
    cache.colormap.set(blob.path, colors)
    cache.legend = legend
  }
}

// export class TruckFactorTranslater {
//   private readonly min_lightness = 50
//   private readonly max_lighness = 90
//   private readonly step: number

//   constructor(author_count: number) {
//     this.step =
//       author_count <= 1
//         ? 1
//         : (this.step = (this.max_lighness - this.min_lightness) / Math.floor(Math.log2(author_count)))
//   }

//   getColor(value: number): `#${string}` {
//     const level = Math.floor(Math.log2(value))
//     const lightness = this.min_lightness + level * this.step
//     const hue = 0
//     const saturation = 75

//     return hslToHex(hue, saturation, lightness)
//   }

//   setColor(blob: GitBlobObject, cache: MetricCache, authorCountsPerFile: Map<string, number>) {
//     const existing = authorCountsPerFile.get(blob.path)
//     const color = existing ? this.getColor(existing) : noEntryColor
//     cache.colormap.set(blob.path, color)
//   }
// }
