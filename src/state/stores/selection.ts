import { create } from "zustand"
import { useOptions } from "~/contexts/OptionsContext"

type SelectionState = {
  selectedCategories: Array<string>
  setSelectedCategories: (categories: Iterable<string>) => void
  selectCategory: (label: string) => void
  deselectCategory: (label: string) => void
  selectCategories: (labels: Iterable<string>) => void
  deselectCategories: (labels: Iterable<string>) => void
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
  selectCategories: (labels: Iterable<string>) =>
    set((state) => {
      const newSet = new Set(state.selectedCategories)
      for (const label of labels) {
        newSet.add(label)
      }
      return { selectedCategories: Array.from(newSet) }
    }),
  deselectCategories: (labels: Iterable<string>) =>
    set((state) => {
      const newSet = new Set(state.selectedCategories)
      for (const label of labels) {
        newSet.delete(label)
      }
      return { selectedCategories: Array.from(newSet) }
    }),
  resetSelection: () => set({ selectedCategories: [] })
}))

export const useSelectedCategories = () => {
  const { metricType } = useOptions()
  return useSelectionStore((state) => state.selectedCategories).filter((c) => c.startsWith(metricType + ":"))
}

export const useSelectedCategory = () => {
  const { metricType } = useOptions()

  const selectCategory = useSelectionStore((s) => s.selectCategory)
  const deselectCategory = useSelectionStore((s) => s.deselectCategory)
  const selectedCategories = useSelectionStore((s) => s.selectedCategories).filter((c) =>
    c.startsWith(metricType + ":")
  )

  const isSelected = (category: string) => selectedCategories.includes(`${metricType}:${category}`)
  const select = (category: string) => selectCategory(`${metricType}:${category}`)
  const deselect = (category: string) => deselectCategory(`${metricType}:${category}`)
  return {
    isSelected,
    select,
    deselect
  }
}

export const useSelectCategories = () => {
  const { metricType } = useOptions()
  const selectCategories = useSelectionStore((s) => s.selectCategories)
  return (categories: Iterable<string>) => selectCategories(Array.from(categories, (c) => `${metricType}:${c}`))
}

export const useDeselectCategories = () => {
  const { metricType } = useOptions()
  const deselectCategories = useSelectionStore((s) => s.deselectCategories)
  return (categories: Iterable<string>) => deselectCategories(Array.from(categories, (c) => `${metricType}:${c}`))
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
