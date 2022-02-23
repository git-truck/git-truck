import { useId } from "@react-aria/utils"
import { Spacer } from "./Spacer"

interface MetricSelectProps<T> {
  label: string
  enum: T
  onChange: (metric: keyof T) => void
}

export function EnumSelect<T>(props: MetricSelectProps<T>) {
  let id = useId()
  return (
    <div className="stack">
      <label className="option-text" htmlFor={id}>
        {props.label}
      </label>
      <Spacer />
      <select
        id={id}
        className="enum-select"
        onChange={(event) =>
          props.onChange(event.target.value as unknown as keyof T)
        }
      >
        {Object.entries(props.enum).map(([key, value]) => (
          <option key={value} value={key}>
            {value}
          </option>
        ))}
      </select>
    </div>
  )
}
