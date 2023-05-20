import Icon from "@mdi/react"
import clsx from "clsx"
import type { ReactNode } from "react"
import { useId } from "react"
import { useOptions } from "~/contexts/OptionsContext"

interface EnumSelectProps<T extends string> {
  label: ReactNode
  enum: Record<T, string>
  defaultValue: T
  onChange: (metric: T) => void
  hidden?: boolean
  iconMap: Record<T, string>
}

export function EnumSelect<T extends string>(props: EnumSelectProps<T>) {
  const id = useId()
  const enumEntries = Object.entries(props.enum) as [T, string][]
  const { hasLoadedSavedOptions } = useOptions()

  return (
    <div className={`mb-2 flex flex-col gap-2 ${props.hidden ? "hidden" : ""}`}>
      <label className="label pl-[9px]" htmlFor={id}>
        {props.label}
      </label>
      {/* <select
        key={hasLoadedSavedOptions.toString()}
https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link        className="input"
        id={id}
        defaultValue={props.defaultValue}
        onChange={(event) => props.onChange(event.target.value as T)}
      >
        {enumEntries.map(([key, value]) => (
          <option key={value} value={key}>
            {value}
          </option>
        ))}
      </select> */}
      <div className="flex flex-wrap gap-0.5">
        {enumEntries.map(([key, value]) => (
          <button
            key={key}
            className={clsx("btn flex h-auto w-max justify-between gap-2 rounded-full px-2 py-1 text-xs/none", {
              "btn--primary": key === props.defaultValue,
              "btn--flat hover:text-blue-500": key !== props.defaultValue,
            })}
            onClick={() => props.onChange(key)}
          >
            <Icon path={props.iconMap[key]} size="1rem" />
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
