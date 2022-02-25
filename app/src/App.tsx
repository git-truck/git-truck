import { useMemo, useState } from "react"
import "./App.css"
import { MetricType } from "./metrics"
import { ChartType, getDefaultStore, Store, StoreContext } from "./StoreContext"
import { Container } from "./components/util"
import { SidePanel } from "./components/SidePanel"
import { HydratedGitBlobObject } from "../../parser/src/model"
import { Main } from "./components/Main"

function App() {
  let [options, setStore] = useState<Store>(getDefaultStore())

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
      <Container>
        <SidePanel />
        <Main />
      </Container>
    </StoreContext.Provider>
  )
}

export default App
