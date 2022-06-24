import { useMemo, useState } from "react"
import { HydratedGitBlobObject, HydratedGitObject } from "~/analyzer/model"
import { ClickedObjectContext } from "~/contexts/ClickedContext"
import { RepoData } from "~/routes/$repo.$"
import { DataContext } from "../contexts/DataContext"
import { MetricsContext } from "../contexts/MetricContext"
import { ChartType, getDefaultOptions, Options, OptionsContext } from "../contexts/OptionsContext"
import { PathContext } from "../contexts/PathContext"
import { SearchContext } from "../contexts/SearchContext"
import { AuthorshipType, createMetricData as createMetricsData, MetricsData, MetricType } from "../metrics"

interface ProvidersProps {
  children: React.ReactNode
  data: RepoData
}

export function Providers({ children, data }: ProvidersProps) {
  const [options, setOptions] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<HydratedGitObject[]>([])
  const [path, setPath] = useState(data.repo.name)
  const [clickedObject, setClickedObject] = useState<HydratedGitObject | null>(null)

  const metricsData: MetricsData = useMemo(() => createMetricsData(data.analyzerData, data.fullAuthorUnion), [data])

  const optionsValue = useMemo(
    () => ({
      ...getDefaultOptions(),
      ...options,
      setMetricType: (metricType: MetricType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          metricType,
        })),
      setChartType: (chartType: ChartType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          chartType,
        })),
      setAuthorshipType: (authorshipType: AuthorshipType) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          authorshipType,
        })),
      setHoveredBlob: (blob: HydratedGitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          hoveredBlob: blob,
        })),
      setClickedObject: (object: HydratedGitObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          clickedObject: object,
        })),
      setAnimationsEnabled: (enabled: boolean) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          animationsEnabled: enabled,
        })),
    }),
    [options]
  )

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
