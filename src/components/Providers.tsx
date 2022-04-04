import { useEffect, useState, useMemo } from "react"
import { SSRProvider } from "@react-aria/ssr"
import {
  getMetricCalcs,
  MetricCache,
  MetricType,
  setupMetricsCache,
} from "../metrics"
import {
  ChartType,
  getDefaultOptions,
  Options,
  OptionsContext,
} from "../contexts/OptionsContext"
import { SearchContext } from "../contexts/SearchContext"
import { HydratedGitBlobObject, AnalyzerData, HydratedGitObject } from "~/analyzer/model"
import { MetricContext } from "../contexts/MetricContext"
import { DataContext } from "../contexts/DataContext"
import { addAuthorUnion, makeDupeMap } from "../authorUnionUtil"
import { PathContext } from "../contexts/PathContext"
import { ClickedObjectContext } from "~/contexts/ClickedContext"

interface ProvidersProps {
  children: React.ReactNode
  data: AnalyzerData
}

export function Providers({ children, data }: ProvidersProps) {

  const [options, setOptions] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<HydratedGitObject[]>([])
  const [path, setPath] = useState(data.repo)
  const [clickedObject, setClickedObject] = useState<HydratedGitObject | null>(null)

  const metricState: {
    metricCaches: Map<MetricType, MetricCache> | null
    errorMessage: string | null
  } = useMemo(() => {
    if (!data) {
      return { metricCaches: null, errorMessage: null }
    }
    try {
      // TODO: Move this to index.tsx loader function
      const authorAliasMap = makeDupeMap(data.authorUnions)
      addAuthorUnion(data.commit.tree, authorAliasMap)
      const metricCaches = new Map<MetricType, MetricCache>()
      setupMetricsCache(
        data.commit.tree,
        getMetricCalcs(data),
        metricCaches
      )
      return ({ metricCaches, errorMessage: null })
    } catch (e) {
      return {
        metricCaches: null,
        errorMessage: (e as Error).message,
      }
    }
  }, [data])

  useEffect(() => {
    if (!metricState) {
      setOptions(null)
      return
    }
    setOptions((prevOptions) => ({
      ...(prevOptions ?? getDefaultOptions()),
      ...metricState,
    }))
  }, [metricState])

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
    }),
    [options]
  )

  const { metricCaches, errorMessage } = metricState

  if (data === null || metricCaches === null) {
    if (errorMessage === null) {
      return <div>Loading...</div>
    } else {
      return (
        <div>
          <h1>An unexpected error occured:</h1>
          <pre>
            <code>{metricState.errorMessage}</code>
          </pre>
          Verify the data is correct.
        </div>
      )
    }
  }

  return (
    <SSRProvider>
      <DataContext.Provider value={data}>
        <MetricContext.Provider value={metricCaches}>
          <OptionsContext.Provider value={optionsValue}>
            <SearchContext.Provider value={{ searchText, setSearchText, searchResults, setSearchResults }}>
              <PathContext.Provider value={{ path, setPath }}>
                <ClickedObjectContext.Provider value={{ clickedObject, setClickedObject }}>
                  {children}
                </ClickedObjectContext.Provider>
              </PathContext.Provider>
            </SearchContext.Provider>
          </OptionsContext.Provider>
        </MetricContext.Provider>
      </DataContext.Provider>
    </SSRProvider>
  )
}
