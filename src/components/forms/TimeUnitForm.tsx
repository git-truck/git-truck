import { useQueryState } from "nuqs"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { TimeUnitValues, type TimeUnit } from "~/shared/utils/time"
import { cn } from "~/styling"

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
        <option
          key={unit}
          className={cn(
            "text-primary-text bg-primary-bg dark:text-primary-text-dark dark:bg-primary-bg-dark btn capitalize",
            timeUnit === unit ? "btn--outlined" : "btn--text"
          )}
          value={unit}
          onClick={() => setTimeUnit(unit)}
        >
          {unit}
        </option>
      ))}
    </select>
  )
}
