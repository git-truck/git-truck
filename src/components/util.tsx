import type { HTMLAttributes } from "react"
import { useId } from "react"
import { Icon } from "@mdi/react"
import { mdiCheckboxOutline, mdiCheckboxBlankOutline, mdiMenuUp, mdiClose } from "@mdi/js"

export const CloseButton = ({ className = "", ...props }: HTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`absolute right-2 top-2 inline-grid text-lg leading-none text-gray-900 hover:text-gray-500 ${className}`}
    title="Close"
    {...props}
  >
    <Icon path={mdiClose} />
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
      <label className="label flex w-full justify-between" htmlFor={id}>
        {children}
        {checked ? <Icon path={mdiCheckboxOutline} size={1} /> : <Icon path={mdiCheckboxBlankOutline} size={1} />}
        <input type="checkbox" checked={checked} onChange={onChange} id={id} className="hidden" />
      </label>
    </div>
  )
}

export const LegendBarIndicator = ({
  visible: arrowVisible,
  offset: arrowOffset,
}: {
  visible: boolean
  offset: number
}) => (
  <div
    className={`absolute bottom-0 w-min -translate-x-1/2 translate-y-1/2 transition-all ${
      arrowVisible ? "opacity-100" : "opacity-0"
    }`}
    style={{
      left: `${arrowOffset}%`,
    }}
  >
    <Icon path={mdiMenuUp} size={2} className="stroke-white" />
  </div>
)
