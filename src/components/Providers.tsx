import { useEffect, useMemo, useState } from "react"
import type { GitBlobObject, GitObject } from "~/analyzer/model"
import { ClickedObjectContext } from "~/contexts/ClickedContext"
import type { RepoData } from "~/routes/$repo.$"
import { DataContext } from "../contexts/DataContext"
import { MetricsContext } from "../contexts/MetricContext"
import type {
  ChartType,
  CommitSortingMethodsType,
  CommitSortingOrdersType,
  HierarchyType,
  OptionsContextType
} from "../contexts/OptionsContext"
import { getDefaultOptionsContextValue, OptionsContext } from "../contexts/OptionsContext"
import { PathContext } from "../contexts/PathContext"
import { SearchContext } from "../contexts/SearchContext"
import type { MetricsData, MetricType } from "../metrics/metrics"
import { createMetricData } from "../metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/analyzer/constants"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import type { DepthType } from "~/metrics/chartDepth"
import type { CommitTab } from "~/contexts/CommitTabContext"
import { CommitTabContext, getDefaultCommitTab } from "~/contexts/CommitTabContext"

interface ProvidersProps {
  children: React.ReactNode
  data: RepoData
}

export function Providers({ children, data }: ProvidersProps) {
  const [options, setOptions] = useState<OptionsContextType | null>(null)
  const [commitTab, setCommitTab] = useState<CommitTab | null>(null)
  const [searchResults, setSearchResults] = useState<Record<string, GitObject>>({})
  const [path, setPath] = useState(data.repo.name)
  const [clickedObject, setClickedObject] = useState<GitObject | null>(null)

  const metricsData: MetricsData = useMemo(() => {
    console.time("metrics")
    const res = createMetricData(
      data,
      data.databaseInfo.colorSeed,
      data.databaseInfo.authorColors,
      options?.dominantAuthorCutoff ?? 70
    )
    console.timeEnd("metrics")
    return res
  }, [data, options?.dominantAuthorCutoff])

  const commitTabValue = useMemo(
    () => ({
      ...getDefaultCommitTab(),
      ...commitTab,
      setStartDate: (newDate: number | null) => {
        setCommitTab((prevValue) => ({
          ...(prevValue ?? getDefaultCommitTab()),
          startDate: newDate
        }))
      },
      setEndDate: (newDate: number | null) => {
        setCommitTab((prevValue) => ({
          ...(prevValue ?? getDefaultCommitTab()),
          endDate: newDate
        }))
      }
    }),
    [commitTab]
  )

  const optionsValue = useMemo<OptionsContextType>(
    () => ({
      ...getDefaultOptionsContextValue(),
      ...options,
      setMetricType: (metricType: MetricType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          metricType
        })),
      setChartType: (chartType: ChartType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          chartType
        })),
      setDepthType: (depthType: DepthType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          depthType
        })),
      setHierarchyType: (hierarchyType: HierarchyType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          hierarchyType
        })),
      setCommitSortingMethodsType: (commitSortingMethodsType: CommitSortingMethodsType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          commitSortingMethodsType
        })),
      setCommitSortingOrdersType: (commitSortingOrdersType: CommitSortingOrdersType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          commitSortingOrdersType
        })),
      setCommitSearch: (commitSearch: string) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          commitSearch
        })),
      setSizeMetricType: (sizeMetric: SizeMetricType) =>
        setOptions((prevOptions) => ({ ...(prevOptions ?? getDefaultOptionsContextValue()), sizeMetric })),
      setHoveredBlob: (blob: GitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          hoveredBlob: blob
        })),
      setClickedObject: (object: GitObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          clickedObject: object
        })),
      setTransitionsEnabled: (enabled: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          transitionsEnabled: enabled
        })),
      setLabelsVisible: (visible: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          labelsVisible: visible
        })),
      setRenderCutoff: (renderCutoff: number) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          renderCutoff: renderCutoff
        })),
      setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          showFilesWithoutChanges: showFilesWithoutChanges
        })),
      setDominantAuthorCutoff: (dominantAuthorCutoff: number) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          dominantAuthorCutoff: dominantAuthorCutoff
        })),
      setLinkMetricAndSizeMetric: (link: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
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

  useEffect(() => {
    const savedOptions = localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY)
    if (savedOptions) {
      setOptions({
        ...getDefaultOptionsContextValue(JSON.parse(savedOptions)),
        hasLoadedSavedOptions: true
      })
    }
  }, [])

  return (
    <DataContext.Provider value={data}>
      <MetricsContext.Provider value={metricsData}>
        <OptionsContext.Provider value={optionsValue}>
          <SearchContext.Provider
            value={{
              searchResults,
              setSearchResults
            }}
          >
            <PathContext.Provider value={{ path, setPath }}>
              <ClickedObjectContext.Provider value={{ clickedObject, setClickedObject }}>
                <CommitTabContext.Provider value={commitTabValue}>{children}</CommitTabContext.Provider>
              </ClickedObjectContext.Provider>
            </PathContext.Provider>
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricsContext.Provider>
    </DataContext.Provider>
  )
}
