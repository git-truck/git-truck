import { useState, startTransition, Fragment } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { noEntryColor } from "~/const"
import { useOptions } from "~/contexts/OptionsContext"
import { SliderRail, Handle, Track, LabeledTicks } from "~/components/sliderUtils"
import { cn } from "~/styling"

export function PercentageSlider({ className = "" }: { className?: string }) {
  const { topContributorCutoff, setTopContributorCutoff } = useOptions()
  const [displayPercentage, setDisplayPercentage] = useState(topContributorCutoff)

  const domain = [0, 100]
  return (
    <div className={cn("grid grid-cols-[calc(11*var(--spacing))_1fr] px-3", className)}>
      <p title="Min percentage of changes a file's top contributor must account for to be colored.">
        {displayPercentage}%
      </p>

      <div className="relative" title="Adjust the top contributor percentage cutoff">
        <Slider
          mode={1}
          step={1}
          domain={domain}
          values={[displayPercentage]}
          onChange={(e) => {
            setTopContributorCutoff(e[0])
            startTransition(() => {
              setDisplayPercentage(e[0])
            })
          }}
          onUpdate={(e) => {
            startTransition(() => {
              setDisplayPercentage(e[0])
            })
          }}
        >
          <Rail>{(props) => <SliderRail {...props} />}</Rail>
          <Handles>
            {({ handles, getHandleProps }) => (
              <Fragment>
                {handles.map((handle) => (
                  <Handle key={handle.id} handle={handle} domain={domain} getHandleProps={getHandleProps} />
                ))}
              </Fragment>
            )}
          </Handles>
          <Tracks right={false}>
            {({ tracks, getTrackProps }) => (
              <Fragment>
                {tracks.map(({ id, ...props }) => (
                  <Track {...props} key={id} backgroundColor={noEntryColor} getTrackProps={getTrackProps} />
                ))}
              </Fragment>
            )}
          </Tracks>
          <LabeledTicks
            valueMap={{
              0: "Top contributor",
              50: "Majority contributor",
              100: "Single contributor"
            }}
          />
        </Slider>
      </div>
    </div>
  )
}
