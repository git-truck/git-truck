import { Metric } from "../metrics"
import {useId} from '@react-aria/utils'

interface MetricSelectProps {
  onChange: (metric: Metric) => void
}

export function MetricSelect(props: MetricSelectProps) {
  let id = useId();
  return (
    <div className="stack">
      <label className="option-text" htmlFor={id}>Color metric</label>
      <select
        id={id}
        onChange={(event) => props.onChange(event.target.value as Metric)}
      >
        {Object.entries(Metric).map(([key,value]) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
    </div>
  )
}
