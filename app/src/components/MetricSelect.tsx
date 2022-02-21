import { Metric } from "../metrics"
import { useId } from "@react-aria/utils"
import Spacer from "./Spacer"

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
