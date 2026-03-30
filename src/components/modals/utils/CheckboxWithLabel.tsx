import { mdiCheckboxBlankOutline, mdiCheckboxIntermediate, mdiCheckboxMarked } from "@mdi/js"
import { useTransition, useState } from "react"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

export function CheckboxWithLabel({
  children,
  checked,
  intermediate,
  onChange,
  className = "",
  checkBoxClassName = "",
  checkedIcon = mdiCheckboxMarked,
  uncheckedIcon = mdiCheckboxBlankOutline,
  ...props
}: {
  children: React.ReactNode
  checked: boolean
  intermediate?: boolean
  checkBoxClassName?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  checkedIcon?: string
  uncheckedIcon?: string
} & Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange" | "checked">) {
  const [, startTransition] = useTransition()
  const [localChecked, setLocalChecked] = useState(checked)

  return (
    <label className={cn("label flex w-full items-center justify-start gap-2", className)} {...props}>
      <input
        type="checkbox"
        checked={checked !== localChecked ? checked : localChecked}
        className="peer hidden"
        onChange={(e) => {
          setLocalChecked(e.target.checked)
          startTransition(() => {
            onChange(e)
          })
        }}
      />
      <div className="text-secondary-text hover:text-blue-primary dark:text-secondary-text-dark contents items-center">
        {children}
      </div>
      <Icon
        className={cn(
          "peer-checked:text-blue-primary",
          intermediate ? "text-blue-primary" : "text-tertiary-text dark:text-tertiary-text-dark",
          checkBoxClassName
        )}
        path={
          intermediate
            ? mdiCheckboxIntermediate
            : (checked !== localChecked ? checked : localChecked)
              ? checkedIcon
              : uncheckedIcon
        }
        size={1}
      />
    </label>
  )
}
