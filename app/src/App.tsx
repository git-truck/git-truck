import { useState } from "react"
import "./App.css"
import { MetricType } from "./metrics"
import { padding } from "./const"
import { BubbleChart, ChartType } from "./components/BubbleChart"
import { getDefaultStore, Store, StoreContext } from "./StoreContext"
import { Options } from "./components/Options"

document.documentElement.style.setProperty("--padding", `${padding}px`)

function App() {
  const [options, setStore] = useState<Store>(getDefaultStore())
  const store = {
    ...options,
    setMetricType: (metricType: MetricType) =>
      setStore({ ...options, metricType }),
    setChartType: (chartType: ChartType) => setStore({ ...options, chartType }),
  }

  return (
    <StoreContext.Provider value={store}>
      <BubbleChart />
      <Options />
    </StoreContext.Provider>
  )
}

export default App
