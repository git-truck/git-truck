import { useEffect, useState, useMemo } from "react"
import {
  getMetricCalcs,
  MetricCache,
  MetricType,
  setupMetricsCache,
} from "./../metrics"
import {
  ChartType,
  getDefaultOptions,
  Options,
  OptionsContext,
} from "../contexts/OptionsContext"
import { SearchContext } from "../contexts/SearchContext"
import { HydratedGitBlobObject, ParserData } from "../../../parser/src/model"
import { MetricContext } from "../contexts/MetricContext"
import { DataContext } from "../contexts/DataContext"
import { addAuthorUnion, makeDupeMap } from "../authorUnionUtil"

export function Providers({ children }: { children: React.ReactNode }) {
  const [dataState, setData] = useState<{
    data: ParserData | null
    metricCaches: Map<MetricType, MetricCache> | null
    errorMessage: string | null
  }>({ data: null, metricCaches: null, errorMessage: null })
  const [options, setOptions] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    async function getData() {
      try {
        const response = await fetch(`./data.json?cache_bust=${Date.now()}`)
        const data = (await response.json()) as ParserData
        const authorAliasMap = makeDupeMap(data.authorUnions)
        addAuthorUnion(data.commit.tree, authorAliasMap)
        const metricCaches = new Map<MetricType, MetricCache>()
        setupMetricsCache(
          data.commit.tree,
          getMetricCalcs(data.commit),
          metricCaches
        )
        setData({ data, metricCaches, errorMessage: null })
      } catch (e) {
        setData({
          data: null,
          metricCaches: null,
          errorMessage: (e as Error).message,
        })
      }
    }
    getData()
  }, [])

  useEffect(() => {
    if (!dataState) {
      setOptions(null)
      return
    }
    setOptions((prevOptions) => ({
      ...(prevOptions ?? getDefaultOptions()),
      ...dataState,
    }))
  }, [dataState])

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
      setClickedBlob: (blob: HydratedGitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          clickedBlob: blob,
        })),
    }),
    [options]
  )

  const { data, metricCaches, errorMessage } = dataState

  if (data === null || metricCaches === null) {
    if (errorMessage === null) {
      return <div>Loading...</div>
    } else {
      return (
        <div>
          <h1>An unexpected error occured:</h1>
          <pre>
            <code>{dataState.errorMessage}</code>
          </pre>
          Verify the data in{" "}
          <code>
            {process.env.NODE_ENV === "development"
              ? "git-visual/app/public/data.json"
              : "git-visual/app/build/data.json"}
          </code>{" "}
          is correct.
        </div>
      )
    }
  }

  return (
    <DataContext.Provider value={data}>
      <MetricContext.Provider value={metricCaches}>
        <OptionsContext.Provider value={optionsValue}>
          <SearchContext.Provider value={{ searchText, setSearchText }}>
            {children}
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricContext.Provider>
    </DataContext.Provider>
  )
}
