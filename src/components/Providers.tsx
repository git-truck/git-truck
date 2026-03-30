import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { GitBlobObject, GitObject, RepoData } from "~/shared/model"
import { DataContext } from "~/contexts/DataContext"
import { MetricsContext } from "~/contexts/MetricContext"
import type { HierarchyType, Options, OptionsContextType } from "~/contexts/OptionsContext"
import { getDefaultOptionsContextValue as getDefaultOptions, OptionsContext } from "~/contexts/OptionsContext"
import { SearchContext } from "~/contexts/SearchContext"
import type { MetricsData, MetricType } from "~/metrics/metrics"
import { createMetricData } from "~/metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { findSubTree } from "~/shared/util"
import { useQueryState } from "nuqs"
import type { LayoutType } from "~/layouts/layouts"

export function Providers({ children, data }: { children: ReactNode; data: RepoData }) {
  const [options, setOptions] = useState<Options>(() => {
    const savedOptions = typeof document !== "undefined" ? localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY) : null
    return {
      ...getDefaultOptions(),
      ...(savedOptions ? JSON.parse(savedOptions) : {}),
      hasLoadedSavedOptions: !!savedOptions
    }
  })

  const [searchResults, setSearchResults] = useState<Record<string, GitObject>>({})
  const hasSearchResults = useMemo(() => Object.values(searchResults).length > 0, [searchResults])

  const [zoomPath] = useQueryState("zoomPath")

  const databaseInfo = useMemo(
    () => ({ ...data.databaseInfo, fileTree: findSubTree(data.databaseInfo.fileTree, zoomPath ?? undefined) }),
    [data.databaseInfo, zoomPath]
  )

  const metricsData: MetricsData = useMemo(() => {
    const res = createMetricData(
      { ...data, databaseInfo },
      data.databaseInfo.colorSeed,
      data.databaseInfo.contributorColors,
      options?.topContributorCutoff ?? 70
    )

    return res
  }, [data, databaseInfo, options?.topContributorCutoff])

  const optionsValue = useMemo<OptionsContextType>(
    () => ({
      ...options,
      setMetricType: (metric: MetricType) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          metricType: metric
        })),
      setChartType: (chartType: LayoutType) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          chartType
        })),

      setHierarchyType: (hierarchyType: HierarchyType) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          hierarchyType
        })),
      setCommitSearch: (commitSearch: string) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          commitSearch
        })),
      setSizeMetricType: (sizeMetric: SizeMetricType) => setOptions((prevOptions) => ({ ...prevOptions, sizeMetric })),
      setHoveredBlob: (blob: GitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          hoveredBlob: blob
        })),
      setTransitionsEnabled: (enabled: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          transitionsEnabled: enabled
        })),
      setLabelsVisible: (visible: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          labelsVisible: visible
        })),
      setRenderCutOff: (renderCutOff: number) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          renderCutOff
        })),
      setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          showFilesWithoutChanges: showFilesWithoutChanges
        })),
      setTopContributorCutoff: (topContributorCutoff: number) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          topContributorCutoff
        })),
      setLinkMetricAndSizeMetric: (link: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          linkMetricAndSizeMetric: link
        })),
      setShowOnlySearchMatches: (showOnlySearchMatches: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          showOnlySearchMatches: showOnlySearchMatches
        }))
    }),
    [options]
  )

  useEffect(() => {
    let canceled = false
    // Persist options to local storage
    if (options) {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => {
          if (canceled) return
          localStorage.setItem(OPTIONS_LOCAL_STORAGE_KEY, JSON.stringify(options))
        })
      } else {
        localStorage.setItem(OPTIONS_LOCAL_STORAGE_KEY, JSON.stringify(options))
      }
    }
    return () => {
      canceled = true
    }
  }, [options])

  return (
    <DataContext.Provider
      value={{
        ...data,
        databaseInfo: databaseInfo
      }}
    >
      <MetricsContext.Provider value={metricsData}>
        <OptionsContext.Provider value={optionsValue}>
          <SearchContext.Provider
            value={{
              searchResults,
              hasSearchResults,
              setSearchResults
            }}
          >
            {children}
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricsContext.Provider>
    </DataContext.Provider>
  )
}
