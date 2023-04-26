import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"
import type { ChartType } from "../contexts/OptionsContext"
import { Chart, useOptions } from "../contexts/OptionsContext"
import { CheckboxWithLabel } from "./util"
import { Icon } from "@mdi/react"
import { mdiChartBubble, mdiDatabaseOutline, mdiCogOutline } from "@mdi/js"

function isMetricWithHistoricalOption(metric: MetricType) {
  switch (metric) {
    case "SINGLE_AUTHOR":
    case "TOP_CONTRIBUTOR":
      return true
  }
  return false
}

export function Options() {
  const {
    metricType,
    chartType,
    transitionsEnabled,
    setTransitionsEnabled,
    labelsVisible,
    setLabelsVisible,
    setMetricType,
    setChartType,
  } = useOptions()

  return (
    <div className="card">
      <h2 className="card__title">
        Options
        <Icon path={mdiCogOutline} size={1} />
      </h2>
      <EnumSelect
        label={
          <div className="flex justify-between gap-2">
            Visualization
            <Icon path={mdiDatabaseOutline} size={1} />
          </div>
        }
        enum={Metric}
        defaultValue={metricType}
        onChange={(metric: MetricType) => setMetricType(metric)}
      />
      <EnumSelect
        label={
          <div className="flex justify-between gap-2">
            Layout
            <Icon path={mdiChartBubble} size={1} />
          </div>
        }
        enum={Chart}
        defaultValue={chartType}
        onChange={(chartType: ChartType) => setChartType(chartType)}
      />
      {/* <EnumSelect
        label="Authorship data"
        enum={Authorship}
        onChange={(baseData: AuthorshipType) => setAuthorshipType(baseData)}
        hidden={!isMetricWithHistoricalOption(metricType)}
      />*/}
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={transitionsEnabled}
        onChange={(e) => setTransitionsEnabled(e.target.checked)}
        title="Disable to improve performance when zooming"
      >
        Transitions
      </CheckboxWithLabel>
      <CheckboxWithLabel
        className="pl-[9px]"
        checked={labelsVisible}
        onChange={(e) => setLabelsVisible(e.target.checked)}
        title="Disable to improve performance"
      >
        Labels
      </CheckboxWithLabel>
    </div>
  )
}
