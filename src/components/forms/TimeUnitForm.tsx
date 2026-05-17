import { useQueryState } from "nuqs"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { TimeUnitValues, type TimeUnit } from "~/shared/utils/time"

export function TimeUnitForm() {
  const data = useData()
  const [timeUnit, setTimeUnit] = useQueryState(
    "timeUnit",
    viewSearchParamsConfig.timeUnit.withDefault(data.databaseInfo.commitCountPerTimeIntervalUnit)
  )

  return (
    <select
      className="uppercase"
      name="timeUnit"
      value={timeUnit}
      onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
    >
      {TimeUnitValues.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  )
}
