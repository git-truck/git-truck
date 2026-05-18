import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { GitObject, GitTreeObject, ObjectPathMap, RepoData } from "~/shared/model"
import { DataContext } from "~/contexts/DataContext"
import { MetricsContext, type MetricsContextValue } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { SearchContext } from "~/contexts/SearchContext"
import { createMetricData } from "~/metrics/metrics"
import { buildMetricsHierarchyCache } from "~/metrics/cache"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"
import { findSubTree } from "~/shared/util"
import { createObjectPathMap } from "~/shared/utils/tree"
import { useQueryState } from "nuqs"
import { METRICS_HIERARCHY_CACHE_DEPTH } from "~/const"

const objectPathMapCache = new Map<string, ObjectPathMap>()

function getObjectPathMap(fileTree: GitTreeObject): ObjectPathMap {
  const cachedObjectPathMap = objectPathMapCache.get(fileTree.hash)
  if (cachedObjectPathMap) {
    return cachedObjectPathMap
  }

  const objectPathMap = createObjectPathMap(fileTree)
  objectPathMapCache.set(fileTree.hash, objectPathMap)
  return objectPathMap
}

export function Providers({ children, data }: { children: ReactNode; data: RepoData }) {
  const options = useOptions()

  const [searchResults, setSearchResults] = useState<Record<string, GitObject>>({})
  const hasSearchResults = useMemo(() => Object.values(searchResults).length > 0, [searchResults])

  const [zoomPath] = useQueryState("zoomPath")
  const objectPathMap = useMemo(() => getObjectPathMap(data.databaseInfo.fileTree), [data.databaseInfo.fileTree.hash])

  const zoomedTree = useMemo(
    () => findSubTree(data.databaseInfo.fileTree, zoomPath ?? undefined),
    [data.databaseInfo.fileTree.hash, zoomPath]
  )

  // Database info representing the current view (filtered + zoomed)
  const viewDatabaseInfo = useMemo(
    () => ({ ...data.databaseInfo, fileTree: zoomedTree, objectPathMap }),
    [data.databaseInfo, objectPathMap, zoomedTree]
  )

  // Build the hierarchy cache from the filtered root (not the zoomed view)
  const hierarchyCache = useMemo(() => {
    const dataWithFilteredDb = data
    return buildMetricsHierarchyCache(
      dataWithFilteredDb,
      data.databaseInfo.colorSeed,
      data.databaseInfo.contributorColors,
      options.topContributorCutoff ?? 70,
      METRICS_HIERARCHY_CACHE_DEPTH
    )
  }, [data, options.topContributorCutoff])

  const metricsContextValue = useMemo<MetricsContextValue>(() => {
    const rootPath = zoomPath ?? data.databaseInfo.fileTree.path
    const cachedMetrics = hierarchyCache.get(rootPath)
    if (cachedMetrics) {
      return { metricsData: cachedMetrics, hierarchyCache }
    }

    // Fallback: calculate metrics for the current view
    const metricsData = createMetricData(
      { ...data, databaseInfo: viewDatabaseInfo },
      data.databaseInfo.colorSeed,
      data.databaseInfo.contributorColors,
      options.topContributorCutoff ?? 70
    )

    return { metricsData, hierarchyCache }
  }, [zoomPath, hierarchyCache, data, viewDatabaseInfo, options.topContributorCutoff])

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
        <SearchContext.Provider
          value={{
            searchResults,
            hasSearchResults,
            setSearchResults
          }}
        >
          {children}
        </SearchContext.Provider>
      </MetricsContext.Provider>
    </DataContext.Provider>
  )
}
