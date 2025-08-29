import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, useNavigation } from "react-router"
import { startTransition, useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { getPathFromRepoAndHead } from "~/shared/util"
import { Handle, LabeledTicks, Track } from "./sliderUtils"
import { noEntryColor } from "~/const"

function PercentageSlider() {
  const { dominantAuthorCutoff, setDominantAuthorCutoff } = useOptions()
  const [displayPercentage, setDisplayPercentage] = useState(dominantAuthorCutoff)

  const sliderStyle: React.CSSProperties = {
    position: "relative",
    left: "43px",
    top: "7px",
    width: "calc(100% - 55px)",
    zIndex: "0"
  }

  const railStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: 14,
    borderRadius: 7,
    cursor: "pointer",
    backgroundColor: "#7aa0c4"
  }

  const domain = [0, 100]
  return (
    <div className="relative">
      <Slider
        className="mb-10"
        mode={1}
        step={1}
        domain={domain}
        rootStyle={sliderStyle}
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
        <Rail>{({ getRailProps }) => <div style={railStyle} {...getRailProps()} />}</Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle key={handle.id} handle={handle} domain={domain} getHandleProps={getHandleProps} />
              ))}
            </div>
          )}
        </Handles>
        <Tracks right={false}>
          {({ tracks, getTrackProps }) => (
            <div className="slider-tracks">
              {tracks.map(({ id, source, target }) => (
                <Track
                  backgroundColor={noEntryColor}
                  key={id}
                  source={source}
                  target={target}
                  getTrackProps={getTrackProps}
                />
              ))}
            </div>
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
      <p className="absolute top-0">{displayPercentage}%</p>
    </div>
  )
}

export function AuthorOptions({ showUnionAuthorsModal }: { showUnionAuthorsModal: () => void }) {
  const transitionState = useNavigation()
  const { repo } = useData()

  return (
    <>
      <p className="text-xs/normal">
        Adjust the minimum percentage of line changes, that the top author should have, for each file to be colored.
      </p>
      <PercentageSlider />
      <div className="mt-2 flex justify-evenly gap-2">
        <button className="btn btn--text" onClick={showUnionAuthorsModal}>
          <Icon path={mdiAccountMultiple} />
          Group authors
        </button>
        <Form method="post" action={`/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`}>
          <input type="hidden" name="rerollColors" value="" />
          <button className="btn btn--text" type="submit" disabled={transitionState.state !== "idle"}>
            <Icon path={mdiDiceMultipleOutline} />
            New author colors
          </button>
        </Form>
      </div>
    </>
  )
}
