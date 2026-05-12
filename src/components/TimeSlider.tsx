import { useNavigation } from "react-router"
import { Fragment, useCallback, useState, useTransition } from "react"
import { Slider, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { cn } from "~/styling"
import { BarChart } from "~/components/BarChart"
import { TimelineHeader } from "~/components/Timeline/TimelineHeader"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { mdiDotsVertical } from "@mdi/js"
import { Icon } from "~/components/Icon"

import type { TimeUnit } from "~/shared/utils/time"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"

import { expandIntervalToRange } from "~/shared/util"

type TimeIntervalRef = { timestamp: number }

function timeToSliderUnit(
  timestampSecs: number,
  intervals: TimeIntervalRef[],
  unit: TimeUnit,
  handle: "start" | "end"
) {
  if (intervals.length === 0) return 0

  for (let i = 0; i < intervals.length; i++) {
    const [start, end] = expandIntervalToRange(intervals[i].timestamp, unit)

    if (handle === "end") {
      if (timestampSecs <= end) return i + 1
    } else {
      if (timestampSecs < end) return i
    }
  }

  return intervals.length
}

function sliderUnitsToTimeRange({
  startIndex,
  endIndex,
  intervals,
  unit,
  minSecs,
  maxSecs
}: {
  startIndex: number
  endIndex: number
  intervals: TimeIntervalRef[]
  unit: TimeUnit
  minSecs: number
  maxSecs: number
}): [number, number] {
  if (intervals.length === 0) return [minSecs, maxSecs]

  const clampedStartIndex = Math.max(0, Math.min(startIndex, intervals.length - 1))
  const clampedEndIndex = Math.max(0, Math.min(endIndex - 1, intervals.length - 1))
  const [start] = expandIntervalToRange(intervals[clampedStartIndex].timestamp, unit)
  const [, end] = expandIntervalToRange(intervals[clampedEndIndex].timestamp, unit)

  return [Math.max(minSecs, start), Math.min(maxSecs, end)]
}

export function Timeline({ className }: { className?: string }) {
  const [commitCountScale, setCommitCountScale] = useState<"linear" | "log">("log")
  const { databaseInfo } = useData()
  const { timerange, selectedRange } = databaseInfo
  const [rangeMin, rangeMax] = timerange
  const [
    { start: low, end: high }
    // setQs
  ] = useQueryStates({
    start: viewSearchParamsConfig.start.withDefault(rangeMin),
    end: viewSearchParamsConfig.end.withDefault(rangeMax)
  })

  const unit = databaseInfo.commitCountPerTimeIntervalUnit
  // const submit = useViewSubmit()

  const navigationData = useNavigation()
  const disabled = navigationData.state !== "idle"

  const domainInUnits = databaseInfo.commitCountPerTimeInterval.length
  const selectedStartInUnit = timeToSliderUnit(low, databaseInfo.commitCountPerTimeInterval, unit, "start")
  const selectedEndInUnit = timeToSliderUnit(high, databaseInfo.commitCountPerTimeInterval, unit, "end")

  return (
    <CollapsibleHeader
      reversed
      className="card group/card flex flex-col text-center select-none"
      title={() => (
        <TimelineHeader>
          <CheckboxWithLabel
            unstyled
            reversed
            className="gap"
            title="Use log scale for commit counts"
            checked={commitCountScale === "log"}
            onChange={(e) => setCommitCountScale(e.target.checked ? "log" : "linear")}
          >
            Log scale
          </CheckboxWithLabel>
        </TimelineHeader>
      )}
    >
      <div className={cn("group grid", className)}>
        <BarChart scale={commitCountScale} className="grid-full" />
        <TimeSlider
          key={[selectedRange].join("-")}
          startUnits={selectedStartInUnit}
          endUnits={selectedEndInUnit}
          minMs={rangeMin * 1000}
          maxMs={rangeMax * 1000}
          unit={unit}
          domainInUnits={domainInUnits}
          disabled={disabled}
          intervals={databaseInfo.commitCountPerTimeInterval}
        />
      </div>
    </CollapsibleHeader>
  )
}

// function TimePicker({
//   range,
//   timerange,
//   setsBeginning,
//   onChange: onChange,
//   disabled
// }: {
//   range: [number, number]
//   timerange: [number, number]
//   setsBeginning: boolean
//   onChange(e: readonly number[]): void
//   disabled: boolean
// }) {
//   return (
//     <div className="z-30">
//       <DatePicker
//         inline
//         fixedHeight
//         renderCustomHeader={({
//           date,
//           decreaseMonth,
//           increaseMonth,
//           prevMonthButtonDisabled,
//           nextMonthButtonDisabled
//         }) => {
//           return (
//             <div className="m-2 flex justify-between">
//               <button disabled={prevMonthButtonDisabled} onClick={decreaseMonth}>
//                 {"<"}
//               </button>
//               <h2>{dateFormatCalendarHeader(date.getTime())}</h2>
//               <button disabled={nextMonthButtonDisabled} onClick={increaseMonth}>
//                 {">"}
//               </button>
//             </div>
//           )
//         }}
//         disabled={disabled}
//         selected={new Date(range[setsBeginning ? 0 : 1] * 1000)}
//         minDate={new Date(setsBeginning ? timerange[0] * 1000 : Math.max(timerange[0] * 1000, range[0] * 1000))}
//         maxDate={new Date(setsBeginning ? Math.min(timerange[1] * 1000, range[1] * 1000) : timerange[1] * 1000)}
//         onChange={(x: Date | null) => {
//           if (x) {
//             let newRange: [number, number]
//             if (setsBeginning) {
//               newRange = [x.getTime() / 1000, range[1]]
//             } else {
//               newRange = [range[0], x.getTime() / 1000]
//             }
//             onChange(newRange)
//           }
//         }}
//       />
//     </div>
//   )
// }

function TimeSlider({
  startUnits,
  endUnits,
  minMs,
  maxMs,
  domainInUnits,
  unit,
  disabled,
  intervals
}: {
  startUnits: number
  endUnits: number
  minMs: number
  maxMs: number
  unit: TimeUnit
  domainInUnits: number
  disabled: boolean
  intervals: TimeIntervalRef[]
}) {
  const [isPending, startTransition] = useTransition()
  const [, setStartEnd] = useQueryStates({
    start: viewSearchParamsConfig.start
      .withOptions({ limitUrlUpdates: { method: "throttle", timeMs: 1000 } }),
    end: viewSearchParamsConfig.end
      .withOptions({ limitUrlUpdates: { method: "throttle", timeMs: 1000 } })
  })

  const onUpdateSlider = useCallback(
    (e: readonly number[]) => {
      if (e[0] === 0 && e[1] === 0) return

      startTransition(() => {
        const [startTime, endTime] = sliderUnitsToTimeRange({
          startIndex: e[0],
          endIndex: e[1],
          intervals,
          unit,
          minSecs: minMs / 1000,
          maxSecs: maxMs / 1000
        })
        setStartEnd({
          start: startTime,
          end: endTime
        })
        console.warn(startTime, endTime, "SLIDER VALUES")
      })
    },
    [intervals, maxMs, minMs, setStartEnd, unit]
  )

  return (
    <Slider
      className="grid-full pointer-events-none relative"
      mode={3}
      step={1}
      domain={[0, domainInUnits]}
      values={[startUnits, endUnits]}
      disabled={disabled}
      // onUpdate={onUpdateSlider}
      onChange={onUpdateSlider}
    >
      {/* <Rail>{(props) => <SliderRail {...props} />}</Rail> */}
      <Handles>
        {({ handles, getHandleProps }) => (
          <Fragment>
            {handles.map((handle) => {
              // const handlePointsToTheLeft = i === 1 || handle.percent > 10
              return (
                <Fragment key={handle.id}>
                  {/* <div
                    className={cn(
                      "absolute bottom-0 left-(--left) w-max opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",
                      {
                        "left-(--left)": i === 0,
                        "right-[calc(100%-var(--left))] -translate-x-full": handlePointsToTheLeft
                      }
                    )}
                    style={
                      {
                        "--left": `${handle.percent}%`
                      } as CSSProperties
                    }
                  >
                    <Popover
                      key={handle.id}
                      trigger={({ onClick }) => (
                        <button
                          className={cn(
                            "bg-blue-primary text-primary-text-dark h-full cursor-pointer rounded-lg px-1 break-keep shadow",
                            {
                              "rounded-bl-none": !handlePointsToTheLeft,
                              "rounded-br-none": handlePointsToTheLeft
                            }
                          )}
                          onClick={onClick}
                        >
                          <time
                            className="w-max text-xs"
                            dateTime={dateFormatISO(
                              unitToMillis({
                                startTimeMillis,
                                units: i === 0 ? units[0] : units[1],
                                unit
                              })
                            )}
                            title={`Click or drag to set the ${i === 0 ? "start" : "end"} of time range`}
                          >
                            {dateFormatShort(
                              unitToMillis({
                                startTimeMillis,
                                units: i === 0 ? units[0] : units[1],
                                unit
                              })
                            )}
                          </time>
                        </button>
                      )}
                    >
                      <TimePicker
                        setsBeginning={i === 0}
                        range={units.map((units) => unitToMillis({ startTimeMillis, units, unit })) as [number, number]}
                        timerange={timerange}
                        onChange={(newRange) =>
                          setStartEnd({
                            start: newRange[0],
                            end: newRange[1]
                          })
                        }
                        disabled={disabled}
                      />
                    </Popover>
                  </div> */}

                  <button
                    key={handle.id}
                    className={cn(
                      "pointer-events-auto absolute bottom-0 z-10 flex h-6 -translate-x-1/2 place-content-center opacity-0 transition-opacity group-hover/card:opacity-100 disabled:grayscale",
                      {
                        "size-5 rounded-full": false
                      },
                      disabled ? "cursor-progress" : "cursor-col-resize"
                    )}
                    role="slider"
                    aria-disabled={disabled}
                    aria-valuemin={0}
                    aria-valuemax={domainInUnits}
                    aria-valuenow={handle.value}
                    title="Drag to adjust interval"
                    style={{
                      left: `${handle.percent}%`
                    }}
                    {...getHandleProps(handle.id)}
                  >
                    <div className={cn("btn--primary flex h-full w-min items-center")}>
                      <Icon path={mdiDotsVertical} size={0.5} />
                    </div>
                  </button>
                </Fragment>
              )
            })}
          </Fragment>
        )}
      </Handles>
      <Tracks left={false} right={false}>
        {({ tracks, getTrackProps }) => (
          <div>
            {tracks.map(({ id, source, target }) => (
              <div
                key={id}
                className={cn(
                  "bg-blue-primary/20 pointer-events-none absolute right-0 bottom-0 left-0 h-5 cursor-pointer rounded transition-[backdrop-filter]",
                  {
                    "backdrop-blur-2xl": isPending
                  }
                )}
                style={{
                  left: `${source.percent}%`,
                  width: `${target.percent - source.percent}%`
                }}
                {...getTrackProps()}
              />
            ))}
          </div>
        )}
      </Tracks>
    </Slider>
  )
}
