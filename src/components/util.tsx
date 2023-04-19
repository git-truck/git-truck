import { Close as CloseIcon } from "@styled-icons/material"
import type { HTMLAttributes } from "react"
import { useId } from "react"

export const CloseButton = ({ className = "", ...props }: HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`absolute right-2 top-2 inline-grid text-lg leading-none text-gray-900 hover:text-gray-500 ${className}`}
    title="Close"
    {...props}
  >
    <CloseIcon height="1em" />
  </button>
)

export const LegendDot = ({
  className = "",
  style = {},
  dotColor,
}: { dotColor: string } & HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`aspect-square h-4 w-4 rounded-full shadow-sm shadow-black ${className}`}
    style={{ ...style, backgroundColor: dotColor }}
  />
)

export const Code = ({ inline = false, ...props }: { inline?: boolean } & HTMLAttributes<HTMLDivElement>) => (
  <code
    className={`rounded-md bg-gray-100 p-1 font-mono text-sm text-gray-900 ${
      inline ? "inline-block" : "block"
    } whitespace-pre-wrap`}
    {...props}
  />
)

export function CheckboxWithLabel({
  children,
  checked,
  onChange,
  className = "",
  ...props
}: {
  children: React.ReactNode
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "checked">) {
  const id = useId()
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`} {...props}>
      <label className="label" htmlFor={id}>
        {children}
      </label>
      <input type="checkbox" checked={checked} onChange={onChange} id={id} />
    </div>
  )
}
