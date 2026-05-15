import { create } from "zustand"
import { Metrics, type MetricType } from "~/metrics/metrics"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { LayoutGroups, type LayoutType } from "~/layouts/layouts"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"

const Hierarchy = {
  NESTED: "Nested",
  FLAT: "Flat"
} as const

type HierarchyType = keyof typeof Hierarchy

type Options = {
  hasLoadedSavedOptions: boolean
  metricType: MetricType
  chartType: LayoutType
  hierarchyType: HierarchyType
  commitSearch: string
  sizeMetric: SizeMetricType
  transitionsEnabled: boolean
  labelsVisible: boolean
  renderCutOff: number
  showFilesWithoutChanges: boolean
  topContributorCutoff: number
  linkMetricAndSizeMetric: boolean
  /**
   * Whether to show the percentage slider in the Top Contributor inspection
   */
  showTopContributorSlider: boolean
  /**
   * When searching, hide files that do not match the search query
   */
  showOnlySearchMatches: boolean
}

type OptionsContextType = Options & {
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: LayoutType) => void
  setSizeMetricType: (sizeMetricType: SizeMetricType) => void
  setTransitionsEnabled: (transitionsEnabled: boolean) => void
  setLabelsVisible: (labelsVisible: boolean) => void
  setHierarchyType: (hierarchyType: HierarchyType) => void
  setCommitSearch: (commitSearch: string) => void
  setRenderCutOff: (renderCutoff: number) => void
  setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) => void
  setTopContributorCutoff: (topContributorCutoff: number) => void
  setLinkMetricAndSizeMetric: (link: boolean) => void
  setShowTopContributorSlider: (show: boolean) => void
  setShowOnlySearchMatches: (showOnlySearchMatches: boolean) => void
}

const defaultOptions: Options = {
  hasLoadedSavedOptions: false,
  metricType: Object.keys(Metrics)[0] as MetricType,
  chartType: Object.keys(LayoutGroups)[0] as LayoutType,
  hierarchyType: Object.keys(Hierarchy)[0] as HierarchyType,
  sizeMetric: Object.keys(SizeMetric)[0] as SizeMetricType,
  commitSearch: "",
  transitionsEnabled: true,
  labelsVisible: true,
  renderCutOff: 2,
  showFilesWithoutChanges: true,
  topContributorCutoff: 0,
  linkMetricAndSizeMetric: false,
  showTopContributorSlider: false,
  showOnlySearchMatches: false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getSavedOptions(): Partial<Options> {
  if (typeof document === "undefined") {
    return {}
  }

  const savedOptions = localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY)
  if (!savedOptions) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(savedOptions)
    if (!isRecord(parsed)) {
      return {}
    }

    return parsed as Partial<Options>
  } catch {
    return {}
  }
}

function getInitialOptions(): Options {
  const savedOptions = getSavedOptions()
  return {
    ...defaultOptions,
    ...savedOptions,
    hasLoadedSavedOptions: Object.keys(savedOptions).length > 0
  }
}

const useOptionsStore = create<OptionsContextType>()((set) => ({
  ...getInitialOptions(),
  setMetricType: (metricType: MetricType) => set({ metricType }),
  setChartType: (chartType: LayoutType) => set({ chartType }),
  setSizeMetricType: (sizeMetric: SizeMetricType) => set({ sizeMetric }),
  setTransitionsEnabled: (transitionsEnabled: boolean) => set({ transitionsEnabled }),
  setLabelsVisible: (labelsVisible: boolean) => set({ labelsVisible }),
  setHierarchyType: (hierarchyType: HierarchyType) => set({ hierarchyType }),
  setCommitSearch: (commitSearch: string) => set({ commitSearch }),
  setRenderCutOff: (renderCutOff: number) => set({ renderCutOff }),
  setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) => set({ showFilesWithoutChanges }),
  setTopContributorCutoff: (topContributorCutoff: number) => set({ topContributorCutoff }),
  setLinkMetricAndSizeMetric: (linkMetricAndSizeMetric: boolean) => set({ linkMetricAndSizeMetric }),
  setShowTopContributorSlider: (showTopContributorSlider: boolean) => set({ showTopContributorSlider }),
  setShowOnlySearchMatches: (showOnlySearchMatches: boolean) => set({ showOnlySearchMatches })
}))

export const useOptions = () => useOptionsStore()

export const getDefaultOptionsContextValue = (): Options => ({ ...defaultOptions })
