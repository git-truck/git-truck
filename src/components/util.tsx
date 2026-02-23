import { useState, useTransition, type HTMLAttributes, type ReactNode, type JSX } from "react"
import { Icon } from "~/components/Icon"
import {
  mdiCheckboxOutline,
  mdiCheckboxBlankOutline,
  mdiClose,
  mdiCircle,
  mdiFullscreen,
  mdiFullscreenExit
} from "@mdi/js"
import clsx from "clsx"
import anitruck from "~/assets/truck.gif"
import { Popover } from "./Popover"
import { HexColorPicker } from "react-colorful"
import { useData } from "~/contexts/DataContext"
import { useSubmit, useSearchParams } from "react-router"
import { getPathFromRepoAndHead } from "~/shared/util"
import { cn } from "~/styling"
import { useOptions, type ChartType } from "~/contexts/OptionsContext"
import { useIsClient, useFullscreen } from "~/hooks"

export const CloseButton = ({
  className = "",
  absolute = true,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { absolute?: boolean }) => (
  <button
    className={clsx(
      className,
      "btn btn--text inline-grid bg-transparent text-lg leading-none hover:opacity-80", // Explicitly set background to transparent
      {
        "absolute top-2 right-2 z-10": absolute
      }
    )}
    title="Close"
    {...props}
  >
    <Icon path={mdiClose} size={1} />
  </button>
)

export const LegendDot = ({
  className = "",
  dotColor,
  authorColorToChange = undefined
}: { dotColor: string; authorColorToChange?: string } & HTMLAttributes<HTMLDivElement>) => {
  const [color, setColor] = useState(dotColor)
  const { databaseInfo } = useData()
  const { chartType } = useOptions()
  const submit = useSubmit()
  const [searchParams] = useSearchParams()

  if (!authorColorToChange) return <Dot className={className} chartType={chartType} color={color} />

  function updateColor(author: string, color: string) {
    const form = new FormData()
    form.append("authorname", author)
    form.append("authorcolor", color)
    submit(form, {
      action: getPathFromRepoAndHead({ path: searchParams.get("path")!, branch: databaseInfo.branch }),
      method: "post"
    })
  }

  return (
    <Popover
      triggerClassName="flex gap-1 items-center"
      popoverTitle="Choose color"
      positions={["left", "bottom", "top", "right"]}
      trigger={({ onClick }) => (
        <Dot className={cn("cursor-pointer", className)} chartType={chartType} color={dotColor} onClick={onClick} />
      )}
    >
      <HexColorPicker color={color} onChange={setColor} />
      <button className="btn" onClick={() => updateColor(authorColorToChange, color)}>
        Set color
      </button>
      {databaseInfo.authorColors[authorColorToChange] ? (
        <button className="btn" onClick={() => updateColor(authorColorToChange, "")}>
          Use default color
        </button>
      ) : null}
    </Popover>
  )
}

const Dot = ({
  color,
  chartType,
  className = "",
  ...props
}: {
  color: string
  as?: keyof JSX.IntrinsicElements
  className?: string
  chartType: ChartType
  onClick?: () => void
}) => {
  const Component = props.onClick ? "button" : "div"
  return (
    <Component
      {...props}
      className={cn(
        "aspect-square h-4 w-4 shadow-xs shadow-black transition-[border-radius] duration-[10s]",
        chartType === "BUBBLE_CHART" ? "rounded-full" : "rounded-xs",
        className
      )}
      style={{ backgroundColor: color }}
    />
  )
}

export const Code = ({
  inline = false,
  className = "",
  ...props
}: { inline?: boolean } & HTMLAttributes<HTMLDivElement>) => (
  <code
    className={cn(
      "primary rounded border px-2 py-1 font-mono text-sm",
      inline ? "inline-block" : "block",
      {
        "select-all": inline
      },
      className
    )}
    {...props}
  />
)

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
    <label className={`label flex w-full items-center justify-start gap-2 ${className}`} {...props}>
      <span className="flex grow items-center gap-2">
        {children}
        {isTransitioning ? <img src={anitruck} alt="..." className="h-5" /> : ""}
      </span>
      <Icon className="place-self-end" path={checked ? checkedIcon : uncheckedIcon} size={1} />
      <input
        type="checkbox"
        defaultChecked={checked}
        className="hidden"
        onChange={(e) => startTransition(() => onChange(e))}
      />
    </label>
  )
}

export const LegendBarIndicator = ({ visible, offset }: { visible: boolean; offset: number }) => {
  return (
    <div
      className={clsx("absolute top-1/2 w-min -translate-x-1/2 -translate-y-1/2 transition-all", {
        "opacity-0": !visible
      })}
      style={{
        left: `${offset <= 100 ? offset : -20}%`
      }}
    >
      <Icon
        path={mdiCircle}
        size={0.5}
        className="text-primary-text-dark dark:text-primary-text stroke-primary-text dark:stroke-primary-text-dark stroke-2"
      />
    </div>
  )
}

export function ClientOnly({ children, fallback = null }: { children: () => ReactNode; fallback?: ReactNode }) {
  const isClient = useIsClient()

  if (!isClient) return fallback
  return children()
}
export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen(() => document.documentElement)
  return (
    <button
      className={cn("btn aspect-square p-1", { "btn--primary": isFullscreen })}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      onClick={toggleFullscreen}
    >
      <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
    </button>
  )
}
