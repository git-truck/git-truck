import { mdiAccountMultiple, mdiDiceMultipleOutline, mdiPercentBoxOutline } from "@mdi/js"
import Icon from "@mdi/react"
import { useNavigation, useSubmit } from "@remix-run/react"
import { useState } from "react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { getPathFromRepoAndHead } from "~/util"
import { Handle, Track } from "./sliderUtils"

function PercentageSlider() {
    const { dominantAuthorCutoff, setDominantAuthorCutoff } = useOptions()
    const [displayPercentage, setDisplayPercentage] = useState(dominantAuthorCutoff)

    const sliderStyle: React.CSSProperties = {
      position: "relative",
      left: "43px",
      top: "7px",
      width: "calc(100% - 53px)"
    }

    const railStyle: React.CSSProperties = {
      position: "absolute",
      width: "100%",
      height: 14,
      borderRadius: 7,
      cursor: "pointer",
      backgroundColor: "rgb(155,155,155)"
    }

    const domain = [0, 100]
    return (
      <>
        <Slider
          mode={1}
          step={1}
          domain={domain}
          rootStyle={sliderStyle}
          onChange={(e) => {
            console.log(e)
            setDominantAuthorCutoff(e[0])
            setDisplayPercentage(e[0])
          }}
          onUpdate={(e) => {
            setDisplayPercentage(e[0])
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
                  <Track key={id} source={source} target={target} getTrackProps={getTrackProps} />
                ))}
              </div>
            )}
          </Tracks>
        </Slider>
        <p>{displayPercentage}%</p>
      </>
    )
  }

export function AuthorOptions({showUnionAuthorsModal}: {showUnionAuthorsModal: () => void}) {
    const submit = useSubmit()
    const transitionState = useNavigation()
    const { repo } = useData()
  
    function rerollColors() {
      const form = new FormData()
      form.append("rerollColors", "")
    
      submit(form, {
        action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
        method: "post"
      })
    }
  
    return (
      <div className="card">
        <h2 className="card__title">Author options</h2>
        <button className="btn" onClick={showUnionAuthorsModal}>
          <Icon path={mdiAccountMultiple} />
          Group authors
        </button>
        <button className="btn" disabled={transitionState.state !== "idle"} onClick={rerollColors}>
          <Icon path={mdiDiceMultipleOutline} />
          Generate new author colors
        </button>
        <fieldset className="rounded-lg border p-2">
          <legend
            className="card__title ml-1.5 justify-start gap-2"
            title="Only colors a file according to its top contributor, if the top contributor has made at least the chosen percentage of total line changes"
          >
            <Icon path={mdiPercentBoxOutline} size="1.25em" />
            Authorship cutoff percentage
          </legend>
          <p className="card-p">Choose the minimum percentage authorship the top contributor of each file should have, for that file to be colored the author's color</p>
          <PercentageSlider />
        </fieldset>
      </div>
    )
  }