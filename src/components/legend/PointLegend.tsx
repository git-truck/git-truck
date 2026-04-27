import { useEffect, useMemo, useState, useTransition } from "react"
import { LegendDot } from "~/components/util"
import { useOptions } from "~/contexts/OptionsContext"
import { useData } from "~/contexts/DataContext"
import { useMetricsHierarchyCache } from "~/contexts/MetricContext"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import {
  useSelectedCategory,
  useSelectedCategories,
  useIsCategorySelected,
  useSelectCategories,
  useDeselectCategories,
  useResetSelection
} from "~/state/stores/selection"
import { cn } from "~/styling"
import { feature_flags } from "~/feature_flags"
import { PointLegendDistBar } from "~/components/legend/PointLegendDistBar"
import { MULTIPLE_CONTRIBUTORS } from "~/const"
import { useQueryState } from "nuqs"
import { createMetricDataForNode, Metrics } from "~/metrics/metrics"
import { useMetricSearchContext } from "~/components/inspection/MetricInspectionPanel"
import { useClickedObject } from "~/state/stores/clicked-object"

const ITEMS_PER_PAGE = 10

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
  const { searchValue } = useMetricSearchContext()
  const data = useData()

  const { metricType, topContributorCutoff } = useOptions()
  const clickedObject = useClickedObject()
  const hierarchyCache = useMetricsHierarchyCache()
  const isCategorySelected = useIsCategorySelected()
  const [path] = useQueryState("path")
  const resetSelection = useResetSelection()
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    resetSelection()
  }, [path, resetSelection])

  // Reset to first page when search changes
  useEffect(() => {
    startTransition(() => {
      setCurrentPage(0)
    })
  }, [searchValue])

  const metricCache = useMemo(() => {
    const cacheKey = clickedObject ? clickedObject.path : data.databaseInfo.fileTree.path

    // Try to get from hierarchy cache first
    const cachedMetricsData = hierarchyCache.get(cacheKey)
    if (cachedMetricsData) {
      return cachedMetricsData.caches.get(metricType)
    }

    // Fallback: calculate on the fly (for nodes not in the pre-computed hierarchy)
    const subtreeRoot = clickedObject ?? data.databaseInfo.fileTree
    return createMetricDataForNode(
      data,
      subtreeRoot,
      data.databaseInfo.colorSeed,
      data.databaseInfo.contributorColors,
      topContributorCutoff
    ).caches.get(metricType)
  }, [clickedObject, data, metricType, topContributorCutoff, hierarchyCache])

  if (metricCache === undefined) throw new Error("Metric cache is undefined")

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  const totalWeight = items.reduce((sum, [, info]) => sum + info.weight, 0)

  const matchesSearch = (label: string) => label.toLowerCase().includes(searchValue.toLowerCase())

  const filteredItems = searchValue.length > 0 ? items.filter(([label]) => matchesSearch(label)) : items

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const safePage = Math.min(currentPage, totalPages - 1)
  const startIdx = safePage * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const shownItems = filteredItems.slice(startIdx, endIdx)

  if (items.length === 0) return null

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn("border-border dark:border-border-dark flex flex-wrap gap-0.5 rounded-lg border p-2", {
          hidden: !feature_flags.show_legend_highlight
        })}
      >
        {items
          .filter(([label]) => isCategorySelected(label))
          .map(([label, info]) => (
            <div key={label} title={label} className="flex items-center truncate text-sm">
              <LegendDot dotColor={info.color} />
              {label}
            </div>
          ))}
      </div>
      <div className="flex flex-col gap-2">
        <PointLegendDistBar items={items} totalWeight={totalWeight} />
      </div>
      <div className="mt-2 grid grid-cols-[min-content_4fr_max-content_max-content_max-content] items-center justify-between gap-x-4 gap-y-1">
        <div className="contents text-xs font-bold">
          <div />
          <p>{Metrics[metricType].name}</p>
          <p className="text-right"># Files</p>
          <p className="text-right">% Files</p>
          <div />
        </div>
        <span className="bg-border dark:bg-border-dark col-span-full my-1 h-0.5 w-full" />

        {shownItems.map(([label, info]) => (
          <PointLegendEntry key={label} label={label} info={info} totalWeight={totalWeight} />
        ))}

        {totalPages > 1 ? (
          <div className="col-span-full flex items-center justify-between gap-2 pt-2">
            <button disabled={safePage === 0} className="btn text-xs" title="Previous page" onClick={handlePrevPage}>
              ← Prev
            </button>
            <span className="text-secondary-text text-xs">
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              disabled={safePage === totalPages - 1}
              className="btn text-xs"
              title="Next page"
              onClick={handleNextPage}
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PointLegendEntry({ label, info, totalWeight }: { label: string; info: PointInfo; totalWeight: number }) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  const selectedCategories = useSelectedCategories()

  const selectCategories = useSelectCategories()
  const deselectCategories = useDeselectCategories()

  const { isSelected } = useSelectedCategory()

  const isOnlySelectedCategory = isSelected(label) && selectedCategories.length === 1
  const noSelectedCategories = selectedCategories.length === 0

  const labelIsSelected = isSelected(label)
  const dotColor = info.color

  return (
    <>
      <CheckboxWithLabel
        key={String(labelIsSelected)}
        className="contents"
        checkBoxClassName=" ml-auto"
        intermediate={noSelectedCategories}
        checked={labelIsSelected}
        onChange={(evt) => {
          if (evt.target.checked) {
            selectCategories([label, ...(info.children ? Array.from(info.children.keys()) : [])])
          } else {
            deselectCategories([label, ...(info.children ? Array.from(info.children.keys()) : [])])
          }
        }}
      >
        {isAuthorRelatedLegend ? (
          <LegendDot key={dotColor} dotColor={dotColor} contributorColorToChange={label} />
        ) : (
          <LegendDot key={dotColor} dotColor={dotColor} />
        )}
        <span
          className={cn("truncate font-bold", {
            "text-blue-primary": labelIsSelected,
            "italic underline": label === "Other" || label === MULTIPLE_CONTRIBUTORS
          })}
          title={
            noSelectedCategories
              ? `Highlight ${label} exclusively`
              : isOnlySelectedCategory
                ? "Highlight all categories"
                : labelIsSelected
                  ? `Remove ${label} from filter`
                  : `Add ${label} to filter`
          }
        >
          {label}
        </span>
        <span className="text-right text-xs font-normal">{info.weight.toLocaleString()}</span>
        <span className="text-right text-xs font-normal">
          {((info.weight / totalWeight) * 100).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}
          %
        </span>
      </CheckboxWithLabel>
    </>
  )
}
