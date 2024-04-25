import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "@mdi/react"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"
import type { GitObject } from "~/analyzer/model"
import { useDeferredValue } from "react"
import { getPathFromRepoAndHead } from "~/util"
import { useData } from "~/contexts/DataContext"
import { useNavigation, useSubmit } from "@remix-run/react"
import { Slider, Rail, Handles, Tracks } from "react-compound-slider"
import { Handle, Track } from "../sliderUtils"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend({
  hoveredObject,
  showUnionAuthorsModal,
  className = ""
}: {
  hoveredObject: GitObject | null
  showUnionAuthorsModal: () => void
  className?: string
}) {
  const submit = useSubmit()
  const { metricType, dominantAuthorCutoff, setDominantAuthorCutoff } = useOptions()
  const [metricsData] = useMetrics()
  const deferredHoveredObject = useDeferredValue(hoveredObject)
  const { repo } = useData()
  const transitionState = useNavigation()

  const metricCache = metricsData.get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch (getMetricLegendType(metricType)) {
    case "POINT":
      legend = <PointLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
    case "GRADIENT":
      legend = <GradientLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
    case "SEGMENTS":
      legend = <SegmentLegend metricCache={metricCache} hoveredObject={deferredHoveredObject} />
      break
  }

  function rerollColors() {
    const form = new FormData()
    form.append("rerollColors", "")

    submit(form, {
      action: `/${getPathFromRepoAndHead(repo.name, repo.currentHead)}`,
      method: "post"
    })
  }


  function PercentageSlider() {
    const sliderStyle: React.CSSProperties = {
      margin: '5%',
      position: 'relative',
      width: '90%'
    };

    const railStyle: React.CSSProperties = {
      position: 'absolute',
      width: '100%',
      height: 14,
      borderRadius: 7,
      cursor: 'pointer',
      backgroundColor: 'rgb(155,155,155)'
    };

    const domain = [0, 100]
    return (
      <Slider
      mode={1}
      step={1}
      domain={domain}
      rootStyle={sliderStyle}
      onChange={(e) => {
        console.log(e)
        setDominantAuthorCutoff(e[0])
      }}
      values={[dominantAuthorCutoff]}
    >
      <Rail>
        {({ getRailProps }) => (
          <div style={railStyle} {...getRailProps()} />
        )}
      </Rail>
      <Handles>
        {({ handles, getHandleProps }) => (
          <div className="slider-handles">
            {handles.map(handle => (
              <Handle
                key={handle.id}
                handle={handle}
                domain={domain}
                getHandleProps={getHandleProps}
              />
            ))}
          </div>
        )}
      </Handles>
      <Tracks right={false}>
        {({ tracks, getTrackProps }) => (
          <div className="slider-tracks">
            {tracks.map(({ id, source, target }) => (
              <Track
                key={id}
                source={source}
                target={target}
                getTrackProps={getTrackProps}
              />
            ))}
          </div>
        )}
      </Tracks>
    </Slider>
    )
  }

  return (
    <div className={`card flex-shrink-0 overflow-hidden ${className}`}>
      <h2 className="card__title">Legend</h2>
      <h3 className="card__subtitle">{Metric[metricType]}</h3>
      <p className="card-p">{getMetricDescription(metricType)}</p>
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <>
          <button className="btn" onClick={showUnionAuthorsModal}>
            <Icon path={mdiAccountMultiple} />
            Group authors
          </button>
          <button className="btn" disabled={transitionState.state !== "idle"} onClick={rerollColors}>
            <Icon path={mdiDiceMultipleOutline} />
            Generate new author colors
          </button>
        </>
      ) : null}
      {metricType === "TOP_CONTRIBUTOR" ? (
        <PercentageSlider />
      ) : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  hoveredObject: GitObject | null
  metricCache: MetricCache
}
