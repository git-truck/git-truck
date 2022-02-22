import "./Options.css"
import { Spacer } from "./Spacer"
import { ParserData } from "../../../parser/src/model"
import { Metric } from "../metrics"
import { Box } from "./Box"
import { useId } from "@react-aria/utils"

export function Options({
  data,
  setMetric,
}: {
  data: ParserData
  setMetric: (metric: Metric) => void
}) {
  return (
    <Box className="options" title={data.repo}>
      <MetaDataInfo branchName={data.branch} />
      <Spacer />
      <MetricSelect onChange={setMetric}></MetricSelect>
    </Box>
  )
}

interface MetricSelectProps {
  onChange: (metric: Metric) => void
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
        onChange={(event) => props.onChange(event.target.value as Metric)}
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
