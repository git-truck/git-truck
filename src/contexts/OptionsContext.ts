import { createContext, useContext } from "react"
import type { AuthorshipType, MetricType } from "../metrics/metrics"
import { Authorship, Metric } from "../metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/analyzer/constants"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
}

export type ChartType = keyof typeof Chart

export type Options = {
  metricType: MetricType
  chartType: ChartType
  authorshipType: AuthorshipType
  transitionsEnabled: boolean
  labelsVisible: boolean
}

type OptionKeys = keyof Options

export type OptionsContextType = Options & {
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setAuthorshipType: (authorshipType: AuthorshipType) => void
  setTransitionsEnabled: (transitionsEnabled: boolean) => void
  setLabelsVisible: (labelsVisible: boolean) => void
}

export const OptionsContext = createContext<OptionsContextType | undefined>(undefined)

export function useOptions() {
  const context = useContext(OptionsContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}

export function getDefaultOptions(): OptionsContextType {
  const savedOptions = getSavedOptionsOrDefault()

  return {
    ...savedOptions,
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
    setAuthorshipType: () => {
      throw new Error("No AuthorshipTypeSetter provided")
    },
    setTransitionsEnabled: () => {
      throw new Error("No transitionsEnabledSetter provided")
    },
    setLabelsVisible: () => {
      throw new Error("No labelsVisibleSetter provided")
    },
  }
}

function getSavedOptionsOrDefault(): Options {
  let options: Options = {
    metricType: Object.keys(Metric)[0] as MetricType,
    chartType: Object.keys(Chart)[0] as ChartType,
    authorshipType: Object.keys(Authorship)[0] as AuthorshipType,
    transitionsEnabled: true,
    labelsVisible: true,
  }

  try {
    const newLocal = localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY)
    if (!newLocal) return options
    const savedOptions = JSON.parse(newLocal) as Options

    Object.entries(savedOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        options = { ...options, [key]: value }
      }
    })
  } finally {
    return options
  }
}
