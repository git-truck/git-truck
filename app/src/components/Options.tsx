import "./Options.css"
import { MetricSelect } from "./MetricSelect"
import MetaDataInfo from "./MetaDataInfo"
import { Spacer } from "./Spacer"
import { ParserData } from "../../../parser/src/model"
import { Metric } from "../metrics"

export function Options({
  data,
  setMetric,
}: {
  data: ParserData
  setMetric: (metric: Metric) => void
}) {
  return (
    <div className="box options">
      <MetaDataInfo repoName={data.repo} branchName={data.branch} />
      <Spacer />
      <MetricSelect onChange={setMetric}></MetricSelect>
    </div>
  )
}
