import { Spacer } from "~/components/Spacer"
import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import type { MetricCache } from "../../metrics/metrics"
import { getMetricDescription, getMetricLegendType, Metric } from "../../metrics/metrics"
import { PeopleAlt } from "@styled-icons/material"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend(props: { showUnionAuthorsModal: () => void }) {
  const { metricType, authorshipType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData[authorshipType].get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch (getMetricLegendType(metricType)) {
    case "POINT":
      legend = <PointLegend metricCache={metricCache}></PointLegend>
      break
    case "GRADIENT":
      legend = <GradientLegend metricCache={metricCache}></GradientLegend>
      break
    case "SEGMENTS":
      legend = <SegmentLegend metricCache={metricCache}></SegmentLegend>
      break
  }

  return (
    <div className="box sticky bottom-0 self-end">
      <h3 className="box__subtitle">{Metric[metricType]}</h3>
      <Spacer />
      <p className="box-p">{getMetricDescription(metricType, authorshipType)}</p>
      <Spacer lg />
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <>
          <button className="btn" onClick={props.showUnionAuthorsModal}>
            <PeopleAlt display="inline-block" height="1rem" />
            Group authors
          </button>
          <Spacer lg />
        </>
      ) : null}
      {legend}
    </div>
  )
}

export interface MetricLegendProps {
  metricCache: MetricCache
}
