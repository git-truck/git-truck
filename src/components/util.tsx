import { useState, type HTMLAttributes, type ReactNode, type JSX } from "react"
import { Icon } from "~/components/Icon"
import { mdiClose, mdiCircle } from "@mdi/js"
import clsx from "clsx"
import { Popover } from "./Popover"
import { HexColorPicker } from "react-colorful"
import { useData } from "~/contexts/DataContext"
import { useSubmit, useSearchParams } from "react-router"
import { getPathFromRepoAndHead } from "~/shared/util"
import { cn } from "~/styling"
import { useOptions, type ChartType } from "~/contexts/OptionsContext"
import { useIsClient } from "~/hooks"

export const CloseButton = ({
  className = "",
  absolute = true,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { absolute?: boolean }) => (
  <button
    className={clsx(
      className,
      "btn btn--text inline-grid bg-transparent text-lg leading-none hover:text-blue-500", // Explicitly set background to transparent
      {
        "absolute top-2 right-2 z-10": absolute
      }
    )}
    title="Close"
    {...props}
  >
    <Icon path={mdiClose} size={1.25} />
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
