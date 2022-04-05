import { Authorship, AuthorshipType, Metric, MetricType } from "../metrics"
import { Box } from "./util"
import { EnumSelect } from "./EnumSelect"
import { Chart, ChartType, useOptions } from "../contexts/OptionsContext"
import { Spacer } from "./Spacer"
import styled from "styled-components"

const Checkbox = styled.input`
  margin: var(--unit);
`

export function Options() {
  const {
    animationsEnabled,
    setMetricType,
    setChartType,
    setAnimationsEnabled,
    setAuthorshipType
  } = useOptions()
  return (
    <Box>
      <EnumSelect
        label="Chart type"
        enum={Chart}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      <Spacer />
      <EnumSelect
        label="Metric"
        enum={Metric}
        onChange={(metric: MetricType) => setMetricType(metric)}
      />
      <Spacer />
      <EnumSelect
        label="Authorship Data"
        enum={Authorship}
        onChange={(baseData: AuthorshipType) => setAuthorshipType(baseData)}
      />
      <Spacer />
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
