import "./Options.css"
import { Spacer } from "./Spacer"
import { ParserData } from "../../../parser/src/model"
import { Metric, MetricType } from "../metrics"
import { Box } from "./Box"
import { useId } from "@react-aria/utils"
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

interface MetricSelectProps {
  onChange: (metric: MetricType) => void
}

export function MetricSelect(props: MetricSelectProps) {
  let id = useId()
  return (
    <div className="stack">
      <label className="option-text" htmlFor={id}>
        Color metric
      </label>
      <Spacer />
      <select
        id={id}
        className="metric-select"
        onChange={(event) => props.onChange(event.target.value as MetricType)}
      >
        {Object.values(Metric).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
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
