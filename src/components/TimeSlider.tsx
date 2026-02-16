import { useSubmit, useNavigation, useSearchParams } from "react-router"
import { useState, useTransition, type CSSProperties } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { dateFormatCalendarHeader, dateFormatISO, dateFormatShort, getPathFromRepoAndHead } from "~/shared/util"
import DatePicker from "react-datepicker"
import { Handle, SliderRail, TicksByCount, Track } from "./sliderUtils"
import { Popover } from "./Popover"
import { cn } from "~/styling"
import BarChart from "./BarChart"

export default function Timeline({ className }: { className?: string }) {
  const [_, startTransition] = useTransition()

  const { databaseInfo } = useData()
  const { timerange, selectedRange } = databaseInfo
  const newestChangeDate = timerange[1]
  const oldestChangeDate = timerange[0]

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
    <div className={cn("group flex flex-col gap-2", className)}>
      <BarChart />
      <Slider
        className="relative"
        mode={2}
        step={1}
        domain={timerange}
        values={range}
        disabled={disabled}
        onUpdate={(e) => setRange([...e] as [number, number])}
        onChange={(e) => {
          startTransition(() => {
            updateTimeseries(e)
          })
        }}
      >
        <Rail>{SliderRail}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="">
              {handles.map((handle, i) => (
                <>
                  <div
                    className={cn(
                      "absolute left-(--left) w-max translate-y-[calc(50%)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",
                      {
                        "left-(--left)": i === 0,
                        "right-[calc(100%-var(--left))] -translate-x-full": i === 1
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
                            "bg-blue-primary text-primary-text-dark cursor-pointer rounded-lg px-1 break-keep shadow",
                            {
                              "rounded-tl-none": i === 0,
                              "rounded-tr-none": i === 1
                            }
                          )}
                          onClick={onClick}
                        >
                          <time
                            className="w-max text-xs"
                            dateTime={dateFormatISO(i === 0 ? selectedStartDate : selectedEndDate)}
                            title={`Click or drag to set the ${i === 0 ? "start" : "end"} of time range`}
                          >
                            {dateFormatShort(i === 0 ? selectedStartDate : selectedEndDate)}
                          </time>
                        </button>
                      )}
                    >
                      <TimePicker
                        setsBeginning
                        range={range}
                        setRange={setRange}
                        timerange={timerange}
                        updateTimeseries={updateTimeseries}
                        disabled={disabled}
                      />
                    </Popover>
                  </div>
                  <Handle
                    key={handle.id}
                    handleType="square"
                    title="Drag to adjust interval, click to set specific date"
                    className={cn("")}
                    handle={handle}
                    domain={timerange}
                    getHandleProps={getHandleProps}
                  ></Handle>
                </>
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div>
              {tracks.map(({ id, source, target }) => (
                <Track
                  key={id}
                  trackType="square"
                  backgroundColor="#7aa0c4"
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
        className="mb-2"
        // TODO: Fix tick spacing. Temporary fix: keep only outer most ticks
        // count={15}
        count={1}
        // align="left"
        tickToLabel={(t) => dateFormatShort((oldestChangeDate + (newestChangeDate - oldestChangeDate) * t) * 1000)}
      />
    </div>
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
    <div className="z-30">
      <DatePicker
        inline
        fixedHeight
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled
        }) => {
          return (
            <div className="m-2 flex justify-between">
              <button disabled={prevMonthButtonDisabled} onClick={decreaseMonth}>
                {"<"}
              </button>
              <h2>{dateFormatCalendarHeader(date.getTime())}</h2>
              <button disabled={nextMonthButtonDisabled} onClick={increaseMonth}>
                {">"}
              </button>
            </div>
          )
        }}
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
