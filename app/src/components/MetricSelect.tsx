import { Metric } from "../metrics"
<<<<<<< HEAD:prototype1/src/components/MetricSelect.tsx
import {useId} from '@react-aria/utils'
import Spacer from "./Spacer";
=======
import { useId } from "@react-aria/utils"
>>>>>>> d1639f8 (Setup lint staged in front-end):app/src/components/MetricSelect.tsx

interface MetricSelectProps {
  onChange: (metric: Metric) => void
}

export function MetricSelect(props: MetricSelectProps) {
  let id = useId()
  return (
    <div className="stack">
<<<<<<< HEAD:prototype1/src/components/MetricSelect.tsx
      <label className="option-text" htmlFor={id}>Color metric</label>
      <Spacer/>
=======
      <label className="option-text" htmlFor={id}>
        Color metric
      </label>
>>>>>>> d1639f8 (Setup lint staged in front-end):app/src/components/MetricSelect.tsx
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
