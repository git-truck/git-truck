import { mdiCheckboxOutline, mdiCheckboxBlankOutline } from "@mdi/js"
import { useState, useTransition } from "react"
import { Icon } from "~/components/Icon"
import anitruck from "~/assets/truck.gif"
import { cn } from "~/styling"

export function CheckboxWithLabel({
  children,
  checked,
  onChange,
  className = "",
  checkedIcon = mdiCheckboxOutline,
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
    <label
      className={`label group flex w-full items-center justify-start gap-2 hover:text-blue-500 ${className}`}
      {...props}
    >
      <div className="flex flex-1 items-center gap-2">{children}</div>
      <img
        src={anitruck}
        alt="..."
        className={cn("h-5", {
          "opacity-0": !isTransitioning
        })}
      />
      <Icon className="place-self-end group-hover:text-blue-500" path={value ? checkedIcon : uncheckedIcon} size={1} />
      <input
        type="checkbox"
        checked={value}
        className="hidden"
        onChange={(e) => {
          setValue(e.target.checked)
          startTransition(() => onChange(e))
        }}
      />
    </label>
  )
}
