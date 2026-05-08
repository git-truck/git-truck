import { create } from "zustand"
import type { RawGitObject } from "~/shared/model"

type HoveredObjectState = {
  hoveredObject: RawGitObject | null
  setHoveredObject: (hoveredObject: RawGitObject | null) => void
  resetHoveredObject: () => void
}

const useHoveredObjectStore = create<HoveredObjectState>()((set) => ({
  hoveredObject: null,
  setHoveredObject: (hoveredObject: RawGitObject | null) => {
    return set({ hoveredObject })
  },
  resetHoveredObject: () => set({ hoveredObject: null })
}))

export const useHoveredObject = () => useHoveredObjectStore((state) => state.hoveredObject)
export const useSetHoveredObject = () => useHoveredObjectStore((state) => state.setHoveredObject)
