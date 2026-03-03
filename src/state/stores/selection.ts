import { create } from "zustand"
import { useOptions } from "~/contexts/OptionsContext"

type SelectionState = {
  selectedCategories: Array<string>
  setSelectedCategories: (categories: Iterable<string>) => void
  selectCategory: (label: string) => void
  deselectCategory: (label: string) => void
  resetSelection: () => void
}

const useSelectionStore = create<SelectionState>()((set) => ({
  selectedCategories: [],
  setSelectedCategories: (categories: Iterable<string>) => set({ selectedCategories: Array.from(categories) }),
  selectCategory: (label: string) =>
    set((state) => {
      const newSet = new Set(state.selectedCategories)
      newSet.add(label)
      return { selectedCategories: Array.from(newSet) }
    }),
  deselectCategory: (label: string) =>
    set((state) => {
      const newSet = new Set(state.selectedCategories)
      newSet.delete(label)
      return { selectedCategories: Array.from(newSet) }
    }),
  resetSelection: () => set({ selectedCategories: [] })
}))

export const useSelectedCategories = () => {
  const { metricType } = useOptions()
  return useSelectionStore((state) => state.selectedCategories).filter((c) => c.startsWith(metricType + ":"))
}

export const useSelectedCategory = (category: string) => {
  const { metricType } = useOptions()
  const selectedCategories = useSelectionStore((state) => state.selectedCategories)
  const count = selectedCategories.filter((c) => c === `${metricType}:${category}`).length

  const selected = selectedCategories.includes(`${metricType}:${category}`)
  const select = useSelectionStore((state) => state.selectCategory)
  const deselect = useSelectionStore((state) => state.deselectCategory)

  return {
    count,
    selected,
    select: () => select(`${metricType}:${category}`),
    deselect: () => deselect(`${metricType}:${category}`)
  }
}

export const useResetSelection = () => useSelectionStore((state) => state.resetSelection)

export const useIsCategorySelected = () => {
  const { metricType } = useOptions()

  const selectedCategories = useSelectionStore((s) => s.selectedCategories).filter((c) =>
    c.startsWith(metricType + ":")
  )

  return (category: string) =>
    selectedCategories.includes(`${metricType}:${category}`) || selectedCategories.length === 0
}
