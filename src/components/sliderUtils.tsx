import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { Slider } from "radix-ui"
import { Fragment } from "react/jsx-runtime"
import { cn } from "~/styling"

type SliderShape = "round" | "square"

/** Track and filled range of a Radix slider. Must be rendered inside `Slider.Root`. */
export function SliderTrack({ shape = "round", className }: { shape?: SliderShape; className?: string }) {
  return (
    <Slider.Track className={cn("bg-blue-secondary/20 relative h-2 grow cursor-pointer", className)}>
      <Slider.Range
        className={cn(
          "bg-blue-primary data-disabled:bg-primary-text-dark dark:data-disabled:bg-primary-text absolute h-full",
          {
            "rounded-full": shape === "round",
            "rounded-none": shape === "square"
          }
        )}
      />
    </Slider.Track>
  )
}

/**
 * Draggable thumb of a Radix slider. Must be rendered inside `Slider.Root`.
 *
 * Radix shifts thumbs inwards by up to half their width so they stay inside the track at the edges.
 * The focusable thumb is zero-width so it sits exactly on its value, and the visible handle is
 * centered on it instead. Pass `shape="custom"` to style the visible handle entirely through `className`.
 */
export function SliderThumb({
  shape = "round",
  className,
  children,
  ...props
}: { shape?: SliderShape | "custom" } & ComponentProps<typeof Slider.Thumb>) {
  return (
    <Slider.Thumb className="group/thumb flex w-0 justify-center outline-none" {...props}>
      <span
        className={cn(
          "block shrink-0 cursor-col-resize group-focus-visible/thumb:ring-2 group-data-disabled/thumb:cursor-progress group-data-disabled/thumb:grayscale",
          {
            "btn--primary": shape !== "custom",
            "size-5 rounded-full": shape === "round",
            "h-5 w-0.5": shape === "square"
          },
          className
        )}
      >
        {children}
      </span>
    </Slider.Thumb>
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
  /** Labels keyed by their position on the slider, in percent (0-100) */
  valueMap: Record<number, string>
  titleMap?: Record<number, string>
  onTop?: boolean
}) {
  const positions = Object.keys(valueMap)
    .map(Number)
    .sort((a, b) => a - b)
  return (
    <div
      className="grid grid-flow-col grid-cols-(--cols) grid-rows-[1fr_auto] pt-0.5"
      style={{ "--cols": `repeat(${positions.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      {positions.map((position) => {
        const align = position === 0 ? "left" : position === 100 ? "right" : "center"
        const Tick = (
          <div className={`flex justify-${alignToJustify[align]}`}>
            <div className="h-2 w-px bg-gray-950 dark:bg-gray-50" />
          </div>
        )
        const Label = (
          <div title={titleMap[position]} className="truncate text-xs" style={{ textAlign: align }}>
            {valueMap[position]}
          </div>
        )
        return (
          <Fragment key={position}>
            {onTop ? Label : Tick}
            {onTop ? Tick : Label}
          </Fragment>
        )
      })}
    </div>
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
