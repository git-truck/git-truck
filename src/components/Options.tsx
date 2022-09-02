import { Metric, MetricType } from "../metrics/metrics"
import { Box } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType, useOptions } from "../contexts/OptionsContext"
import { Spacer } from "./Spacer"
import styled from "styled-components"

const Checkbox = styled.input`
  margin: var(--unit);
`

function isMetricWithHistoricalOption(metric: MetricType) {
  switch (metric) {
    case "SINGLE_AUTHOR":
    case "TOP_CONTRIBUTOR":
      return true
  }
  return false
}

export function Options() {
  const { animationsEnabled, setAnimationsEnabled, setMetricType, setChartType } =
    useOptions()

  return (
    <Box>
      <EnumSelect label="Chart type" enum={Chart} onChange={(chartType: ChartType) => setChartType(chartType)} />
      <Spacer />
      <EnumSelect label="Metric" enum={Metric} onChange={(metric: MetricType) => setMetricType(metric)} />
      <Spacer />
      {/* <EnumSelect
        label="Authorship data"
        enum={Authorship}
        onChange={(baseData: AuthorshipType) => setAuthorshipType(baseData)}
        hidden={!isMetricWithHistoricalOption(metricType)}
      />
      <Spacer /> */}
      <label>
        <Checkbox
          type="checkbox"
          checked={animationsEnabled}
          onChange={(e) => setAnimationsEnabled(e.target.checked)}
        />
        <span>Enable animations</span>
      </label>
    </Box>
  )
}
