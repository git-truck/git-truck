import styled from "styled-components"
import { Spacer } from "~/components/Spacer"
import { useMetrics } from "../../contexts/MetricContext"
import { useOptions } from "../../contexts/OptionsContext"
import {
  getMetricDescription,
  getMetricLegendType,
  Metric,
  MetricCache,
} from "../../metrics/metrics"
import { Box, BoxP, BoxSubTitle, Button } from "../util"
import { PeopleAlt } from "@styled-icons/material"
import { PointLegend } from "./PointLegend"
import { SegmentLegend } from "./SegmentLegend"
import { GradientLegend } from "./GradiantLegend"


const StyledBox = styled(Box)`
  position: sticky;
  bottom: 0;
`

export type LegendType = "POINT" | "GRADIENT" | "SEGMENTS"

export function Legend(props: { showUnionAuthorsModal: () => void }) {
  const { metricType, authorshipType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData[authorshipType].get(metricType) ?? undefined

  if (metricCache === undefined) return null

  let legend: JSX.Element = <></>
  switch(getMetricLegendType(metricType)) {
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
    <StyledBox>
      <BoxSubTitle>{Metric[metricType]}</BoxSubTitle>
      <Spacer />
      <BoxP>{getMetricDescription(metricType, authorshipType)}</BoxP>
      <Spacer lg />
      {metricType === "TOP_CONTRIBUTOR" || metricType === "SINGLE_AUTHOR" ? (
        <>
          <Button onClick={props.showUnionAuthorsModal}>
            <PeopleAlt display="inline-block" height="1rem" />
            Merge duplicate users
          </Button>
          <Spacer lg />
        </>
      ) : null}
      {legend}
    </StyledBox>
  )
}

export interface MetricLegendProps {
  metricCache: MetricCache
}
