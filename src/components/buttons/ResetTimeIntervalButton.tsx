import { mdiRestore } from "@mdi/js"
import { Form } from "react-router"
import { cn } from "~/styling"
import { Icon } from "~/components/Icon"
import { useData } from "~/contexts/DataContext"
import { useViewAction } from "~/hooks"

export function ResetTimeIntervalButton() {
  const data = useData()
  const viewAction = useViewAction()

  return (
    <Form
      className={cn({
        invisible:
          data.databaseInfo.timerange[0] === data.databaseInfo.selectedRange[0] &&
          data.databaseInfo.timerange[1] === data.databaseInfo.selectedRange[1]
      })}
      method="post"
      action={viewAction}
    >
      <input
        type="hidden"
        name="timeseries"
        value={`${data.databaseInfo.timerange[0]}-${data.databaseInfo.timerange[1]}`}
      />
      <button className={cn("btn btn--text", {})}>
        <Icon path={mdiRestore} />
        Reset time interval
      </button>
    </Form>
  )
}
