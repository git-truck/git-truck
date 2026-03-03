import { useState } from "react"
import { LegendDot } from "~/components/util"
import { ChevronButton } from "~/components/ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"
import { useMetrics } from "~/contexts/MetricContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useSelectedCategory, useSelectedCategories } from "~/state/stores/selection"
import { cn } from "~/styling"
import { ResetSelectionButton } from "~/components/buttons/ResetSelectionButton"

const legendCutoff = 8

export class PointInfo {
  public readonly color: `#${string}`
  public weight: number

  constructor(color: `#${string}`, weight: number) {
    this.color = color
    this.weight = weight
  }

  add(value: number) {
    this.weight += value
  }
}

export type PointLegendData = Map<string, PointInfo>

export function PointLegend() {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")

  const [collapse, setCollapse] = useState<boolean>(true)

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  const shownItems = items.slice(0, collapse ? legendCutoff : items.length)

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {shownItems.map(([label, info]) => (
        <PointLegendEntry key={label} label={label} info={info} />
      ))}
      {items.length > legendCutoff ? (
        <PointLegendOther items={items.slice(legendCutoff)} collapse={collapse} toggle={() => setCollapse(!collapse)} />
      ) : null}
    </div>
  )
}

function PointLegendEntry({ label, info }: { label: string; info: PointInfo }) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  const selectedCategories = useSelectedCategories()
  const { selected, select, deselect } = useSelectedCategory(label)

  const isOnlySelectedCategory = selected && selectedCategories.length === 1
  const noSelectedCategories = selectedCategories.length === 0

  return (
    <div key={label} className="relative flex gap-1 text-sm leading-none">
      <CheckboxWithLabel
        key={String(selected)}
        checkBoxClassName="opacity-0 group-hover:opacity-100 transition-opacity"
        intermediate={noSelectedCategories}
        checked={selected}
        onChange={(evt) => (evt.target.checked ? select() : deselect())}
      >
        {isAuthorRelatedLegend ? (
          <LegendDot dotColor={info.color} authorColorToChange={label} />
        ) : (
          <LegendDot dotColor={info.color} />
        )}
        <span
          className={cn("truncate", {
            "font-bold": selected || noSelectedCategories,
            "text-blue-primary": selected
          })}
          title={
            noSelectedCategories
              ? `Highlight ${label} exclusively`
              : isOnlySelectedCategory
                ? "Highlight all categories"
                : selected
                  ? `Remove ${label} from filter`
                  : `Add ${label} to filter`
          }
        >
          {label}
        </span>
      </CheckboxWithLabel>
    </div>
  )
}

function PointLegendOther({
  toggle,
  items,
  collapse
}: {
  toggle: () => void
  items: [string, PointInfo][]
  collapse: boolean
}) {
  return (
    <ChevronButton
      size={0.75}
      className="group col-span-full flex items-center gap-2 hover:opacity-80"
      open={!collapse}
      title={collapse ? "Show more" : "Show less"}
      onClick={toggle}
    >
      {collapse ? (
        <>
          <div className="ml-3 flex gap-2">
            {items.slice(0, 14).map(([label, info]) => (
              <LegendDot
                key={label}
                className="-ml-3 rotate-12 transition-transform duration-300 group-hover:-rotate-12"
                dotColor={info.color}
              />
            ))}
          </div>
          {/* <span className="text-xs">+{items.length} more</span> */}
          <span className="text-xs">Show {items.length.toLocaleString()} more</span>
        </>
      ) : (
        <span className="text-xs">Show less</span>
      )}
    </ChevronButton>
  )
}
