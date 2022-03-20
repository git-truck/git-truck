import { Metric, MetricType } from "../metrics"
import { Box } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType, useOptions } from "../contexts/OptionsContext"
import { Spacer } from "./Spacer"

export function Options() {
  const { setMetricType, setChartType } = useOptions()
  return (
    <Box>
      <EnumSelect
        label="Chart type"
        enum={Chart}
        onChange={(chartType: ChartType) => setChartType(chartType)}
        tooltipText="Choose how the file structure should be shown<br/>Bubble chart is recommended for smaller projects, tree map for bigger"
      />
      <Spacer />
      <EnumSelect
        label="Metric"
        enum={Metric}
        onChange={(metric: MetricType) => setMetricType(metric)}
        tooltipText="Choose what to show with colors on each file"
      />
    </Box>
  )
}
