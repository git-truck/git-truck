import { useQueryState, useQueryStates } from "nuqs"
import { missingInMapColor } from "~/const"
// import { create } from "zustand"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { GitObject, HexColor, RawGitObject } from "~/shared/model"

// type ClickedObjectState = object
// {
// clickedObject: GitObject | null
// setClickedObject: (clickedObject: GitObject | null) => void
// resetClickedObject: () => void
// }

// const useClickedObjectStore = create<ClickedObjectState>()((set) => ({
//   // clickedObject: null
//   // setClickedObject: (clickedObject: GitObject | null) => {
//   //   return set({ clickedObject })
//   // },
//   // resetClickedObject: () => set({ clickedObject: null })
// }))

export const useClickedObject = (): GitObject => {
  const data = useData()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = qs.objectHash ? data.databaseInfo.objectHashMap[qs.objectHash] : undefined
  const zoomedObjectState = qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined

  const rootTree = useData().databaseInfo.fileTree
  // const clickedObjectState = useClickedObjectStore((state) => state.clickedObject)

  return clickedObjectState ?? zoomedObjectState ?? rootTree
}

export const useClickedObjectNullable = () => {
  const data = useDataNullable()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = data && qs.objectHash ? data.databaseInfo.objectHashMap[qs.objectHash] : undefined
  const zoomedObjectState = data && qs.zoomPath ? data.databaseInfo.objectPathMap[qs.zoomPath] : undefined

  if (!data) {
    return null
  }
  const rootTree = data.databaseInfo.fileTree
  return clickedObjectState ?? zoomedObjectState ?? rootTree
}

export const useSetClickedObject = () => {
  const [, setObjectHash] = useQueryState("objectHash", viewSearchParamsConfig.objectHash)

  return (clickedObject: GitObject | null) => {
    setObjectHash(clickedObject?.hash ?? null)
  }
}

export function useObjectColor(obj: RawGitObject | null): HexColor | null {
  const colors = useObjectColors(obj)
  const color = colors.length === 1 ? colors[0] : missingInMapColor
  return color
}

export function useObjectColors(obj: RawGitObject | null): Array<HexColor> {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const { databaseInfo } = useData()
  const hoveredObject = obj ? databaseInfo.objectHashMap[obj.hash] : null
  const colors = hoveredObject ? (metricsData.get(metricType)?.categoriesMap?.get(hoveredObject.path) ?? []) : []
  return colors.map((c) => c.color)
}
