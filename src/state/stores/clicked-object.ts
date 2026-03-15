import { create } from "zustand"
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

export const useClickedObject = () => useClickedObjectStore((state) => state.clickedObject)
export const useSetClickedObject = () => useClickedObjectStore((state) => state.setClickedObject)
