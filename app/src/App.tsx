import { useState } from "react"
import "./App.css"
import { data } from "./data"
import { Metric } from "./metrics"
import { padding } from "./const"

import { Options } from "./components/Options"
import { BubbleChart, Chart } from "./components/BubbleChart"

document.documentElement.style.setProperty("--padding", `${padding}px`)

function App() {
  const [metricType, setMetricType] =
    useState<keyof typeof Metric>("FILE_EXTENSION")
  const [chartType, setChartType] = useState<keyof typeof Chart>("TREE_MAP")
  return (
    <>
      <BubbleChart
        data={data.commit}
        metricType={metricType}
        chartType={chartType}
      />
      <Options
        data={data}
        setMetricType={setMetricType}
        setChartType={setChartType}
      />
    </>
  )
}

export default App
