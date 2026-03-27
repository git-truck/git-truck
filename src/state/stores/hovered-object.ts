import { create } from "zustand"
import type { GitObject } from "~/shared/model"

type HoveredObjectState = {
  hoveredObject: GitObject | null
  setHoveredObject: (hoveredObject: GitObject | null) => void
  resetHoveredObject: () => void
}

const useHoveredObjectStore = create<HoveredObjectState>()((set) => ({
  hoveredObject: null,
  setHoveredObject: (hoveredObject: GitObject | null) => {
    return set({ hoveredObject })
  },
  resetHoveredObject: () => set({ hoveredObject: null })
}))

export const useHoveredObject = () => useHoveredObjectStore((state) => state.hoveredObject)
export const useSetHoveredObject = () => useHoveredObjectStore((state) => state.setHoveredObject)
