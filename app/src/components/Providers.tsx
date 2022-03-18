import { useEffect, useState, useMemo } from "react"
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
import { HydratedGitBlobObject, ParserData } from "../../../parser/src/model"
import { MetricContext } from "../contexts/MetricContext"
import { DataContext } from "../contexts/DataContext"
import { addAuthorUnion, makeDupeMap } from "../authorUnionUtil"
import { PathContext } from "../contexts/PathContext"

interface ProvidersProps {
  children: React.ReactNode
  data: ParserData
}

export function Providers({ children, data }: ProvidersProps) {
  const [metricState, setMetricState] = useState<{
    metricCaches: Map<MetricType, MetricCache> | null
    errorMessage: string | null
  }>({ metricCaches: null, errorMessage: null })
  const [options, setOptions] = useState<Options | null>(null)
  const [searchText, setSearchText] = useState("")
  const [path, setPath] = useState(data.repo)

  useEffect(() => {
    try {
      // TODO: Move this to index.tsx loader function
      const authorAliasMap = makeDupeMap(data.authorUnions)
      addAuthorUnion(data.commit.tree, authorAliasMap)
      const metricCaches = new Map<MetricType, MetricCache>()
      setupMetricsCache(
        data.commit.tree,
        getMetricCalcs(data.commit),
        metricCaches
      )
      setMetricState({ metricCaches, errorMessage: null })
    } catch (e) {
      setMetricState({
        metricCaches: null,
        errorMessage: (e as Error).message,
      })
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
      setClickedBlob: (blob: HydratedGitBlobObject | null) =>
        setOptions((prevOptions) => ({
          ...(prevOptions ?? getDefaultOptions()),
          clickedBlob: blob,
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
            <PathContext.Provider value={{ path, setPath }}>
              {children}
            </PathContext.Provider>
          </SearchContext.Provider>
        </OptionsContext.Provider>
      </MetricContext.Provider>
    </DataContext.Provider>
  )
}
