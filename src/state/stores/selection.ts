import { useCallback } from "react"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import { useOptions } from "~/contexts/OptionsContext"

const categoriesConfig = parseAsArrayOf(parseAsString).withDefault([])

type WriteOnlyQueryParser<T> = {
  parse: (query: string) => T | null
  serialize?: (value: T) => string
  defaultValue: T
  eq?: (a: T, b: T) => boolean
}

type WriteOnlyQueryOptions = {
  clearOnDefault?: boolean
  history?: "push" | "replace"
}

type WriteOnlyQueryAction<T> = T | null | ((previousValue: T) => T | null)

function useWriteOnlyQueryState<T>(key: string, parser: WriteOnlyQueryParser<T>) {
  return useCallback(
    (action: WriteOnlyQueryAction<T>, options: WriteOnlyQueryOptions = {}) => {
      if (typeof window === "undefined") {
        return Promise.resolve(new URLSearchParams())
      }

      const url = new URL(window.location.href)
      const currentQuery = url.searchParams.get(key)
      const currentValue =
        currentQuery === null ? parser.defaultValue : (parser.parse(currentQuery) ?? parser.defaultValue)
      const nextValue = typeof action === "function" ? (action as (previousValue: T) => T | null)(currentValue) : action
      const clearOnDefault = options.clearOnDefault ?? true
      const isDefault =
        nextValue !== null &&
        (parser.eq ? parser.eq(nextValue, parser.defaultValue) : Object.is(nextValue, parser.defaultValue))

      if (nextValue === null || (clearOnDefault && isDefault)) {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, parser.serialize ? parser.serialize(nextValue) : String(nextValue))
      }

      if (options.history === "push") {
        window.history.pushState(window.history.state, "", url)
      } else {
        window.history.replaceState(window.history.state, "", url)
      }

      return Promise.resolve(url.searchParams)
    },
    [key, parser]
  )
}

const useUpdateCategories = () => useWriteOnlyQueryState("categories", categoriesConfig)

const useSelectStoredCategory = () => {
  const setCategories = useUpdateCategories()

  return useCallback(
    (label: string) =>
      setCategories((state) => {
        const newSet = new Set(state)
        newSet.add(label)
        return Array.from(newSet)
      }),
    [setCategories]
  )
}

const useDeselectStoredCategory = () => {
  const setCategories = useUpdateCategories()

  return useCallback(
    (label: string) =>
      setCategories((state) => {
        const newSet = new Set(state)
        newSet.delete(label)
        return Array.from(newSet)
      }),
    [setCategories]
  )
}

export const useSelectCategories = () => {
  const setCategories = useUpdateCategories()

  return useCallback(
    (labels: Iterable<string>) =>
      setCategories((state) => {
        const newSet = new Set(state)
        for (const label of labels) {
          newSet.add(label)
        }
        return Array.from(newSet)
      }),
    [setCategories]
  )
}

export const useDeselectCategories = () => {
  const setCategories = useUpdateCategories()

  return useCallback(
    (labels: Iterable<string>) =>
      setCategories((state) => {
        const newSet = new Set(state)
        for (const label of labels) {
          newSet.delete(label)
        }
        return Array.from(newSet)
      }),
    [setCategories]
  )
}

export const useResetSelection = () => {
  const setCategories = useUpdateCategories()
  return useCallback(() => setCategories([]), [setCategories])
}

export const useSelectedCategories = () => {
  const [categories] = useQueryState("categories", categoriesConfig)

  return categories
}

export const useSelectedCategory = () => {
  const [categories] = useQueryState("categories", categoriesConfig)

  const { metricType } = useOptions()

  const selectCategory = useSelectStoredCategory()
  const deselectCategory = useDeselectStoredCategory()
  const selectedCategories = categories.filter((c) => c.startsWith(metricType + ":"))

  const isSelected = (category: string) => selectedCategories.includes(category)
  const select = (category: string) => selectCategory(category)
  const deselect = (category: string) => deselectCategory(category)
  return {
    isSelected,
    select,
    deselect
  }
}

export const useIsCategorySelected = () => {
  const [categories] = useQueryState("categories", categoriesConfig)

  const selectedCategories = categories

  return (category: string) => selectedCategories.includes(category) || selectedCategories.length === 0
}

export const useHasSelection = () => {
  const selectedCategories = useSelectedCategories()
  return selectedCategories.length > 0
}
