/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useSubmit, useNavigation } from "@remix-run/react"
import { useMemo, useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { dateFormatCalendarHeader, dateFormatShort, getPathFromRepoAndHead } from "~/util"
import ClipLoader from "react-spinners/ClipLoader"
import { Popover, ArrowContainer } from "react-tiny-popover"
import DatePicker from "react-datepicker"
import { Handle, Track } from "./sliderUtils"

function DateTags({range, timerange, setRange, updateTimeseries, disabled}: {range: [number, number], timerange: [number, number], setRange: React.Dispatch<React.SetStateAction<[number, number]>>, updateTimeseries(e: readonly number[]): void, disabled: boolean}) {
  const [startRangeDatePickerOpen, setStartRangeDatePickerOpen] = useState(false)
  const [endRangeDatePickerOpen, setEndRangeDatePickerOpen] = useState(false)

  const selectedStartDate = useMemo(() => new Date(range[0] * 1000), [range])
  const selectedEndDate = useMemo(() => new Date(range[1] * 1000), [range])
  const percentageStart = useMemo(
    () => ((range[0] - timerange[0]) / (timerange[1] - timerange[0])) * 100,
    [range, timerange]
  )
  const percentageEnd = useMemo(
    () => ((range[1] - timerange[0]) / (timerange[1] - timerange[0])) * 100,
    [range, timerange]
  )
  
  const railStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: 14,
    borderRadius: 7,
    cursor: "pointer",
    backgroundColor: "rgb(155,155,155)"
  }

  return (
    <div style={railStyle}>
      <Popover
        isOpen={startRangeDatePickerOpen}
        positions={["top", "left", "right", "bottom"]}
        onClickOutside={() => {
          setStartRangeDatePickerOpen(false)
        }}
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowSize={10}
            arrowColor="white"
          >
            <TimePicker range={range} setRange={setRange} timerange={timerange} setsBeginning={true} updateTimeseries={updateTimeseries} disabled={disabled} />
          </ArrowContainer>
        )}
      >
        <p
          style={{
            left: `${percentageStart}%`,
            bottom: "100%",
            position: "absolute",
            transform: "translate(-100%, -50%)",
            width: "80px",
            whiteSpace: "nowrap"
          }}
          onClick={() => {
            setStartRangeDatePickerOpen(!startRangeDatePickerOpen)
          }}
        >
          {dateFormatShort(selectedStartDate.getTime())}
        </p>
      </Popover>

      <Popover
        isOpen={endRangeDatePickerOpen}
        positions={["top", "left", "right", "bottom"]}
        onClickOutside={() => {
          setEndRangeDatePickerOpen(false)
        }}
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowSize={10}
            arrowColor="white"
          >
            <TimePicker range={range} setRange={setRange} timerange={timerange} setsBeginning={false} updateTimeseries={updateTimeseries} disabled={disabled} />
          </ArrowContainer>
        )}
      >
        <p
          style={{
            left: `${percentageEnd}%`,
            bottom: "100%",
            position: "absolute",
            transform: "translate(0%, -50%)",
            width: "80px",
            whiteSpace: "nowrap"
          }}
          onClick={() => {
            setEndRangeDatePickerOpen(!endRangeDatePickerOpen)
            console.log("bruh?")
          }}
        >
          {dateFormatShort(selectedEndDate.getTime())}
        </p>
      </Popover>
    </div>
  )
}

function TimePicker({range, setRange, timerange, setsBeginning, updateTimeseries, disabled}: { range:[number, number], setRange: React.Dispatch<React.SetStateAction<[number, number]>>, timerange: [number, number], setsBeginning: boolean, updateTimeseries(e: readonly number[]): void, disabled: boolean }) {
  return(
    <div>
    <DatePicker
      renderCustomHeader={({
        date,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => {
        return (
          <div className="flex justify-between m-2">
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
      selected={new Date(range[setsBeginning ? 0 :1] * 1000)} 
      minDate={new Date( setsBeginning ? timerange[0] * 1000 : Math.max(timerange[0] * 1000, range[0] * 1000))}
      maxDate={new Date( setsBeginning ? Math.min(timerange[1] * 1000, range[1] * 1000) : timerange[1] * 1000)}
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
      }}/>
      </div>
  )
}

export default function TimeSlider() {
  const sliderStyle: React.CSSProperties = {
    left: "70px",
    top: "30px",
    position: "relative",
    width: "calc(100% - 150px)"
  }

  const { repodata2 } = useData()
  const { timerange } = repodata2
  const submit = useSubmit()
  const [range, setRange] = useState(timerange)
  
  const navigationData = useNavigation()
  const disabled = navigationData.state !== "idle"

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      action: `/${getPathFromRepoAndHead(repodata2.repo, repodata2.branch)}`,
      method: "post"
    })
  }

  return (
    <div style={{ height: 60, width: "100%", textAlign: "center" }}>
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
              <DateTags setRange={setRange} timerange={timerange} range={range} updateTimeseries={updateTimeseries} disabled={disabled}/>
              <div style={{
                left: "-50px",
                top: "-8px",
                position: "absolute"
              }}>
                <ClipLoader title="Loading selected time range" size={30} loading={disabled} color="#7aa0c4" />
              </div>
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
                <Track key={id} source={source} target={target} getTrackProps={getTrackProps} disabled={disabled} />
              ))}
            </div>
          )}
        </Tracks>
      </Slider>
    </div>
  )
}
