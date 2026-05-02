import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { GitBlobObject, GitObject, RepoData } from "~/shared/model"
import { DataContext } from "~/contexts/DataContext"
import { MetricsContext, type MetricsContextValue } from "~/contexts/MetricContext"
import type { HierarchyType, Options, OptionsContextType } from "~/contexts/OptionsContext"
import { getDefaultOptionsContextValue as getDefaultOptions, OptionsContext } from "~/contexts/OptionsContext"
import { SearchContext } from "~/contexts/SearchContext"
import type { MetricType } from "~/metrics/metrics"
import { createMetricData } from "~/metrics/metrics"
import { buildMetricsHierarchyCache } from "~/metrics/cache"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { findSubTree } from "~/shared/util"
import { useQueryState } from "nuqs"
import type { LayoutType } from "~/layouts/layouts"
import { METRICS_HIERARCHY_CACHE_DEPTH } from "~/const"
import ignore from "ignore"
import { filterTree } from "~/shared/utils/tree"

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

  const filteredRootTree = useMemo(() => {
    const ig = ignore()
    ig.add(data.databaseInfo.hiddenFiles)
    return filterTree(data.databaseInfo.fileTree, (node) => !ig.ignores(node.path))
  }, [data.databaseInfo.fileTree, data.databaseInfo.hiddenFiles])

  // Database info representing the filtered repository root (used for building caches).
  const rootDatabaseInfo = useMemo(
    () => ({ ...data.databaseInfo, fileTree: filteredRootTree }),
    [data.databaseInfo, filteredRootTree]
  )

  const zoomedTree = useMemo(() => findSubTree(filteredRootTree, zoomPath ?? undefined), [filteredRootTree, zoomPath])

  // Database info representing the current view (filtered + zoomed)
  const viewDatabaseInfo = useMemo(
    () => ({ ...data.databaseInfo, fileTree: zoomedTree }),
    [data.databaseInfo, zoomedTree]
  )

  // Build the hierarchy cache from the filtered root (not the zoomed view)
  const hierarchyCache = useMemo(() => {
    const dataWithFilteredDb = { ...data, databaseInfo: rootDatabaseInfo }
    return buildMetricsHierarchyCache(
      dataWithFilteredDb,
      rootDatabaseInfo.colorSeed,
      rootDatabaseInfo.contributorColors,
      options?.topContributorCutoff ?? 70,
      METRICS_HIERARCHY_CACHE_DEPTH
    )
  }, [data, rootDatabaseInfo, options?.topContributorCutoff])

  const metricsContextValue = useMemo<MetricsContextValue>(() => {
    const rootPath = zoomPath ?? rootDatabaseInfo.fileTree.path
    const cachedMetrics = hierarchyCache.get(rootPath)
    if (cachedMetrics) {
      return { metricsData: cachedMetrics, hierarchyCache }
    }

    // Fallback: calculate metrics for the current view
    const metricsData = createMetricData(
      { ...data, databaseInfo: viewDatabaseInfo },
      rootDatabaseInfo.colorSeed,
      rootDatabaseInfo.contributorColors,
      options?.topContributorCutoff ?? 70
    )

    return { metricsData, hierarchyCache }
  }, [zoomPath, hierarchyCache, data, viewDatabaseInfo, rootDatabaseInfo, options?.topContributorCutoff])

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
        databaseInfo: viewDatabaseInfo
      }}
    >
      <MetricsContext.Provider value={metricsContextValue}>
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
