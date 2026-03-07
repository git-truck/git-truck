import { useState } from "react"
import { LegendDot } from "~/components/util"
import { ChevronButton } from "~/components/ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"
import { useMetrics } from "~/contexts/MetricContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { useSelectedCategory, useSelectedCategories, useIsCategorySelected } from "~/state/stores/selection"
import { cn } from "~/styling"
import { ResetSelectionButton } from "~/components/buttons/ResetSelectionButton"
import { feature_flags } from "~/feature_flags"

const legendCutoff = 8

export class PointInfo {
  public readonly color: `#${string}`
  public weight: number
  public children?: Map<string, PointInfo>

  constructor(color: `#${string}`, weight: number) {
    this.color = color
    this.weight = weight
  }

  add(value: number) {
    this.weight += value
  }

  addChild(extension: string, child: PointInfo) {
    if (!this.children) this.children = new Map()
    if (this.children.has(extension)) {
      this.children.get(extension)?.add(child.weight)
      return
    } else this.children.set(extension, child)
  }
}

export type PointLegendData = Map<string, PointInfo>

export function PointLegend() {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const selectedCategories = useSelectedCategories()
  const isCategorySelected = useIsCategorySelected()

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
    <div className="-ml-8 flex flex-col gap-1">
      {selectedCategories.length > 0 ? <ResetSelectionButton /> : null}
      <div
        className={cn("border-border dark:border-border-dark flex flex-wrap gap-0.5 rounded-lg border p-2", {
          hidden: !feature_flags.show_legend_highlight
        })}
      >
        {shownItems
          .filter(([label]) => isCategorySelected(label))
          .map(([label, info]) => (
            <div key={label} title={label} className="flex max-w-[25ch] items-center gap-1 truncate text-sm">
              <LegendDot dotColor={info.color} />
              {label}
            </div>
          ))}
        <span>...and {items.length - legendCutoff} more</span>
      </div>
      <div className="flex justify-between gap-1">
        <div className="flex flex-1 flex-col gap-2">
          {shownItems.map(([label, info]) => (
            <PointLegendEntry key={label} label={label} info={info} />
          ))}
          {items.length > legendCutoff ? (
            <PointLegendOther
              items={items.slice(legendCutoff)}
              collapse={collapse}
              toggle={() => setCollapse(!collapse)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PointLegendEntry({ label, info }: { label: string; info: PointInfo }) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  const selectedCategories = useSelectedCategories()
  const { selected, select, deselect } = useSelectedCategory()

  const isOnlySelectedCategory = selected(label) && selectedCategories.length === 1
  const noSelectedCategories = selectedCategories.length === 0

  return (
    <div key={label} className="relative flex gap-1 text-sm leading-none">
      <CheckboxWithLabel
        key={String(selected(label))}
        checkBoxClassName="opacity-0 group-hover:opacity-100 transition-opacity"
        intermediate={noSelectedCategories}
        checked={selected(label)}
        onChange={(evt) => {
          if (evt.target.checked) {
            select(label)
            info.children?.forEach((_, childLabel) => select(childLabel))
          } else {
            deselect(label)
            info.children?.forEach((_, childLabel) => deselect(childLabel))
          }
        }}
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
                : selected(label)
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
