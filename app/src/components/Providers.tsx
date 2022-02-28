import { useMemo, useState } from "react"
import { MetricType } from "./../metrics"
import {
  ChartType,
  getDefaultStore,
  Store,
  StoreContext,
} from "./../StoreContext"
import { SearchContext } from "./../SearchContext"
import { HydratedGitBlobObject } from "../../../parser/src/model"

export function Providers({ children }: { children: React.ReactNode }) {
  const [options, setStore] = useState<Store>(getDefaultStore())
  const [searchText, setSearchText] = useState("")

  const store = useMemo(
    () =>
      ({
        ...options,
        setMetricType: (metricType: MetricType) =>
          setStore({ ...options, metricType }),
        setChartType: (chartType: ChartType) =>
          setStore((prevStore) => ({ ...prevStore, chartType })),
        setHoveredBlob: (blob: HydratedGitBlobObject | null) =>
          setStore((prevStore) => ({ ...prevStore, hoveredBlob: blob })),
        setClickedBlob: (blob: HydratedGitBlobObject | null) =>
          setStore((prevStore) => ({ ...prevStore, clickedBlob: blob })),
      } as Store),
    [options]
  )

  return (
    <StoreContext.Provider value={store}>
      <SearchContext.Provider value={{ searchText, setSearchText }}>
        {children}
      </SearchContext.Provider>
    </StoreContext.Provider>
  )
}
