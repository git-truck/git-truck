import { useState } from "react"
import "./App.css"
import { data } from "./data"
import { Metric } from "./metrics"
import { padding } from "./const"
import { BubbleChart } from "./components/BubbleChart"
import { Options } from "./components/Options"

document.documentElement.style.setProperty("--padding", `${padding}px`)

function App() {
  const [metric, setMetric] = useState<Metric>(Metric.FileExtension)
  return (
    <>
      <BubbleChart data={data.commit} metric={metric} />
      <Options data={data} setMetric={setMetric} />
    </>
  )
}

export default App
