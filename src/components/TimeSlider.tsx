import { useSubmit, useNavigation } from "react-router"
import { useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { dateFormatCalendarHeader, dateFormatShort, getPathFromRepoAndHead } from "~/shared/util"
// import ClipLoader from "react-spinners/ClipLoader"
import { Popover } from "./Popover"
import DatePicker from "react-datepicker"
import { Handle, TicksByCount, Track } from "./sliderUtils"
import { missingInMapColor, sliderPadding } from "~/const"
import { Icon } from "~/components/Icon"
import { mdiCalendarArrowLeft, mdiCalendarArrowRight } from "@mdi/js"

function DateTags({
  range,
  timerange,
  setRange,
  updateTimeseries,
  disabled
}: {
  range: [number, number]
  timerange: [number, number]
  setRange: React.Dispatch<React.SetStateAction<[number, number]>>
  updateTimeseries(e: readonly number[]): void
  disabled: boolean
}) {
  const timerangeSpan = timerange[1] - timerange[0]

  const selectedStartDate = range[0] * 1000
  const selectedEndDate = range[1] * 1000
  const percentageStart = ((range[0] - timerange[0]) / timerangeSpan) * 100

  const percentageEnd = ((range[1] - timerange[0]) / (timerange[1] - timerange[0])) * 100

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: 14,
        borderRadius: 7,
        cursor: "pointer",
        backgroundColor: missingInMapColor
      }}
    >
      <Popover
        trigger={({ onClick }) => (
          <button
            title="Set the date of the start of the time range"
            style={{
              left: `${percentageStart}%`,
              bottom: "100%",
              position: "absolute",
              transform: "translate(0%, -15%)",
              width: "100px",
              whiteSpace: "nowrap"
            }}
            className="btn btn--primary"
            onClick={onClick}
          >
            <Icon path={mdiCalendarArrowRight} />
            {dateFormatShort(selectedStartDate)}
          </button>
        )}
      >
        <TimePicker
          range={range}
          setRange={setRange}
          timerange={timerange}
          setsBeginning={true}
          updateTimeseries={updateTimeseries}
          disabled={disabled}
        />
      </Popover>

      <Popover
        trigger={({ onClick }) => (
          <button
            title="Set the date of the end of the time range"
            style={{
              left: `${percentageEnd}%`,
              bottom: "100%",
              position: "absolute",
              transform: "translate(-100%, -15%)",
              width: "100px",
              whiteSpace: "nowrap"
            }}
            className="btn btn--primary"
            onClick={onClick}
          >
            {dateFormatShort(selectedEndDate)}
            <Icon path={mdiCalendarArrowLeft} />
          </button>
        )}
      >
        <TimePicker
          range={range}
          setRange={setRange}
          timerange={timerange}
          setsBeginning={false}
          updateTimeseries={updateTimeseries}
          disabled={disabled}
        />
      </Popover>
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

export default function TimeSlider() {
  const sliderStyle: React.CSSProperties = {
    left: sliderPadding / 2,
    top: "30px",
    position: "relative",
    width: `calc(100% - ${sliderPadding}px)`
  }

  const { databaseInfo } = useData()
  const { newestChangeDate, oldestChangeDate, timerange, selectedRange } = databaseInfo
  const submit = useSubmit()
  const [range, setRange] = useState(selectedRange[0] === 0 ? timerange : selectedRange)

  const navigationData = useNavigation()
  const disabled = navigationData.state !== "idle"

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      action: `/${getPathFromRepoAndHead(databaseInfo.repo, databaseInfo.branch)}`,
      method: "post"
    })
  }

  return (
    <div style={{ height: 100, width: "100%", textAlign: "center" }}>
      {/* <LabeledTicks
        onTop
        valueMap={{
          0: dateFormatShort(oldestChangeDate * 1000),
          25: dateFormatShort((oldestChangeDate + (newestChangeDate - oldestChangeDate) / 4) * 1000),
          50: dateFormatShort((oldestChangeDate + (newestChangeDate - oldestChangeDate) / 2) * 1000),
          75: dateFormatShort((oldestChangeDate + ((newestChangeDate - oldestChangeDate) / 4) * 3) * 1000),
          100: dateFormatShort(newestChangeDate * 1000)
        }}
      /> */}
      <TicksByCount
        count={3}
        tickToLabel={(t) => {
          console.log(t)
          return dateFormatShort((oldestChangeDate + (newestChangeDate - oldestChangeDate) * t) * 1000)
        }}
      />
      <Slider
        mode={2}
        step={1}
        domain={timerange}
        rootStyle={sliderStyle}
        onUpdate={(e) => setRange([...e] as [number, number])}
        onChange={(e) => {
          updateTimeseries(e)
        }}
        values={range}
        disabled={disabled}
      >
        <Rail>
          {() => (
            <>
              <DateTags
                setRange={setRange}
                timerange={timerange}
                range={range}
                updateTimeseries={updateTimeseries}
                disabled={disabled}
              />
              {/* <div
                style={{
                  left: "-50px",
                  top: "-8px",
                  position: "absolute"
                }}
              >
                <ClipLoader title="Loading selected time range" size={30} loading={disabled} color="#7aa0c4" />
              </div> */}
            </>
          )}
        </Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle
                  key={handle.id}
                  handle={handle}
                  domain={timerange}
                  getHandleProps={getHandleProps}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div className="slider-tracks">
              {tracks.map(({ id, source, target }) => (
                <Track
                  backgroundColor="#7aa0c4"
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </Tracks>
      </Slider>
    </div>
  )
}
