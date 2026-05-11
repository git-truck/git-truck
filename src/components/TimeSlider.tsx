import { useNavigation } from "react-router"
import { Fragment, useCallback, useState, useTransition, type CSSProperties } from "react"
import { Slider, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { $inspect, dateFormatCalendarHeader, dateFormatISO, dateFormatShort } from "~/shared/util"
import DatePicker from "react-datepicker"
import { Popover } from "~/components/Popover"
import { cn } from "~/styling"
import BarChart from "~/components/BarChart"
import { useViewSubmit } from "~/hooks"
import { TimelineHeader } from "~/components/Timeline/TimelineHeader"
import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { mdiDotsVertical } from "@mdi/js"
import { Icon } from "~/components/Icon"

import { Temporal } from "temporal-polyfill"
import { millisToUnit, TimeUnitDurationsMs, unitToMillis, type TimeUnit } from "~/shared/utils/time"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"

export function Timeline({ className }: { className?: string }) {
  const [commitCountScale, setCommitCountScale] = useState<"linear" | "log">("log")
  const { databaseInfo } = useData()
  const { timerange, selectedRange } = databaseInfo
  const startTimeMillis = timerange[0] * 1000
  const endTimeMillis = timerange[1] * 1000
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

  const selectedStartInUnit = Math.floor(millisToUnit({ startTimeMillis, millis: low * 1000, unit }))
  const selectedEndInUnit = Math.ceil(millisToUnit({ startTimeMillis, millis: high * 1000, unit }))

  const dateStart = Temporal.Instant.fromEpochMilliseconds(startTimeMillis)
  const dateEnd = Temporal.Instant.fromEpochMilliseconds(endTimeMillis)
  const domainInUnits = Math.ceil(
    dateStart.until(dateEnd, { largestUnit: "milliseconds" }).milliseconds / TimeUnitDurationsMs[unit]
  )

  return (
    <div className="flex flex-col pb-4 text-center select-none">
      <TimelineHeader>
        <CheckboxWithLabel
          unstyled
          reversed
          className="gap w-max"
          title="Use log scale for commit counts"
          checked={commitCountScale === "log"}
          onChange={(e) => setCommitCountScale(e.target.checked ? "log" : "linear")}
        >
          Log scale
        </CheckboxWithLabel>
      </TimelineHeader>
      <div className={cn("group grid", className)}>
        <BarChart scale={commitCountScale} className="grid-full" />
        <TimeSlider
          key={$inspect([selectedRange].join("-"), { label: "timerange key" })}
          startUnits={selectedStartInUnit}
          endUnits={selectedEndInUnit}
          minMs={rangeMin * 1000}
          maxMs={rangeMax * 1000}
          unit={unit}
          domainInUnits={domainInUnits}
          disabled={disabled}
        />
      </div>
    </div>
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
  disabled
}: {
  startUnits: number
  endUnits: number
  minMs: number
  maxMs: number
  unit: TimeUnit
  domainInUnits: number
  disabled: boolean
  // onChange: (range: [number, number]) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [qs, setStartEnd] = useQueryStates({
    start: viewSearchParamsConfig.start
      .withDefault(minMs / 1000)
      .withOptions({ limitUrlUpdates: { method: "throttle", timeMs: 1000 } }),
    end: viewSearchParamsConfig.end
      .withDefault(maxMs / 1000)
      .withOptions({ limitUrlUpdates: { method: "throttle", timeMs: 1000 } })
  })

  // const units = [low, high].map((time) => millisToUnit({ startTimeMillis: min * 1000, millis: time * 1000, unit }))
  const startTimeMillis = minMs

  // const units = [qs.end, qs.end].map((time) =>
  //   millisToUnit({ startTimeMillis, millis: time * 1000, unit })
  // )
  // const timerange: [number, number] = [minMs, maxMs]

  const onUpdateSlider = useCallback(
    (e: readonly number[]) => {
      console.info("Slider updating with values", e)
      if (e[0] === 0 && e[1] === 0) return

      startTransition(() => {
        const startTime = unitToMillis({ startTimeMillis, units: e[0], unit }) / 1000
        const endTime = unitToMillis({ startTimeMillis, units: e[1], unit }) / 1000
        setStartEnd({
          start: startTime,
          end: endTime
        })
      })
    },
    [setStartEnd, startTimeMillis, unit]
  )

  return (
    <Slider
      className="grid-full relative"
      mode={3}
      step={1}
      domain={$inspect([0, domainInUnits], { trace: false, label: "domain" })}
      values={$inspect([startUnits, endUnits], { label: "values" })}
      disabled={disabled}
      // onUpdate={onUpdateSlider}
      onChange={onUpdateSlider}
    >
      {/* <Rail>{(props) => <SliderRail {...props} />}</Rail> */}
      <Handles>
        {({ handles, getHandleProps }) => (
          <Fragment>
            {handles.map((handle, i) => {
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
                      "absolute top-4 bottom-4 z-10 flex size-5 -translate-x-1/2 -translate-y-1.5 place-content-center disabled:grayscale",
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
                className={cn("bg-blue-primary/10 absolute inset-0 cursor-pointer transition-[backdrop-filter]", {
                  "backdrop-blur-2xl": isPending
                })}
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
