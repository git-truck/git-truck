import { useQueryState, useQueryStates } from "nuqs"
import { missingInMapColor } from "~/const"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { GitObject, HexColor, RawGitObject } from "~/shared/model"
import { useSelectedCategories, useIsCategorySelected } from "~/state/stores/selection"

export const useClickedObject = (): GitObject => {
  const data = useData()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = qs.objectPath ? data.databaseInfo.objectPathMap[qs.objectPath] : undefined
  const zoomedObjectState = qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined
  const rootTree = data.databaseInfo.fileTree

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
