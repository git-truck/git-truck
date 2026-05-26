import { TimeRangePresetButtons } from "~/components/forms/TimeRangePresetButtons"
import { TimeUnitForm } from "~/components/forms/TimeUnitForm"
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"
import { useData } from "~/contexts/DataContext"
import { isTree } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"

export function TimelineHeader({ children }: { children?: React.ReactNode }) {
  const clickedObject = useClickedObject()
  const data = useData()

  return (
    <div className="card__title grid w-full grid-cols-[1fr_max-content_1fr] items-center justify-between gap-4">
      <h2
        className="flex items-center gap-2"
        title={isTree(clickedObject) ? "Commits that changed this folder" : "Commits that changed this file"}
      >
        Commit activity for
        <ClickedObjectButton />
      </h2>
      <div />
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-start">
          Per
          <TimeUnitForm />
        </div>
        {children}
        <TimeRangePresetButtons unit={data.databaseInfo.commitCountPerTimeIntervalUnit} />
      </div>
    </div>
  )
}
