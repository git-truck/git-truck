import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { GitBlobObject, GitObject, RepoData } from "~/shared/model"
import { DataContext } from "../contexts/DataContext"
import { MetricsContext } from "../contexts/MetricContext"
import type { ChartType, HierarchyType, Options, OptionsContextType } from "../contexts/OptionsContext"
import { getDefaultOptionsContextValue as getDefaultOptions, OptionsContext } from "../contexts/OptionsContext"
import { SearchContext } from "../contexts/SearchContext"
import type { MetricsData, MetricType } from "../metrics/metrics"
import { createMetricData } from "../metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { usePrefersLightMode } from "~/styling"

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

  const prefersLight = usePrefersLightMode()

  const metricsData: MetricsData = useMemo(() => {
    const res = createMetricData(
      data,
      data.databaseInfo.colorSeed,
      data.databaseInfo.authorColors,
      options?.dominantAuthorCutoff ?? 70,
      prefersLight
    )

    return res
  }, [data, options?.dominantAuthorCutoff, prefersLight])

  const optionsValue = useMemo<OptionsContextType>(
    () => ({
      ...options,
      setMetricType: (metricType: MetricType) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          metricType
        })),
      setChartType: (chartType: ChartType) =>
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
      setRenderCutoff: (renderCutoff: number) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          renderCutoff: renderCutoff
        })),
      setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          showFilesWithoutChanges: showFilesWithoutChanges
        })),
      setDominantAuthorCutoff: (dominantAuthorCutoff: number) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          dominantAuthorCutoff: dominantAuthorCutoff
        })),
      setLinkMetricAndSizeMetric: (link: boolean) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          linkMetricAndSizeMetric: link
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
    <DataContext.Provider value={data}>
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
