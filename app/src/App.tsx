import { useState } from "react"
import "./App.css"
import { data } from "./data"
import { Metric } from "./metrics"
import { padding } from "./const"
import { BubbleChart } from "./components/BubbleChart"
import { MetricSelect } from "./components/MetricSelect"
import MetaDataInfo from "./components/MetaDataInfo"
import Spacer from "./components/Spacer"
import { Legend } from "./components/Legend"
import { getLegend } from "./colors"

document.documentElement.style.setProperty("--padding", `${padding}px`)

function App() {
  const [metric, setMetric] = useState<Metric>(Metric.FileExtension)
  const [legend, setLegend] = useState<string[]>([])
  return (
    <>
      <BubbleChart
        data={data.commit}
        metric={metric}
        updateLegend={() => setLegend(getLegend())}
      />
      <div className="box options">
        <MetaDataInfo repoName={data.repo} branchName={data.branch} />
        <Spacer />
        <MetricSelect
          onChange={(metric: Metric) => setMetric(metric)}
        ></MetricSelect>
      </div>
      <Legend entries={legend}></Legend>
    </>
  )
}

export default App
