import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from "@mdi/js"
import { useState, useTransition } from "react"
import { Icon } from "~/components/Icon"
import anitruck from "~/assets/truck.gif"
import { cn } from "~/styling"

export function CheckboxWithLabel({
  children,
  checked,
  onChange,
  className = "",
  checkedIcon = mdiCheckboxMarked,
  uncheckedIcon = mdiCheckboxBlankOutline,
  ...props
}: {
  children: React.ReactNode
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  checkedIcon?: string
  uncheckedIcon?: string
} & Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange" | "checked">) {
  const [value, setValue] = useState(checked)
  const [isTransitioning, startTransition] = useTransition()

  return (
    <label className={`label flex w-full items-center justify-start gap-2 ${className}`} {...props}>
      <input
        type="checkbox"
        checked={value}
        className="peer hidden"
        onChange={(e) => {
          setValue(e.target.checked)
          startTransition(() => onChange(e))
        }}
      />
      <Icon
        className="text-tertiary-text dark:text-tertiary-text-dark peer-checked:text-blue-primary place-self-end"
        path={value ? checkedIcon : uncheckedIcon}
        size={1}
      />
      <div className="text-secondary-text hover:text-blue-primary dark:text-secondary-text-dark flex flex-1 items-center gap-2">
        {children}
      </div>
      <img
        src={anitruck}
        alt=""
        aria-hidden="true"
        className={cn("h-5", {
          "opacity-0": !isTransitioning
        })}
      />
    </label>
  )
}
