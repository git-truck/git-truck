import "./Options.css"
import { Spacer } from "./Spacer"
import { Metric, MetricType } from "../metrics"
import { Box } from "./Box"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType } from "./BubbleChart"
import { useStore } from "../StoreContext"

export function Options() {
  const { data, setMetricType, setChartType } = useStore()
  return (
    <Box className="options" title={data.repo}>
      <div>
        <strong>Branch: </strong>
        {data.branch}
      </div>
      <Spacer />
      <EnumSelect
        label="Chart type"
        enum={Chart}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      <EnumSelect
        label="Color metric"
        enum={Metric}
        onChange={(metric: MetricType) => setMetricType(metric)}
      ></EnumSelect>
    </Box>
  )
}
