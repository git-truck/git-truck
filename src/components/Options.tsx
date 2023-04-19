import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import { CheckboxWithLabel } from "./util"

function isMetricWithHistoricalOption(metric: MetricType) {
  switch (metric) {
    case "SINGLE_AUTHOR":
    case "TOP_CONTRIBUTOR":
      return true
  }
  return false
}

export function Options() {
  const { animationsEnabled, setAnimationsEnabled, labelsVisible, setLabelsVisible, setMetricType, setChartType } =
    useOptions()

  return (
    <div className="box">
      <EnumSelect label="Visualization" enum={Metric} onChange={(metric: MetricType) => setMetricType(metric)} />
      <EnumSelect label="Layout" enum={Chart} onChange={(chartType: ChartType) => setChartType(chartType)} />
      {/* <EnumSelect
        label="Authorship data"
        enum={Authorship}
        onChange={(baseData: AuthorshipType) => setAuthorshipType(baseData)}
        hidden={!isMetricWithHistoricalOption(metricType)}
      />*/}
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={animationsEnabled}
        onChange={(e) => setAnimationsEnabled(e.target.checked)}
      >
        Enable animations
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={labelsVisible}
        onChange={(e) => setLabelsVisible(e.target.checked)}
      >
        Show labels
      </CheckboxWithLabel>
    </div>
  )
}
