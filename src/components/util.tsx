import { useState, type HTMLAttributes, type ReactNode } from "react"
import { Icon } from "~/components/Icon"
import { mdiClose, mdiCircle } from "@mdi/js"
import clsx from "clsx"
import { Popover } from "~/components/Popover"
import { HexColorPicker } from "react-colorful"
import { useData } from "~/contexts/DataContext"
import { cn } from "~/styling"
import { useOptions } from "~/contexts/OptionsContext"
import { useIsClient, useViewSubmit } from "~/hooks"

export const CloseButton = ({
  className = "",
  absolute = true,
  size = 1.25,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { absolute?: boolean; size?: number }) => (
  <button
    className={clsx(
      className,
      "btn btn--text text-secondary-text hover:text-blue-primary inline-grid bg-transparent text-lg leading-none", // Explicitly set background to transparent
      {
        "absolute top-2 right-2 z-10": absolute
      }
    )}
    title="Close"
    {...props}
  >
    <Icon path={mdiClose} size={size} />
  </button>
)

export const LegendDot = ({
  className = "",
  dotColor,
  shape,
  contributorColorToChange = undefined
}: { dotColor: string; contributorColorToChange?: string; shape?: "circle" | "square" } & HTMLAttributes<HTMLDivElement>) => {
  const [color, setColor] = useState(dotColor)
  const { databaseInfo } = useData()
  const submit = useViewSubmit()

  if (!contributorColorToChange) return <Dot className={className} color={color} shape={shape} />

  function updateColor(contributor: string, color: string) {
    const form = new FormData()
    form.append("contributorName", contributor)
    form.append("contributorColor", color)
    submit(form, {
      method: "post"
    })
  }

  return (
    <Popover
      triggerClassName="flex gap-1 items-center"
      popoverTitle="Choose color"
      positions={["left", "bottom", "top", "right"]}
      trigger={({ onClick }) => (
        <Dot className={cn("cursor-pointer", className)} color={dotColor} shape={shape} onClick={onClick} />
      )}
    >
      <HexColorPicker color={color} onChange={setColor} />
      <button className="btn" onClick={() => updateColor(contributorColorToChange, color)}>
        Set color
      </button>
      {databaseInfo.contributorColors[contributorColorToChange] ? (
        <button className="btn" onClick={() => updateColor(contributorColorToChange, "")}>
          Use default color
        </button>
      ) : null}
    </Popover>
  )
}

export const Dot = ({
  color,
  shape,
  className = "",
  children = null,
  ...props
}: {
  color?: string
  shape?: "circle" | "square"
  className?: string
  children?: ReactNode
  onClick?: () => void
}) => {
  const { chartType } = useOptions()
  shape = shape ?? (chartType === "BUBBLE_CHART" ? "circle" : "square")

  const Component = props.onClick ? "button" : "div"
  return (
    <Component
      className={cn("size-4", className)}
      // style={{ backgroundColor: color }}
      onClick={props.onClick}
    >
      <svg viewBox="0 0 16 16">
        <rect
          className={cn("transition-all", className)}
          width="16"
          height="16"
          rx={shape === "circle" ? 8 : 2}
          ry={shape === "circle" ? 8 : 2}
          fill={color}
          {...props}
        />
        {children}
      </svg>
    </Component>
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
