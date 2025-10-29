import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, useNavigation } from "react-router"
import { Fragment, startTransition, useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useOptions } from "~/contexts/OptionsContext"
import { Handle, LabeledTicks, SliderRail, Track } from "./sliderUtils"
import { noEntryColor } from "~/const"
import { useCreateLink } from "~/hooks"

function PercentageSlider() {
  const { dominantAuthorCutoff, setDominantAuthorCutoff } = useOptions()
  const [displayPercentage, setDisplayPercentage] = useState(dominantAuthorCutoff)

  const domain = [0, 100]
  return (
    <div className="relative flex gap-2">
      <p className="w-10">{displayPercentage}%</p>

      <Slider
        mode={1}
        step={1}
        domain={domain}
        rootStyle={{
          position: "relative",
          // left: "43px",
          width: "calc(100% - 55px)",
          zIndex: "0"
        }}
        onChange={(e) => {
          setDominantAuthorCutoff(e[0])
          startTransition(() => {
            setDisplayPercentage(e[0])
          })
        }}
        onUpdate={(e) => {
          startTransition(() => {
            setDisplayPercentage(e[0])
          })
        }}
        values={[displayPercentage]}
      >
        <Rail>{SliderRail}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <Fragment>
              {handles.map((handle) => (
                <Handle
                  title="Adjust the minimum percentage of line changes, that the top author should have, for each file to be colored."
                  key={handle.id}
                  handle={handle}
                  domain={domain}
                  getHandleProps={getHandleProps}
                />
              ))}
            </Fragment>
          )}
        </Handles>
        <Tracks right={false}>
          {({ tracks, getTrackProps }) => (
            <Fragment>
              {tracks.map(({ id, ...props }) => (
                <Track {...props} backgroundColor={noEntryColor} key={id} getTrackProps={getTrackProps} />
              ))}
            </Fragment>
          )}
        </Tracks>
        <LabeledTicks
          valueMap={{
            0: "Top author",
            50: "Majority author",
            100: "Single author"
          }}
        />
      </Slider>
    </div>
  )
}

export function AuthorOptions({ showUnionAuthorsModal }: { showUnionAuthorsModal: () => void }) {
  const transitionState = useNavigation()
  const { url: action } = useCreateLink()()

  return (
    <>
      <PercentageSlider />
      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        <button className="btn" onClick={showUnionAuthorsModal}>
          <Icon path={mdiAccountMultiple} />
          Group authors
        </button>
        <Form method="post" action={action}>
          <input type="hidden" name="rerollColors" value="" />
          <button className="btn" type="submit" disabled={transitionState.state !== "idle"}>
            <Icon path={mdiDiceMultipleOutline} />
            New author colors
          </button>
        </Form>
      </div>
    </>
  )
}
