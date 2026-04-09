import { PointInfo } from "~/components/legend/PointLegend"
import { missingInMapColor } from "~/const"
import { useSelectedCategories, useSelectedCategory } from "~/state/stores/selection"
import { cn } from "~/styling"
import { Tick } from "~/components/sliderUtils"

export function PointLegendDistBar({ items, totalWeight }: { items: [string, PointInfo][]; totalWeight: number }) {
  const { isSelected: selected, select, deselect } = useSelectedCategory()
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

  const truncateLabel = (label: string, availablePercentage: number): string => {
    // Roughly 2.5% of container width per character at xs font size
    const estimatedCharsFit = Math.max(2, Math.floor(availablePercentage / 2.5))
    if (label.length <= estimatedCharsFit) return label
    return label.slice(0, estimatedCharsFit - 1) + "…"
  }

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
    <div className="mt-7 mb-10 flex h-4 w-full overflow-visible">
      {segments.map((seg, index) => {
        const isSel = selected(seg.label) || (seg.label === "Rest" && restLabels.some((label) => selected(label)))
        const showTick = seg.percentage >= 5 // Only show tick if segment is at least 5% wide
        const isFirst = index === 0
        const isLast = index === segments.length - 1
        // Calculate available width: current segment + next segment (if exists)
        const availableWidth = seg.percentage + (index < segments.length - 1 ? segments[index + 1].percentage : 0)
        const displayLabel = truncateLabel(seg.label, availableWidth)
        return (
          <div key={seg.label} className="relative" style={{ width: `${seg.percentage}%` }}>
            <button
              tabIndex={0}
              aria-pressed={isSel}
              className={cn("flex h-full w-full cursor-pointer outline-none hover:opacity-80", {
                "opacity-15 grayscale-100 hover:grayscale-0": !noSelectedCategories && !isSel,
                "opacity-100": noSelectedCategories || isSel,
                "rounded-l-sm": isFirst,
                "rounded-r-sm": isLast
              })}
              //TODO: Include better tooltip?
              title={`${seg.label} (${seg.percentage.toFixed(1)}%)`}
              style={{
                background: seg.color
              }}
              onClick={() => toggleSegmentSelection(seg, isSel)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleSegmentSelection(seg, isSel)
                }
              }}
            />
            <div className="absolute left-0 h-5 w-fit -translate-y-full overflow-visible">
              {index % 2 === 0 ? (
                <>
                  <div className="absolute -top-7 left-full w-fit overflow-visible">
                    <span
                      className={cn(
                        {
                          "ml-1": isFirst,
                          "opacity-0": !showTick,
                          "opacity-15": !noSelectedCategories && !isSel && showTick
                        },
                        "pointer-events-none text-xs whitespace-nowrap"
                      )}
                      title={seg.label}
                    >
                      {displayLabel}
                    </span>
                    <Tick
                      className={cn({
                        "ml-1": isFirst,
                        "opacity-15": !noSelectedCategories && !isSel
                      })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute top-5 left-full w-fit overflow-visible" title={seg.label}>
                    {" "}
                    <Tick
                      className={cn({
                        "ml-1": isFirst,
                        "opacity-15": !noSelectedCategories && !isSel
                      })}
                    />
                    <span
                      className={cn(
                        {
                          "ml-1": isFirst,
                          "opacity-0": !showTick,
                          "opacity-15": !noSelectedCategories && !isSel && showTick
                        },
                        "pointer-events-none text-xs whitespace-nowrap"
                      )}
                    >
                      {displayLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
