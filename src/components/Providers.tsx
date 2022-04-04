import { useEffect, useState, useMemo } from "react"
import { SSRProvider } from "@react-aria/ssr"
import {
  BaseDataType,
  generateAuthorColors,
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
import { DataContext } from "../contexts/DataContext"
import { addAuthorUnion, makeDupeMap, unionAuthors } from "../authorUnionUtil"
import { PathContext } from "../contexts/PathContext"
import { ClickedObjectContext } from "~/contexts/ClickedContext"
import { MetricsContext } from "../contexts/MetricContext"

interface ProvidersProps {
  children: React.ReactNode
  data: AnalyzerData
}

export function Providers({ children, data }: ProvidersProps) {

  const [options, setOptions] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")
  const [path, setPath] = useState(data.repo)
  const [clickedObject, setClickedObject] = useState<HydratedGitObject | null>(null)

  const metricState: {
    metricsData: Map<BaseDataType, Map<MetricType, MetricCache>> | null
    errorMessage: string | null
  } = useMemo(() => {
    if (!data) {
      return { metricsData: null, errorMessage: null }
    }
    try {
      // TODO: Move this to index.tsx loader function
      const authorAliasMap = makeDupeMap(data.authorUnions)
      addAuthorUnion(data.commit.tree, authorAliasMap)
      const metricsData = new Map<BaseDataType, Map<MetricType, MetricCache>>()
      
      const meme : Record<string, number> = {}
      for (const author of data.authors) { meme[author] = 0 }
      const fullAuthorUnion = unionAuthors(meme, authorAliasMap);
    
      const authorColors = generateAuthorColors(Object.keys(fullAuthorUnion))

      const historicalMetricCache = new Map<MetricType, MetricCache>()
      setupMetricsCache(
        data.commit.tree,
        getMetricCalcs(data, "HISTORICAL", authorColors),
        historicalMetricCache
      )
      const blameMetricCache = new Map<MetricType, MetricCache>()
      setupMetricsCache(
        data.commit.tree,
        getMetricCalcs(data, "BLAME", authorColors),
        blameMetricCache
      )

      metricsData.set("HISTORICAL", historicalMetricCache)
      metricsData.set("BLAME", blameMetricCache)

      return ({ metricsData, errorMessage: null })
    } catch (e) {
      return {
        metricsData: null,
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
      setBaseDataType: (baseDataType: BaseDataType) => 
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          baseDataType,
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

  const { metricsData, errorMessage } = metricState

  if (data === null || metricsData === null) {
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
        <MetricsContext.Provider value={metricsData}>
          <OptionsContext.Provider value={optionsValue}>
            <SearchContext.Provider value={{ searchText, setSearchText }}>
              <PathContext.Provider value={{ path, setPath }}>
                <ClickedObjectContext.Provider value={{ clickedObject, setClickedObject }}>
                  {children}
                </ClickedObjectContext.Provider>
              </PathContext.Provider>
            </SearchContext.Provider>
          </OptionsContext.Provider>
        </MetricsContext.Provider>
      </DataContext.Provider>
    </SSRProvider>
  )
}
