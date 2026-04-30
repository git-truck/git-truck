import { useEffect, useMemo } from "react"
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
import { createMetricDataForNode, Metrics, type MetricType } from "~/metrics/metrics"
import { useMetricSearchContext } from "~/components/inspection/MetricInspectionPanel"
import { useClickedObject } from "~/state/stores/clicked-object"
import { Icon } from "~/components/Icon"
import { mdiCheckboxIntermediate, mdiDice5 } from "@mdi/js"
import { ShuffleColorsForm } from "~/components/forms/ShuffleColorsForm"
import { useNavigation } from "react-router"
import { PaginatedList } from "~/components/inspection/util/PaginatedList"

const ITEMS_PER_PAGE = 8

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

export type PointLegendData = {
  entries: Map<string, PointInfo>
  totalWeight: number
}

export function PointLegend() {
  const { searchValue } = useMetricSearchContext()
  const data = useData()

  const { metricType, topContributorCutoff } = useOptions()
  const clickedObject = useClickedObject()
  const hierarchyCache = useMetricsHierarchyCache()
  const isCategorySelected = useIsCategorySelected()
  const [path] = useQueryState("path")
  const resetSelection = useResetSelection()

  useEffect(() => {
    resetSelection()
  }, [path, resetSelection])

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

  const legendData = metricCache.legend as PointLegendData

  const items = Array.from(legendData.entries).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  //Differentiate summed weight (entries accumulated), vs total weight (actual amount of entries)
  const summedWeight = items.reduce((sum, [, info]) => sum + info.weight, 0)
  const totalWeight = legendData.totalWeight

  const matchesSearch = (label: string) => label.toLowerCase().includes(searchValue.toLowerCase())

  const filteredItems = searchValue.length > 0 ? items.filter(([label]) => matchesSearch(label)) : items

  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
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
        {/* DISTBAR still uses summed weight of items, as it cannot distribute width when weight > 100% */}
        <PointLegendDistBar items={items} totalWeight={summedWeight} />
      </div>
      <PaginatedList
        items={filteredItems}
        itemsPerPage={ITEMS_PER_PAGE}
        originalItemsCount={items.length}
        itemHeight={22}
        headerHeight={54}
      >
        {(shownItems, { totalPages }) => (
          <>
            <PointLegendTable
              items={shownItems}
              totalWeight={totalWeight}
              metricType={metricType}
              maxTotalPages={totalPages}
            />
          </>
        )}
      </PaginatedList>
    </div>
  )
}

const GRID_COLS = "grid-cols-[min-content_4fr_max-content_max-content_max-content]"

function PointLegendHeader({ metricType }: { metricType: MetricType }) {
  const navigationState = useNavigation().state
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR" || metricType === "CONTRIBUTORS"

  return (
    <>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
      <div className="text-primary-text dark:text-primary-text-dark contents text-sm font-bold">
        <ShuffleColorsForm>
          <button
            disabled={!isAuthorRelatedLegend}
            className={cn("btn--icon m-0 mt-1 h-min text-xs", {
              "opacity-0": !isAuthorRelatedLegend
            })}
            title="Shuffle contributor colors"
          >
            <Icon
              className={cn("transition-transform duration-100 hover:rotate-20", {
                "animate-spin transition-all starting:rotate-0": navigationState !== "idle"
              })}
              path={mdiDice5}
              size="1.5em"
            />
          </button>
        </ShuffleColorsForm>
        <p>{Metrics[metricType as keyof typeof Metrics].name}</p>
        <p className="text-right text-xs"># Files</p>
        <p className="min-w-12 text-right text-xs">% Files</p>
        <Icon path={mdiCheckboxIntermediate} size={1} className="justify-self-end opacity-0" />
      </div>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
    </>
  )
}

function PointLegendTable({
  items,
  totalWeight,
  metricType
}: {
  items: [string, PointInfo][]
  totalWeight: number
  metricType: MetricType
  maxTotalPages: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("grid items-center justify-between gap-x-4", GRID_COLS)}>
        <PointLegendHeader metricType={metricType} />
      </div>

      {items.length === 0 ? (
        <div className="text-tertiary-text dark:text-tertiary-text-dark flex items-center justify-center text-sm">
          No items matched your search
        </div>
      ) : (
        <div className={cn("grid items-center justify-between gap-x-4", GRID_COLS)}>
          {items.map(([label, info]) => (
            <PointLegendEntry key={label} label={label} info={info} totalWeight={totalWeight} />
          ))}
        </div>
      )}
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
    <div className="group/pointentry contents">
      <CheckboxWithLabel
        key={String(labelIsSelected)}
        className="contents"
        checkBoxClassName={cn("ml-auto transition-opacity duration-200 group-hover/pointentry:opacity-100", {
          "opacity-15": !noSelectedCategories && !labelIsSelected
        })}
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
          <LegendDot
            key={dotColor}
            dotColor={dotColor}
            contributorColorToChange={label}
            className={cn("transition-opacity duration-50 group-hover/pointentry:opacity-100", {
              "opacity-15": !noSelectedCategories && !labelIsSelected
            })}
          />
        ) : (
          <LegendDot
            key={dotColor}
            dotColor={dotColor}
            className={cn("transition-opacity duration-50 group-hover/pointentry:opacity-100", {
              "opacity-15": !noSelectedCategories && !labelIsSelected
            })}
          />
        )}
        <span
          className={cn(
            "group-hover/pointentry:text-blue-primary truncate font-bold transition-opacity duration-200 group-hover/pointentry:opacity-100",
            {
              "text-secondary-text dark:text-secondary-text-dark": !labelIsSelected,
              "opacity-15": !noSelectedCategories && !labelIsSelected,
              "italic underline": label === "Other" || label === MULTIPLE_CONTRIBUTORS
            }
          )}
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
        <span
          className={cn(
            "text-tertiary-text dark:text-tertiary-text-dark text-right text-xs transition-opacity duration-200 group-hover/pointentry:opacity-100",
            {
              "opacity-15": !noSelectedCategories && !labelIsSelected
            }
          )}
        >
          {info.weight.toLocaleString()}
        </span>
        <span
          className={cn(
            "text-tertiary-text dark:text-tertiary-text-dark min-w-12 text-right text-xs transition-opacity duration-50 group-hover/pointentry:opacity-100",
            {
              "opacity-15": !noSelectedCategories && !labelIsSelected
            }
          )}
        >
          {((info.weight / totalWeight) * 100).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}
          %
        </span>
      </CheckboxWithLabel>
    </div>
  )
}
