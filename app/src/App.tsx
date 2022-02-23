import { useMemo, useState } from "react"
import "./App.css"
import { MetricType } from "./metrics"
import { Chart } from "./components/Chart"
import { ChartType, getDefaultStore, Store, StoreContext } from "./StoreContext"
import { Container, Main } from "./components/util"
import { SidePanel } from "./components/SidePanel"
import { HydratedGitBlobObject } from "../../parser/src/model"
import { Tooltip } from "./components/Tooltip"

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
          setStore((prevStore) => ({ ...prevStore, currentHoveredBlob: blob })),
        setClickedBlob: (blob: HydratedGitBlobObject | null) =>
          setStore((prevStore) => ({ ...prevStore, currentClickedBlob: blob })),
      } as Store),
    [options]
  )

  return (
    <StoreContext.Provider value={store}>
      <Container>
        <SidePanel />
        <Main>
          <Chart />
        </Main>
      </Container>
      <Tooltip />
    </StoreContext.Provider>
  )
}

export default App
