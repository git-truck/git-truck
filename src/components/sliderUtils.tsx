import type { CSSProperties, ReactNode } from "react"
import {
  type SliderItem,
  type GetHandleProps,
  type GetTrackProps,
  Ticks,
  type GetRailProps
} from "react-compound-slider"
import { Fragment } from "react/jsx-runtime"
import { cn } from "~/styling"

export function Handle({
  domain: [min, max],
  children,
  disabled,
  handle,
  handleType = "round",
  title,
  getHandleProps,
  className,
  onClick
}: {
  domain: number[]
  handleType?: "round" | "square"
  children?: ReactNode
  handle: SliderItem
  title?: string
  getHandleProps: GetHandleProps
  className?: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1.5 place-content-center disabled:grayscale",
        {
          "size-5 rounded-full": handleType === "round"
        },
        disabled ? "cursor-progress" : "cursor-col-resize",
        className
      )}
      role="slider"
      aria-disabled={disabled}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={handle.value}
      title={title}
      style={{
        left: `${handle.percent}%`
        // marginTop: "-6px"
      }}
      {...getHandleProps(handle.id)}
    >
      <div
        className={cn("btn--primary", {
          "size-5 rounded-full": handleType === "round",
          "h-5 w-0.5": handleType === "square"
        })}
      >
        {children}
      </div>
    </button>
  )
}

export function SliderRail({
  getRailProps,
  className = "",
  children
}: {
  getRailProps: GetRailProps
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn("bg-blue-secondary/20 absolute h-2 w-full cursor-pointer", {}, className)} {...getRailProps()}>
      {children}
    </div>
  )
}

export function Track({
  source,
  target,
  trackType = "round",
  getTrackProps,
  disabled
}: {
  source: SliderItem
  target: SliderItem
  getTrackProps: GetTrackProps
  trackType?: "round" | "square"
  disabled?: boolean
  backgroundColor: string
}) {
  return (
    <div
      className={cn(
        "btn btn--primary absolute h-2 cursor-pointer p-0",
        disabled ? "bg-primary-text-dark dark:bg-primary-text" : "bg-blue-primary",
        {
          "rounded-full": trackType === "round",
          "rounded-none": trackType === "square"
        }
      )}
      style={{
        left: `${source.percent}%`,
        width: `${target.percent - source.percent}%`
      }}
      {...getTrackProps()}
    />
  )
}

const alignToJustify = {
  left: "start",
  center: "center",
  right: "end"
} as const

export function LabeledTicks({
  valueMap,
  titleMap = valueMap,
  onTop = false
}: {
  valueMap: Record<number, string>
  titleMap?: Record<number, string>
  onTop?: boolean
}) {
  const entries = Object.entries(valueMap)
  const count = entries.length
  return (
    <Ticks count={count}>
      {({ ticks }) => (
        <div className="grid grid-flow-col grid-cols-3 grid-rows-[1fr_auto] pt-4">
          {ticks.map((tick) => {
            const tickLabelInfo = valueMap[tick.value * 100]
            const align = tick.value === 0 ? "left" : tick.value === 1 ? "right" : "center"
            const justification = tickLabelInfo ? alignToJustify[align] : "center"
            const Tick = (
              <div className={`flex justify-${justification}`}>
                <div className="h-2 w-px bg-gray-950 dark:bg-gray-50" />
              </div>
            )
            const Label = (
              <div
                title={titleMap[tick.value * 100]}
                className="truncate text-xs"
                style={{
                  textAlign: align
                }}
              >
                {tickLabelInfo}
              </div>
            )
            return (
              <Fragment key={tick.id}>
                {onTop ? Label : Tick}
                {onTop ? Tick : Label}
              </Fragment>
            )
          })}
        </div>
      )}
    </Ticks>
  )
}

export function TicksByCount({
  className = "",
  count,
  tickToLabel,
  onTop = true,
  align,
  below = false
}: {
  className?: string
  count: number
  tickToLabel: (tick: number, index: number) => ReactNode
  onTop?: boolean
  /** Alignment of the labels. If not provided, left for first tick, right for last tick, center otherwise.*/
  align?: "left" | "center" | "right"
  below?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-flow-col grid-cols-(--cols) gap-1 text-xs",
        {
          "grid-rows-[auto]": !below && !onTop,
          "grid-rows-[auto_auto]": below !== onTop,
          "grid-rows-[auto_auto_auto]": below && onTop
        },
        className
      )}
      style={
        {
          "--cols": `repeat(${count}, minmax(0, 1fr))`
        } as CSSProperties
      }
    >
      {Array.from({ length: count }).map((_, i) => {
        const tick = i / (count - 1)
        const tickLabelInfo = tickToLabel(tick, i)
        const alignment = align ?? (tick === 0 ? "left" : tick === 1 ? "right" : "center")
        const justification = tickLabelInfo ? alignToJustify[alignment] : ("center" as const)

        return (
          <Fragment key={i}>
            {onTop ? <Tick justification={justification} /> : null}
            <div className={cn(`text-${alignment}`)}>{tickLabelInfo === 0 ? "" : tickLabelInfo}</div>
            {below ? <Tick justification={justification} /> : null}
          </Fragment>
        )
      })}
    </div>
  )
}

export const Tick = ({
  className = "",
  justification = "start"
}: {
  className?: string
  justification?: "start" | "center" | "end"
}) => (
  <div className={cn("flex", `justify-${justification}`, className)}>
    <div className="h-2 w-px bg-gray-950 dark:bg-gray-50" />
  </div>
)
