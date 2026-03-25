import { Icon } from "~/components/Icon"
import { cn } from "~/styling"
import {
  Field,
  Label,
  Radio,
  RadioGroup,
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption
} from "@headlessui/react"
import { mdiChevronDown } from "@mdi/js"

type IconGroupProps<G extends Record<string, string>> = {
  group: G
  titleMap?: Partial<Record<keyof G, string>>
  defaultValue: keyof G
  className?: string
  onChange: (metric: keyof G) => void
  large?: boolean
  iconMap: Record<keyof G, string>
  ariaLabel: string
}

export function IconRadioGroup<const G extends Record<string, string>>({
  group,
  titleMap,
  defaultValue,
  className,
  onChange,
  large,
  iconMap,
  ariaLabel
}: IconGroupProps<G>) {
  const enumEntries = Object.entries(group) as [Extract<keyof G, string>, string][]

  return (
    <RadioGroup
      value={defaultValue}
      className={cn("flex flex-wrap gap-0", { "gap-2": large }, className)}
      aria-label={ariaLabel}
      onChange={onChange}
    >
      {enumEntries.map(([key, value]) => (
        <Field key={key}>
          <Radio value={key} className="group" title={titleMap?.[key] ?? value}>
            <div
              className={cn(
                "group btn btn--text cursor-pointer gap-2 text-xs transition-all duration-200 hover:opacity-100! focus-visible:opacity-100!",
                {
                  "group-data-checked:bg-blue-primary group-data-checked:fill-primary-text-dark group-data-checked:text-primary-text-dark group-data-checked:border-blue-primary hover:fill-blue-primary hover:text-blue-primary hover:border-blue-primary h-auto flex-col place-items-center items-center rounded border border-transparent p-1":
                    large,
                  "group-data-checked:btn--primary hover:not-group-data-checked:text-primary-text/70 dark:hover:not-group-data-checked:text-primary-text-dark/70 flex h-auto w-max items-center justify-between gap-2 rounded-lg border-transparent px-1 py-1 text-xs/none":
                    !large
                }
              )}
            >
              <Icon
                className="opacity-100!"
                path={iconMap[key]}
                size={large ? "1.5rem" : "1rem"}
                color="currentColor"
              />
              <Label className="cursor-pointer font-normal opacity-100!">{value}</Label>
            </div>
          </Radio>
        </Field>
      ))}
    </RadioGroup>
  )
}

export function IconDropdownGroup<const G extends Record<string, string>>({
  group,
  titleMap,
  defaultValue,
  className,
  onChange,
  iconMap,
  ariaLabel
}: IconGroupProps<G>) {
  const enumEntries = Object.entries(group) as [Extract<keyof G, string>, string][]
  const selectedLabel = group[defaultValue]
  const selectedIcon = iconMap[defaultValue]

  return (
    <Listbox value={defaultValue} aria-label={ariaLabel} onChange={onChange}>
      <div className={cn("relative", className)}>
        <ListboxButton className="btn--primary btn group relative flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-bold">
          <div className="flex items-center gap-2">
            <Icon path={selectedIcon} size="1rem" />
            {selectedLabel}
          </div>
          <Icon path={mdiChevronDown} size="1.25rem" className="transition-transform group-data-open:rotate-180" />
        </ListboxButton>

        <ListboxOptions className="border-blue-primary bg-primary-bg dark:bg-secondary-bg-dark absolute top-full z-30 max-h-60 w-full overflow-auto rounded-lg border-2 shadow-lg">
          {enumEntries.map(([key, label]) => (
            <ListboxOption
              key={key}
              value={key}
              className={({ selected }) =>
                cn(
                  "btn btn--text flex cursor-pointer items-center justify-start gap-2 rounded-none px-3 py-2 text-sm transition-colors",
                  selected
                    ? "bg-secondary-bg dark:bg-primary-bg-dark text-blue-primary dark:text-blue-primary"
                    : "text-primary-text dark:text-primary-text-dark"
                )
              }
              title={titleMap?.[key] ?? label}
            >
              <Icon path={iconMap[key]} size="1rem" color="currentColor" />
              <span>{label}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
