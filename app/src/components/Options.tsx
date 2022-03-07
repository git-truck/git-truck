import { Metric, MetricType } from "../metrics"
import { Box } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType, useOptions } from "../OptionsContext"
import { Spacer } from "./Spacer"

export function Options() {
  const { setMetricType, setChartType } = useOptions()
  return (
    <Box>
      <EnumSelect
        label="Chart type"
        enum={Chart}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      <Spacer />
      <EnumSelect
        label="Color metric"
        enum={Metric}
        onChange={(metric: MetricType) => setMetricType(metric)}
      />
    </Box>
  )
}
