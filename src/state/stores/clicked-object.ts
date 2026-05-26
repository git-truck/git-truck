import { useQueryState, useQueryStates } from "nuqs"
import { missingInMapColor } from "~/const"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSearchParamsConfig } from "~/shared/viewParams"
import type { GitObjectNoChildren, HexColor, RawGitObject } from "~/shared/model"
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

  return qs.objectPath ?? qs.zoomPath ?? data.databaseInfo.fileTree.path
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
