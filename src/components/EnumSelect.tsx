import type { ReactNode } from "react"
import { useId } from "react"
import { useOptions } from "~/contexts/OptionsContext"

interface EnumSelectProps<T extends string> {
  label: ReactNode
  enum: Record<T, string>
  defaultValue: T
  onChange: (metric: T) => void
  hidden?: boolean
}

export function EnumSelect<T extends string>(props: EnumSelectProps<T>) {
  const id = useId()
  const enumEntries = Object.entries(props.enum) as [T, string][]
  const { hasLoadedSavedOptions } = useOptions()

  return (
    <div className={`flex flex-col gap-2 ${props.hidden ? "hidden" : ""}`}>
      <label className="label pl-[9px]" htmlFor={id}>
        {props.label}
      </label>
      <select
        key={hasLoadedSavedOptions.toString()}
        className="input"
        id={id}
        defaultValue={props.defaultValue}
        onChange={(event) => props.onChange(event.target.value as T)}
      >
        {enumEntries.map(([key, value]) => (
          <option key={value} value={key}>
            {value}
          </option>
        ))}
      </select>
    </div>
  )
}
