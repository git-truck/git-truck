import Icon from "@mdi/react"
import clsx from "clsx"
import { cn } from "~/styling"
import { Field, Label, Radio, RadioGroup } from "@headlessui/react"

export function EnumSelect<T extends string>(props: {
  enum: Record<T, string>
  defaultValue: T
  onChange: (metric: T) => void
  hidden?: boolean
  large?: boolean
  iconMap: Record<T, string>
}) {
  const enumEntries = Object.entries(props.enum) as [T, string][]

  return (
    <RadioGroup
      value={props.defaultValue}
      onChange={props.onChange}
      className={cn("flex flex-wrap gap-0", { "gap-2": props.large })}
      aria-label=""
    >
      {enumEntries.map(([key, value]) => (
        <Field key={key}>
          <Radio value={key} className="group">
            <div
              className={clsx("group btn cursor-pointer gap-2 text-xs transition-all duration-200", {
                "group-data-checked:bg-blue-primary group-data-checked:fill-primary-text-dark group-data-checked:text-primary-text-dark group-data-checked:border-blue-primary hover:fill-blue-primary hover:text-blue-primary hover:border-blue-primary h-auto flex-col place-items-center items-center rounded border border-transparent p-1":
                  props.large,
                "group-data-checked:btn--primary hover:text-primary-text dark:hover:text-primary-text-dark flex h-auto w-max items-center justify-between gap-2 rounded-lg border-transparent px-1 py-1 text-xs/none":
                  !props.large
              })}
            >
              <Icon path={props.iconMap[key]} size={props.large ? "1.5rem" : "1rem"} color="currentColor" />
              <Label className="cursor-pointer font-normal">{value}</Label>
            </div>
          </Radio>
        </Field>
      ))}
    </RadioGroup>
  )
}
