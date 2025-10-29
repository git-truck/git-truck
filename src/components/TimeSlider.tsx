import { useSubmit, useNavigation, useSearchParams } from "react-router"
import { useState, useTransition } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { dateFormatCalendarHeader, dateFormatISO, dateFormatShort, getPathFromRepoAndHead } from "~/shared/util"
import DatePicker from "react-datepicker"
import { Handle, SliderRail, TicksByCount, Track } from "./sliderUtils"
import { Popover } from "./Popover"
import { cn } from "~/styling"
import { Icon } from "./Icon"
import { mdiDotsHorizontal } from "@mdi/js"

export default function TimeSlider() {
  const [_, startTransition] = useTransition()

  const { databaseInfo } = useData()
  const { newestChangeDate, oldestChangeDate, timerange, selectedRange } = databaseInfo
  const submit = useSubmit()
  const [range, setRange] = useState(selectedRange[0] === 0 ? timerange : selectedRange)

  const navigationData = useNavigation()
  const disabled = navigationData.state !== "idle"
  const [searchParams] = useSearchParams()

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      action: getPathFromRepoAndHead({
        path: searchParams.get("path")!,
        branch: databaseInfo.branch
      }),
      method: "post"
    })
  }

  const selectedStartDate = range[0] * 1000
  const selectedEndDate = range[1] * 1000

  return (
    <>
      <Slider
        className="relative"
        mode={2}
        step={1}
        domain={timerange}
        onUpdate={(e) =>
          startTransition(() => {
            setRange([...e] as [number, number])
          })
        }
        onChange={(e) => {
          startTransition(() => {
            updateTimeseries(e)
          })
        }}
        values={range}
        disabled={disabled}
      >
        <Rail>{SliderRail}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div>
              {handles.map((handle, i) => (
                <Handle
                  title="Drag to adjust interval, click to set specific date"
                  key={handle.id}
                  className={cn("w-auto", i === 0 ? "rounded-r-none" : "-translate-x-[calc(100%-12px)] rounded-l-none")}
                  handle={handle}
                  domain={timerange}
                  getHandleProps={getHandleProps}
                >
                  <time
                    className={cn("bottom-0 flex flex-row gap-0.5 text-xs text-nowrap", {
                      "flex-row-reverse": i === 0
                    })}
                    dateTime={dateFormatISO(i === 0 ? selectedStartDate : selectedEndDate)}
                    title={`Click or drag to set the ${i === 0 ? "start" : "end"} of time range`}
                  >
                    {dateFormatShort(i === 0 ? selectedStartDate : selectedEndDate)}
                    <Popover
                      trigger={({ onClick }) => (
                        <button
                          className="btn--text"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClick()
                          }}
                          title="Open date picker"
                        >
                          <Icon path={mdiDotsHorizontal} />
                        </button>
                      )}
                    >
                      <TimePicker
                        range={range}
                        setRange={setRange}
                        timerange={timerange}
                        setsBeginning
                        updateTimeseries={updateTimeseries}
                        disabled={disabled}
                      />
                    </Popover>
                  </time>
                </Handle>
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div>
              {tracks.map(({ id, source, target }) => (
                <Track
                  backgroundColor="#7aa0c4"
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                  // disabled={disabled}
                />
              ))}
            </div>
          )}
        </Tracks>
      </Slider>
      <TicksByCount
        count={5}
        // align="left"
        tickToLabel={(t) => dateFormatShort((oldestChangeDate + (newestChangeDate - oldestChangeDate) * t) * 1000)}
      />
    </>
  )
}

function TimePicker({
  range,
  setRange,
  timerange,
  setsBeginning,
  updateTimeseries,
  disabled
}: {
  range: [number, number]
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>
  timerange: [number, number]
  setsBeginning: boolean
  updateTimeseries(e: readonly number[]): void
  disabled: boolean
}) {
  return (
    <div>
      <DatePicker
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled
        }) => {
          return (
            <div className="m-2 flex justify-between">
              <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
                {"<"}
              </button>
              <h2>{dateFormatCalendarHeader(date.getTime())}</h2>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                {">"}
              </button>
            </div>
          )
        }}
        inline
        fixedHeight
        disabled={disabled}
        selected={new Date(range[setsBeginning ? 0 : 1] * 1000)}
        minDate={new Date(setsBeginning ? timerange[0] * 1000 : Math.max(timerange[0] * 1000, range[0] * 1000))}
        maxDate={new Date(setsBeginning ? Math.min(timerange[1] * 1000, range[1] * 1000) : timerange[1] * 1000)}
        onChange={(x) => {
          if (x) {
            let newRange: [number, number]
            if (setsBeginning) {
              newRange = [x.getTime() / 1000, range[1]]
            } else {
              newRange = [range[0], x.getTime() / 1000]
            }
            setRange(newRange)
            updateTimeseries(newRange)
          }
        }}
      />
    </div>
  )
}
