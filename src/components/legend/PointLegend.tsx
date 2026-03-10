import { useState } from "react"
import { LegendDot } from "~/components/util"
import { ChevronButton } from "~/components/ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"
import { useMetrics } from "~/contexts/MetricContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import {
  useSelectedCategory,
  useSelectedCategories,
  useIsCategorySelected,
  useSelectionStore
} from "~/state/stores/selection"
import { cn } from "~/styling"
import { ResetSelectionButton } from "~/components/buttons/ResetSelectionButton"
import { feature_flags } from "~/feature_flags"
import { PointLegendDistBar } from "~/components/legend/PointLegendDistBar"
import { Icon } from "~/components/Icon"
import { mdiClose, mdiMagnify } from "@mdi/js"

const legendCutoff = 8

export class PointInfo {
  public readonly color: `#${string}`
  public weight: number
  public children: Map<string, PointInfo>

  constructor(color: `#${string}`, weight: number) {
    this.color = color
    this.weight = weight
    this.children = new Map()
  }

  add(value: number) {
    this.weight += value
  }

  addChild(extension: string, child: PointInfo) {
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
  const isCategorySelected = useIsCategorySelected()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")

  const [collapse, setCollapse] = useState<boolean>(true)
  const [selectedSearch, setSelectedSearch] = useState("")

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  const totalWeight = items.reduce((sum, [, info]) => sum + info.weight, 0)

  // TODO: Decide on this behavior. Always showing selected items even if they don't match the search query allows users to keep their context and see their selected items, but it can be confusing if they don't understand why some items are shown when they don't match the search. On the other hand, filtering selected items can make it easier to find specific items, but it can also make users lose their context and not see their selected items. We could also consider adding a toggle to allow users to choose their preferred behavior.
  // When true, selected items are always shown even if they don't match the search query.
  // When false, the search filters both selected and unselected items.
  const ALWAYS_SHOW_SELECTED = true

  const isSearchActive = selectedSearch.length > 0
  const matchesSearch = (label: string) => label.toLowerCase().includes(selectedSearch.toLowerCase())

  const filteredItems = isSearchActive
    ? items.filter(([label]) => {
        if (ALWAYS_SHOW_SELECTED && isCategorySelected(label)) return true
        return matchesSearch(label)
      })
    : items

  const shownItems = filteredItems.slice(0, collapse ? legendCutoff : filteredItems.length)

  if (items.length === 0) return null

  return (
    <div className="-ml-8 flex flex-col gap-1">
      <div
        className={cn("border-border dark:border-border-dark flex flex-wrap gap-0.5 rounded-lg border p-2", {
          hidden: !feature_flags.show_legend_highlight
        })}
      >
        {items
          .filter(([label]) => isCategorySelected(label))
          .map(([label, info]) => (
            <div key={label} title={label} className="flex max-w-[25ch] items-center gap-1 truncate text-sm">
              <LegendDot dotColor={info.color} />
              {label}
            </div>
          ))}
      </div>
      <div className="flex flex-col gap-2">
        {feature_flags.point_legend_dist_bar_and_search ? (
          <PointLegendDistBar items={items} totalWeight={totalWeight} />
        ) : null}
        <div className="flex w-full justify-between gap-2">
          <ResetSelectionButton />
          <div className="align-center flex flex-row gap-5 text-right">
            {feature_flags.point_legend_dist_bar_and_search ? (
              <SearchCategoriesButton selectedSearch={selectedSearch} setSelectedSearch={setSelectedSearch} />
            ) : null}
            <p className="self-center text-sm font-bold"># Files</p>
            {totalWeight > 0 ? <p className="min-w-12 self-center text-sm font-bold">% Files</p> : null}
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-1">
        <div className="flex flex-1 flex-col gap-2">
          {shownItems.map(([label, info]) => (
            <PointLegendEntry key={label} label={label} info={info} totalWeight={totalWeight} />
          ))}
          {filteredItems.length > legendCutoff ? (
            <PointLegendOther
              items={filteredItems.slice(legendCutoff)}
              collapse={collapse}
              toggle={() => setCollapse(!collapse)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PointLegendEntry({ label, info, totalWeight }: { label: string; info: PointInfo; totalWeight: number }) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  const selectedCategories = useSelectedCategories()

  const { selectCategories, deselectCategories } = useSelectionStore(({ selectCategories, deselectCategories }) => ({
    selectCategories,
    deselectCategories
  }))

  const { selected } = useSelectedCategory()

  const isOnlySelectedCategory = selected(label) && selectedCategories.length === 1
  const noSelectedCategories = selectedCategories.length === 0

  const isSelected = selected(label)
  const dotColor = info.color

  return (
    <div key={label} className="width-full justify-content relative flex gap-1 align-middle text-sm leading-none">
      <CheckboxWithLabel
        key={String(isSelected)}
        checkBoxClassName="opacity-0 group-hover:opacity-100 transition-opacity"
        intermediate={noSelectedCategories}
        checked={isSelected}
        onChange={(evt) => {
          if (evt.target.checked) {
            selectCategories([label, ...(info.children ? Array.from(info.children.keys()) : [])])
          } else {
            deselectCategories([label, ...(info.children ? Array.from(info.children.keys()) : [])])
          }
        }}
      >
        {isAuthorRelatedLegend ? (
          <LegendDot key={dotColor} dotColor={dotColor} authorColorToChange={label} />
        ) : (
          <LegendDot key={dotColor} dotColor={dotColor} />
        )}
        <span
          className={cn("truncate", {
            "font-bold": true,
            "text-blue-primary": isSelected,
            "italic underline": label === "Other" || label === "Multiple contributors"
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
      <div className="text-muted-foreground align-center center flex flex-row gap-5 text-right text-xs">
        <span className="self-center">{info.weight}</span>
        {totalWeight > 0 && (
          <span className="min-w-12 self-center">({((info.weight / totalWeight) * 100).toFixed(1)}%)</span>
        )}
      </div>
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

function SearchCategoriesButton({
  selectedSearch,
  setSelectedSearch
}: {
  selectedSearch: string
  setSelectedSearch: (value: string) => void
}) {
  return (
    <form
      className="not-focus-within:has-placeholder-shown:w-button pointer-events-none right-0 z-10 flex w-full flex-col gap-2 transition-[left,width,translate] duration-75 **:pointer-events-auto not-focus-within:has-placeholder-shown:static not-focus-within:has-placeholder-shown:translate-x-0"
      onSubmit={(event) => {
        event.preventDefault()
        //setSearchText("")
      }}
    >
      <button className="hidden min-w-max cursor-pointer peer-placeholder-shown:hidden peer-focus:inline">
        <Icon path={mdiClose} size="1em" />
      </button>
      <label
        className="input min-h-button h-button max-h-button relative flex w-full min-w-0 cursor-pointer flex-row-reverse items-center gap-2 overflow-hidden not-focus-within:has-placeholder-shown:grow-0 not-focus-within:has-placeholder-shown:gap-0"
        title={"Search within selected"}
      >
        <input
          type="text"
          placeholder="Search selected…"
          value={selectedSearch}
          className="peer w-full grow placeholder-shown:not-focus:w-0 placeholder-shown:not-focus:min-w-0"
          onChange={(e) => setSelectedSearch(e.target.value)}
        />
        <Icon path={mdiMagnify} className="hidden min-w-max peer-placeholder-shown:inline peer-focus:hidden" />
      </label>
    </form>
  )
}
