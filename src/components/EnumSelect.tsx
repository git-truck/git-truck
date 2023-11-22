import { Icon } from "@mdi/react"
import clsx from "clsx"

interface EnumSelectProps<T extends string> {
  enum: Record<T, string>
  defaultValue: T
  onChange: (metric: T) => void
  hidden?: boolean
  iconMap: Record<T, string>
}

export function EnumSelect<T extends string>(props: EnumSelectProps<T>) {
  const enumEntries = Object.entries(props.enum) as [T, string][]

  return (
    <div className="flex flex-wrap gap-0">
      {enumEntries.map(([key, value]) => (
        <button
          key={key}
          className={clsx("btn flex h-auto w-max justify-between gap-2 rounded-lg px-1 py-1 text-xs/none", {
            "btn--primary": key === props.defaultValue,
            "btn--outlined border-transparent hover:text-blue-500": key !== props.defaultValue
          })}
          onClick={() => props.onChange(key)}
        >
          <Icon path={props.iconMap[key]} size="1rem" color="inherit" />
          {value}
        </button>
      ))}
    </div>
  )
}
