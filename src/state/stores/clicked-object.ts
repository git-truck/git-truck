import { useQueryState, useQueryStates } from "nuqs"
import { missingInMapColor } from "~/const"
// import { create } from "zustand"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { FileSizeMetric } from "~/metrics/fileSize"
import { LastChangedMetric } from "~/metrics/lastChanged"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import type { MetricCache } from "~/metrics/metrics"
import { CommitsMetric } from "~/metrics/mostCommits"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { GitObject, HexColor, RawGitObject } from "~/shared/model"
import { isTree } from "~/shared/util"

export const useClickedObject = (): GitObject => {
  const data = useData()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = qs.objectPath ? data.databaseInfo.objectPathMap[qs.objectPath] : undefined
  const zoomedObjectState = qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined

  const rootTree = useData().databaseInfo.fileTree
  // const clickedObjectState = useClickedObjectStore((state) => state.clickedObject)

  return clickedObjectState ?? zoomedObjectState ?? rootTree
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

export const useSetClickedObject = () => {
  const [, setObjectPath] = useQueryState("objectPath", viewSearchParamsConfig.objectPath)

  return (clickedObject: GitObject | null) => {
    setObjectPath(clickedObject?.path ?? null)
  }
}

export const useClickedObjectIsZoomPath = () => {
  const clickedObject = useClickedObject()
  const data = useData()
  const [zoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)

  const zoomedObjectState = zoomPath ? data.databaseInfo.objectPathMap[zoomPath] : undefined

  return clickedObject.path === zoomedObjectState?.path
}

export function useObjectColor(obj: RawGitObject | null): HexColor | null {
  const colors = useObjectColors(obj)
  const color = colors.length === 1 ? colors[0] : missingInMapColor
  return color
}

export function useObjectColors(obj: RawGitObject | null): Array<HexColor> {
  const data = useDataNullable()
  const { metricType } = useOptions()
  const [metricsData, contributorColors] = useMetrics()

  if (!obj || !data) {
    return [missingInMapColor]
  }

  const clickedObjectInfo = data.databaseInfo.clickedObjectInfo

  if (isTree(obj)) {
    return [missingInMapColor]
  }

  const fileSizeBucketIndex = FileSizeMetric.getBucketIndex(obj, data.databaseInfo)
  const commitCount = data.databaseInfo.clickedObjectInfo?.amountOfCommits

  const colorMap = {
    FILE_TYPE: () =>
      metricsData
        .get("FILE_TYPE")
        ?.categoriesMap?.get(obj.path)
        ?.map((c) => c.color) ?? [missingInMapColor],
    FILE_SIZE: () => [FileSizeMetric.getBuckets(data.databaseInfo)[fileSizeBucketIndex].color ?? missingInMapColor],
    MOST_COMMITS: () => [
      CommitsMetric.getColorFromValue(
        commitCount ?? 0,
        data.databaseInfo,
        metricsData.get("MOST_COMMITS") as MetricCache
      )
    ],
    TOP_CONTRIBUTOR: () => [
      clickedObjectInfo
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
    LAST_CHANGED: () => [
      LastChangedMetric.getBuckets(data.databaseInfo)[LastChangedMetric.getBucketIndex(obj, data.databaseInfo)]
        ?.color ?? missingInMapColor
    ],
    CONTRIBUTORS: () => [] as Array<HexColor>
  } as const

  return colorMap[metricType]()
  // const hoveredObject = obj ? databaseInfo.objectPathMap[obj.path] : null
  // const colors = hoveredObject ? (metricsData.get(metricType)?.categoriesMap?.get(hoveredObject.path) ?? []) : []
  // return colors.map((c) => c.color)
}
