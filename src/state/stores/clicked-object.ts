import { useQueryState, useQueryStates } from "nuqs"
import { missingInMapColor } from "~/const"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { FileSizeMetric } from "~/metrics/fileSize"
import { LastChangedMetric } from "~/metrics/lastChanged"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import type { MetricCache } from "~/metrics/metrics"
import { CommitsMetric } from "~/metrics/mostCommits"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { ClickedObjectInfo, GitObjectNoChildren, HexColor, RawGitObject } from "~/shared/model"
import { isTree } from "~/shared/util"
import { useSelectedCategories, useIsCategorySelected } from "~/state/stores/selection"

export const useClickedObject = (): GitObjectNoChildren => {
  const data = useData()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = qs.objectPath ? data.databaseInfo.objectPathMap[qs.objectPath] : undefined
  const zoomedObjectState = qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined
  const rootTree = data.databaseInfo.fileTree

  return clickedObjectState ?? zoomedObjectState ?? rootTree
}

export const useClickedObjectPath = (): string => {
  const data = useData()
  const [qs] = useQueryStates(
    {
      objectPath: viewSearchParamsConfig.objectPath,
      zoomPath: viewSearchParamsConfig.zoomPath
    },
    { shallow: false }
  )

  return qs.objectPath ?? qs.zoomPath ?? data.databaseInfo.repo
}

export const useClickedObjectNullable = () => {
  const data = useDataNullable()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = data && qs.objectPath ? data.databaseInfo.objectPathMap[qs.objectPath] : undefined
  const zoomedObjectState = data && qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined

  if (!data) {
    return null
  }
  const rootTree = data.databaseInfo.fileTree
  return clickedObjectState ?? zoomedObjectState ?? rootTree
}

export const useSetClickedObjectPath = () => {
  const [, setObjectPath] = useQueryState("objectPath", viewSearchParamsConfig.objectPath)

  return (clickedObjecPath: string | null) => {
    setObjectPath(clickedObjecPath ?? null)
  }
}

export const useClickedObjectIsZoomPath = () => {
  const clickedObjectPath = useClickedObjectPath()
  const [zoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)
  return clickedObjectPath === zoomPath
}

export function useBlobColor(obj: RawGitObject | null): HexColor | null {
  const colors = useBlobColors(obj)
  const color = colors.length > 0 ? colors[0] : missingInMapColor
  return color
}

export function useBlobColors(obj: RawGitObject | null): Array<HexColor> {
  const selectedCategories = useSelectedCategories()
  const isSelected = useIsCategorySelected()

  const { metricType } = useOptions()
  const noCategoriesSelected = selectedCategories.filter((c) => c.startsWith(`${metricType}:`)).length === 0
  const [metricsData] = useMetrics()

  if (!obj) {
    return [missingInMapColor]
  }

  const colors: Array<HexColor> = [metricsData.get(metricType)]
    .flatMap(
      (c) => c?.categoriesMap?.get(obj.path)?.filter((c) => isSelected(c.category) || noCategoriesSelected) ?? []
    )
    .map((c) => c.color)

  if (!colors || colors.length === 0) {
    return [missingInMapColor]
  }
  return colors
}

function useObjectColors(obj: RawGitObject | null, clickedObjectInfo: ClickedObjectInfo | null): Array<HexColor> {
  const data = useDataNullable()
  const { metricType } = useOptions()
  const [metricsData, contributorColors] = useMetrics()

  if (!obj || !data) {
    return [missingInMapColor]
  }

  if (isTree(obj)) {
    return [missingInMapColor]
  }

  const commitCount = clickedObjectInfo?.amountOfCommits
  const getCachedColors = (cache: MetricCache | undefined): Array<HexColor> | null => {
    const colors = cache?.categoriesMap.get(obj.path)?.map((c) => c.color)
    return colors && colors.length > 0 ? colors : null
  }

  const colorMap = {
    FILE_TYPE: () => getCachedColors(metricsData.get("FILE_TYPE")) ?? [missingInMapColor],
    FILE_SIZE: () => {
      const metricCache = metricsData.get("FILE_SIZE")
      const cachedColors = getCachedColors(metricCache)
      if (cachedColors) return cachedColors

      const buckets = metricCache?.buckets ?? FileSizeMetric.getBuckets(data.databaseInfo)
      const fileSizeBucketIndex = FileSizeMetric.getBucketIndex(obj, data.databaseInfo, buckets)
      return [buckets[fileSizeBucketIndex]?.color ?? missingInMapColor]
    },
    MOST_COMMITS: () => [
      CommitsMetric.getColorFromValue(
        commitCount ?? 0,
        data.databaseInfo,
        metricsData.get("MOST_COMMITS") as MetricCache
      )
    ],
    TOP_CONTRIBUTOR: () => [
      clickedObjectInfo && clickedObjectInfo.topContributor.length > 0
        ? clickedObjectInfo.multiTopContributors
          ? missingInMapColor
          : (contributorColors.get(clickedObjectInfo.topContributor[0].contributor) as HexColor)
        : (missingInMapColor as HexColor)
    ],
    MOST_CONTRIBUTIONS: () => [
      LinesChangedMetric.getColorFromObject(
        obj,
        data.databaseInfo,
        metricsData.get("MOST_CONTRIBUTIONS") as MetricCache
      )
    ],
    LAST_CHANGED: () => {
      const metricCache = metricsData.get("LAST_CHANGED")
      const cachedColors = getCachedColors(metricCache)
      if (cachedColors) return cachedColors

      const buckets = metricCache?.buckets ?? LastChangedMetric.getBuckets(data.databaseInfo)
      return [buckets[LastChangedMetric.getBucketIndex(obj, data.databaseInfo, buckets)]?.color ?? missingInMapColor]
    },
    CONTRIBUTORS: () => [] as Array<HexColor>
  } as const

  return colorMap[metricType]()
}

export function useObjectColor(obj: RawGitObject | null, coi: ClickedObjectInfo | null): HexColor {
  const colors = useObjectColors(obj, coi)
  const color = colors.length === 1 ? colors[0] : missingInMapColor
  return color
}
