import { useQueryState } from "nuqs"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { TimeUnitValues, type TimeUnit } from "~/shared/utils/time"
import { cn } from "~/styling"

export function TimeUnitForm() {
  const data = useData()
  const [timeUnit, setTimeUnit] = useQueryState(
    "timeUnit",
    viewSearchParamsConfig.timeUnit
      .withOptions({ shallow: false })
      .withDefault(data.databaseInfo.commitCountPerTimeIntervalUnit)
  )

  return (
    <select
      className="uppercase"
      name="timeUnit"
      defaultValue={timeUnit}
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
    // return (
    //   <div className="flex gap-1">
    //     {TimeUnitValues.map((unit) => (
    //       <button
    //         key={unit}
    //         className={cn("btn capitalize", timeUnit === unit ? "btn--outlined" : "btn--text")}
    //         value={unit}
    //         onClick={() => setTimeUnit(unit)}
    //       >
    //         {unit}
    //       </button>
    //     ))}
    //   </div>
  )
}
