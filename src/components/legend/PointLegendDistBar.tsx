import { PointInfo } from "~/components/legend/PointLegend"
import { missingInMapColor } from "~/const"
import { useSelectedCategories, useSelectedCategory } from "~/state/stores/selection"
import { cn } from "~/styling"

export function PointLegendDistBar({ items, totalWeight }: { items: [string, PointInfo][]; totalWeight: number }) {
  const { selected, select, deselect } = useSelectedCategory()
  //If percentage is below this cutoff, it will be grouped into "Rest" segment. This is to avoid having too many thin segments that are hard to interact with. The cutoff is a tradeoff between accuracy and usability.
  const CUTOFF = 2

  const selectedCategories = useSelectedCategories()
  const noSelectedCategories = selectedCategories.length === 0

  // Calculate segments above cutoff and group the rest
  const mapped = items.map(([label, info]) => {
    const percentage = totalWeight > 0 ? (info.weight / totalWeight) * 100 : 0
    return { label, color: info.color, percentage, info }
  })
  const segments = mapped.filter((seg) => seg.percentage >= CUTOFF)
  const restWeight = mapped.filter((seg) => seg.percentage < CUTOFF).reduce((sum, seg) => sum + seg.percentage, 0)

  if (restWeight > 0) {
    segments.push({
      label: "Rest",
      color: missingInMapColor,
      percentage: restWeight,
      info: new PointInfo(missingInMapColor, Infinity)
    })
  }

  const representedLabels = new Set(
    segments
      .filter((seg) => seg.label !== "Rest")
      .flatMap((seg) => [seg.label, ...Array.from(seg.info.children?.keys() ?? [])])
  )
  const restLabels = mapped.filter((seg) => !representedLabels.has(seg.label)).map((seg) => seg.label)

  const toggleSegmentSelection = (seg: (typeof segments)[number], isSel: boolean) => {
    if (seg.label === "Rest") {
      restLabels.forEach((label) => {
        if (isSel) {
          deselect(label)
        } else {
          select(label)
        }
      })
      return
    }

    if (isSel) {
      deselect(seg.label)
      seg.info.children.forEach((_, childLabel) => deselect(childLabel))
    } else {
      select(seg.label)
      seg.info.children.forEach((_, childLabel) => select(childLabel))
    }
  }

  return (
    <div className="mt-2 flex h-3 w-full overflow-hidden rounded-4xl ring-4 ring-neutral-300 dark:ring-neutral-900">
      {segments.map((seg) => {
        const isSel = selected(seg.label) || (seg.label === "Rest" && restLabels.some((label) => selected(label)))
        return (
          <span
            key={seg.label}
            role="button"
            tabIndex={0}
            aria-pressed={isSel}
            className={cn("h-full cursor-pointer outline-none hover:opacity-80", {
              "opacity-15 grayscale-100 hover:grayscale-0": !noSelectedCategories && !isSel,
              "opacity-100": noSelectedCategories || isSel,
              "z-10 ring-2 ring-black": isSel
            })}
            //TODO: Include better tooltip?
            title={`${seg.label} (${seg.percentage.toFixed(1)}%)`}
            style={{
              background: seg.color,
              width: `${seg.percentage}%`
            }}
            onClick={() => toggleSegmentSelection(seg, isSel)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                toggleSegmentSelection(seg, isSel)
              }
            }}
          />
        )
      })}
    </div>
  )
}
