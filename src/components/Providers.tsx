import { useEffect, useMemo, useState } from "react"
import type { GitBlobObject, GitObject } from "~/shared/model"
import { ClickedObjectContext } from "~/contexts/ClickedContext"
import type { RepoData } from "~/shared/model"
import { DataContext } from "../contexts/DataContext"
import { MetricsContext } from "../contexts/MetricContext"
import type { ChartType, HierarchyType, Options, OptionsContextType } from "../contexts/OptionsContext"
import { getDefaultOptionsContextValue as getDefaultOptions, OptionsContext } from "../contexts/OptionsContext"
import { PathContext } from "../contexts/PathContext"
import { SearchContext } from "../contexts/SearchContext"
import type { MetricsData, MetricType } from "../metrics/metrics"
import { createMetricData } from "../metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/shared/constants"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import type { CommitTab } from "~/contexts/CommitTabContext"
import { CommitTabContext, getDefaultCommitTab } from "~/contexts/CommitTabContext"
import { usePrefersLightMode } from "~/styling"

interface ProvidersProps {
  children: React.ReactNode
  data: RepoData
}

export function Providers({ children, data }: ProvidersProps) {
  const [options, setOptions] = useState<Options>(getDefaultOptions())
  const [commitTab, setCommitTab] = useState<CommitTab | null>(null)
  const [searchResults, setSearchResults] = useState<Record<string, GitObject>>({})
  const [path, setPath] = useState(data.repo.name)
  const [clickedObject, setClickedObject] = useState<GitObject | null>(null)

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
      setClickedObject: (object: GitObject | null) =>
        setOptions((prevOptions) => ({
          ...prevOptions,
          clickedObject: object
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

  useEffect(() => {
    const savedOptions = localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY)
    if (savedOptions) {
      setOptions({
        ...getDefaultOptions(),
        ...JSON.parse(savedOptions),
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
