import { useId } from "react"
import { Spacer } from "./Spacer"

interface EnumSelectProps<T extends string> {
  label: string
  enum: Record<T, string>
  onChange: (metric: T) => void
  hidden?: boolean
}

export function EnumSelect<T extends string>(props: EnumSelectProps<T>) {
  const id = useId()
  const enumEntries = Object.entries(props.enum) as [T, string][]

  return (
    <div style={props.hidden ? { display: "none" } : {}}>
      <label className="label" htmlFor={id}>
        {props.label}
      </label>
      <Spacer xs />
      <select className="input" id={id} onChange={(event) => props.onChange(event.target.value as T)}>
        {enumEntries.map(([key, value]) => (
          <option key={value} value={key}>
            {value}
          </option>
        ))}
      </select>
    </div>
  )
}
