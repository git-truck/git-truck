import "./Options.css"
import { Spacer } from "./Spacer"
import { ParserData } from "../../../parser/src/model"
import { Metric, MetricType } from "../metrics"
import { Box } from "./Box"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType } from "./BubbleChart"

export function Options({
  data,
  setMetricType,
  setChartType,
}: {
  data: ParserData
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
}) {
  return (
    <Box className="options" title={data.repo}>
      <MetaDataInfo branchName={data.branch} />
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

interface MetaDataProps {
  branchName: string
}

export default function MetaDataInfo(props: MetaDataProps) {
  return (
    <div>
      <label>
        <strong>Branch: </strong>
        {props.branchName}
      </label>
    </div>
  )
}
