import type { ReactNode} from "react";
import { useId } from "react"

interface EnumSelectProps<T extends string> {
  label: ReactNode
  enum: Record<T, string>
  onChange: (metric: T) => void
  hidden?: boolean
}

export function EnumSelect<T extends string>(props: EnumSelectProps<T>) {
  const id = useId()
  const enumEntries = Object.entries(props.enum) as [T, string][]

  return (
    <div className={`flex flex-col gap-2 ${props.hidden ? "hidden" : ""}`}>
      <label className="label pl-[9px]" htmlFor={id}>
        {props.label}
      </label>
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
