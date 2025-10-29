import { Icon } from "~/components/Icon"
import clsx from "clsx"
import { cn } from "~/styling"
import { Field, Label, Radio, RadioGroup } from "@headlessui/react"

type IconRadioGroupProps<G extends Record<string, string>> = {
  group: G
  titleMap?: Partial<Record<keyof G, string>>
  defaultValue: keyof G
  className?: string
  onChange: (metric: keyof G) => void
  large?: boolean
  iconMap: Record<keyof G, string>
}

export function IconRadioGroup<const G extends Record<string, string>>({
  group,
  titleMap,
  defaultValue,
  className,
  onChange,
  large,
  iconMap
}: IconRadioGroupProps<G>) {
  const enumEntries = Object.entries(group) as [Extract<keyof G, string>, string][]

  return (
    <RadioGroup
      value={defaultValue}
      onChange={onChange}
      className={cn("flex flex-wrap gap-0", { "gap-2": large }, className)}
      aria-label=""
    >
      {enumEntries.map(([key, value]) => (
        <Field key={key}>
          <Radio value={key} className="group" title={titleMap ? titleMap[key] : value}>
            <div
              className={clsx("group btn btn--text cursor-pointer gap-2 text-xs transition-all duration-200", {
                "group-data-checked:bg-blue-primary group-data-checked:fill-primary-text-dark group-data-checked:text-primary-text-dark group-data-checked:border-blue-primary hover:fill-blue-primary hover:text-blue-primary hover:border-blue-primary h-auto flex-col place-items-center items-center rounded border border-transparent p-1":
                  large,
                "group-data-checked:btn--primary hover:not-group-data-checked:text-primary-text/70 dark:hover:not-group-data-checked:text-primary-text-dark/70 flex h-auto w-max items-center justify-between gap-2 rounded-lg border-transparent px-1 py-1 text-xs/none":
                  !large
              })}
            >
              <Icon path={iconMap[key]} size={large ? "1.5rem" : "1rem"} color="currentColor" />
              <Label className="cursor-pointer font-normal">{value}</Label>
            </div>
          </Radio>
        </Field>
      ))}
    </RadioGroup>
  )
}
