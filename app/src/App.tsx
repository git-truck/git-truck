import { useEffect, useMemo, useState } from "react"
import "./App.css"
import { MetricType } from "./metrics"
import { padding } from "./const"
import { BubbleChart, ChartType } from "./components/BubbleChart"
import { getDefaultStore, Store, StoreContext } from "./StoreContext"
import { Container, Main } from "./components/util"
import { SidePanel } from "./components/SidePanel"
import { HydratedGitBlobObject } from "../../parser/src/model"

document.documentElement.style.setProperty("--padding", `${padding}px`)

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
        setCurrentBlob: (blob: HydratedGitBlobObject | null) =>
          setStore((prevStore) => ({ ...prevStore, currentBlob: blob })),
      } as Store),
    [options]
  )

  useEffect(() => console.table(options), [options])

  return (
    <StoreContext.Provider value={store}>
      <Container>
        <SidePanel />
        <Main>
          <BubbleChart />
        </Main>
      </Container>
    </StoreContext.Provider>
  )
}

export default App
