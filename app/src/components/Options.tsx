import { Spacer } from "./Spacer"
import { Metric, MetricType } from "../metrics"
import { Box, BoxTitle } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType } from "./BubbleChart"
import { useStore } from "../StoreContext"

export function Options() {
  const { data, setMetricType, setChartType } = useStore()
  return (
    <Box>
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
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
