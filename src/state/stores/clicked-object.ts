import { create } from "zustand"
import { useData, useDataNullable } from "~/contexts/DataContext"
import type { GitObject } from "~/shared/model"

type ClickedObjectState = {
  clickedObject: GitObject | null
  setClickedObject: (clickedObject: GitObject | null) => void
  resetClickedObject: () => void
}

const useClickedObjectStore = create<ClickedObjectState>()((set) => ({
  clickedObject: null,
  setClickedObject: (clickedObject: GitObject | null) => {
    return set({ clickedObject })
  },
  resetClickedObject: () => set({ clickedObject: null })
}))

export const useClickedObject = () => {
  const repo = useData().databaseInfo.fileTree
  return useClickedObjectStore((state) => state.clickedObject) ?? repo
}

export const useClickedObjectNullable = () => {
  const clickedObjectFromStore = useClickedObjectStore((state) => state.clickedObject)
  const data = useDataNullable()

  if (!data) {
    return null
  }
  const repo = data.databaseInfo.fileTree
  return clickedObjectFromStore ?? repo
}

export const useSetClickedObject = () => useClickedObjectStore((state) => state.setClickedObject)
