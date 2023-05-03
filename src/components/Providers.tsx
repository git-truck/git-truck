import { useEffect, useMemo, useState } from "react"
import type { HydratedGitBlobObject, HydratedGitObject } from "~/analyzer/model"
import { ClickedObjectContext } from "~/contexts/ClickedContext"
import type { RepoData } from "~/routes/$repo.$"
import { DataContext } from "../contexts/DataContext"
import { MetricsContext } from "../contexts/MetricContext"
import type { ChartType, OptionsContextType } from "../contexts/OptionsContext"
import { getDefaultOptionsContextValue, OptionsContext } from "../contexts/OptionsContext"
import { PathContext } from "../contexts/PathContext"
import { SearchContext } from "../contexts/SearchContext"
import type { AuthorshipType, MetricsData, MetricType } from "../metrics/metrics"
import { createMetricData as createMetricsData } from "../metrics/metrics"
import { OPTIONS_LOCAL_STORAGE_KEY } from "~/analyzer/constants"

interface ProvidersProps {
  children: React.ReactNode
  data: RepoData
}

export function Providers({ children, data }: ProvidersProps) {
  const [options, setOptions] = useState<OptionsContextType | null>(null)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<HydratedGitObject[]>([])
  const [path, setPath] = useState(data.repo.name)
  const [clickedObject, setClickedObject] = useState<HydratedGitObject | null>(null)

  const metricsData: MetricsData = useMemo(() => createMetricsData(data.analyzerData), [data])

  const optionsValue = useMemo(
    () => ({
      ...getDefaultOptionsContextValue(),
      ...options,
      setMetricType: (metricType: MetricType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          metricType,
        })),
      setChartType: (chartType: ChartType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          chartType,
        })),
      setAuthorshipType: (authorshipType: AuthorshipType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          authorshipType,
        })),
      setHoveredBlob: (blob: HydratedGitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          hoveredBlob: blob,
        })),
      setClickedObject: (object: HydratedGitObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          clickedObject: object,
        })),
      setTransitionsEnabled: (enabled: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          transitionsEnabled: enabled,
        })),
      setLabelsVisible: (visible: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptionsContextValue()),
          labelsVisible: visible,
        })),
    }),
    [options]
  )

  useEffect(() => {
    let canceled = false
    // Persist options to local storage
    if (options) {
      requestIdleCallback(() => {
        if (canceled) return
        localStorage.setItem(OPTIONS_LOCAL_STORAGE_KEY, JSON.stringify(options))
      })
    }
    return () => {
      canceled = true
    }
  }, [options])

  useEffect(() => {
    const savedOptions = localStorage.getItem(OPTIONS_LOCAL_STORAGE_KEY)
    if (savedOptions) {
      setOptions(getDefaultOptionsContextValue(JSON.parse(savedOptions)))
    }
  }, [])

  return (
    <DataContext.Provider value={data}>
      <MetricsContext.Provider value={metricsData}>
        <OptionsContext.Provider value={optionsValue}>
          <SearchContext.Provider
            value={{
              searchText,
              setSearchText,
              searchResults,
              setSearchResults,
            }}
          >
            <PathContext.Provider value={{ path, setPath }}>
              <ClickedObjectContext.Provider value={{ clickedObject, setClickedObject }}>
                {children}
              </ClickedObjectContext.Provider>
            </PathContext.Provider>
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricsContext.Provider>
    </DataContext.Provider>
  )
}
