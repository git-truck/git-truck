import { mdiCheckboxOutline, mdiCheckboxBlankOutline } from "@mdi/js"
import { useTransition } from "react"
import { Icon } from "~/components/Icon"
import anitruck from "~/assets/truck.gif"

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
  const [isTransitioning, startTransition] = useTransition()

  return (
    <label
      className={`label group flex w-full items-center justify-start gap-2 hover:text-blue-500 ${className}`}
      {...props}
    >
      <span className="flex grow items-center gap-2">
        {children}
        {isTransitioning ? <img src={anitruck} alt="..." className="h-5" /> : ""}
      </span>
      <Icon
        className="place-self-end group-hover:text-blue-500"
        path={checked ? checkedIcon : uncheckedIcon}
        size={1}
      />
      <input
        type="checkbox"
        defaultChecked={checked}
        className="hidden"
        onChange={(e) => startTransition(() => onChange(e))}
      />
    </label>
  )
}
