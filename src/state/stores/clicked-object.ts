import { useQueryStates } from "nuqs"
// import { create } from "zustand"
import { useData, useDataNullable } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/view"
import type { GitObject } from "~/shared/model"

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

  const clickedObjectState = qs.objectHash ? data.databaseInfo.objectMap[qs.objectHash] : undefined

  const rootTree = useData().databaseInfo.fileTree
  // const clickedObjectState = useClickedObjectStore((state) => state.clickedObject)

  return clickedObjectState ?? rootTree
}

export const useClickedObjectNullable = () => {
  const data = useDataNullable()
  const [qs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  const clickedObjectState = data && qs.objectHash ? data.databaseInfo.objectMap[qs.objectHash] : undefined

  if (!data) {
    return null
  }
  const rootTree = data.databaseInfo.fileTree
  return clickedObjectState ?? rootTree
}

export const useSetClickedObject = () => {
  const [qs, setQs] = useQueryStates(viewSearchParamsConfig, { shallow: false })

  return (clickedObject: GitObject | null) => {
    console.log("clickedObject?.hash", clickedObject?.hash)
    setQs({
      ...qs,
      objectHash: clickedObject?.hash ?? null,
      objectPath: clickedObject?.path ?? null
    })
    // useClickedObjectStore.getState().setClickedObject(clickedObject)
  }
}
