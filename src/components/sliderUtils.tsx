import type { ReactNode } from "react"
import { type SliderItem, type GetHandleProps, type GetTrackProps, Ticks } from "react-compound-slider"
import { Fragment } from "react/jsx-runtime"
import { cn } from "~/styling"

export function Handle(props: {
  domain: number[]
  handle: SliderItem
  getHandleProps: GetHandleProps
  disabled?: boolean
}) {
  return (
    <div
      className="bg-blue-primary disabled:bg-blue-primary/50"
      role="slider"
      aria-valuemin={props.domain[0]}
      aria-valuemax={props.domain[1]}
      aria-valuenow={props.handle.value}
      style={{
        left: `${props.handle.percent}%`,
        position: "absolute",
        marginLeft: "-11px",
        marginTop: "-6px",
        zIndex: 2,
        width: 24,
        height: 24,
        cursor: "pointer",
        borderRadius: "50%",
        boxShadow: "1px 1px 1px 1px rgba(0, 0, 0, 0.2)"
        // backgroundColor: `${props.disabled ? "grey" : "#34568f"}`
      }}
      {...props.getHandleProps(props.handle.id)}
    />
  )
}

export function Track(props: {
  source: SliderItem
  target: SliderItem
  getTrackProps: GetTrackProps
  disabled?: boolean
  backgroundColor: string
}) {
  return (
    <div
      className={cn(props.disabled ? "bg-primary-text-dark dark:bg-primary-text" : "bg-blue-primary")}
      style={{
        position: "absolute",
        height: 14,
        zIndex: 1,
        borderRadius: 7,
        cursor: "pointer",
        left: `${props.source.percent}%`,
        width: `${props.target.percent - props.source.percent}%`
      }}
      {...props.getTrackProps()}
    />
  )
}

const alignToJustify = {
  left: "start",
  center: "center",
  right: "end"
}

export function LabeledTicks({ valueMap, onTop = false }: { valueMap: Record<number, ReactNode>; onTop?: boolean }) {
  const entries = Object.entries(valueMap)
  const count = entries.length
  return (
    <Ticks count={count}>
      {({ ticks }) => (
        <div className="grid grid-flow-col grid-cols-3 [grid-template-rows:1fr_auto] pt-4">
          {ticks.map((tick) => {
            const tickLabelInfo = valueMap[tick.value * 100]
            const align = tick.value === 0 ? "left" : tick.value === 1 ? "right" : "center"
            const justification = tickLabelInfo ? alignToJustify[align] : "center"
            const Tick = (
              <div className={`flex justify-${justification}`}>
                <div className="h-2 w-[1px] bg-gray-950 dark:bg-gray-50" />
              </div>
            )
            const Label = (
              <div
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
  count,
  tickToLabel,
  onTop = false
}: {
  count: number
  tickToLabel: (tick: number) => ReactNode
  onTop?: boolean
}) {
  return (
    <Ticks count={count}>
      {({ ticks }) => (
        <div className="grid grid-flow-col grid-cols-3 [grid-template-rows:1fr_auto] pt-4">
          {ticks.map((tick) => {
            const tickLabelInfo = tickToLabel(tick.value)
            const align = tick.value === 0 ? "left" : tick.value === 1 ? "right" : "center"
            const justification = tickLabelInfo ? alignToJustify[align] : "center"
            const Tick = (
              <div className={`flex justify-${justification}`}>
                <div className="h-2 w-[1px] bg-gray-950 dark:bg-gray-50" />
              </div>
            )
            const Label = (
              <div
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

export function Tick({
  tick,
  count,
  valueMap = {}
}: {
  tick: SliderItem
  count: number
  valueMap?: {
    [key: number]: {
      text: string
      align: "left" | "center" | "right"
    }
  }
}) {
  const text = valueMap[tick.value]?.text ?? ""
  const align: "left" | "center" | "right" = "center"

  return (
    <div className="grid grid-cols-3 gap-2">
      <div
        style={{
          // position: "absolute",
          // marginTop: 14,
          width: 1,
          height: 5,
          backgroundColor: "rgb(150,150,150)",
          left: `${tick.percent}%`
        }}
      />
      <div
        style={{
          // position: "absolute",
          // marginTop: 22,
          fontSize: 10,
          textAlign: align,
          marginLeft: `${-(100 / count) / 2}%`,
          width: `${100 / count}%`,
          left: `${tick.percent}%`,
          maxWidth: "80px"
        }}
      >
        {text}
      </div>
    </div>
  )
}
