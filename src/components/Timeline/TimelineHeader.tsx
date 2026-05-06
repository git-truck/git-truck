import { TimeRangePresetButtons } from "~/components/forms/TimeRangePresetButtons"
import { TimeUnitForm } from "~/components/forms/TimeUnitForm"
import { isTree } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"

export function TimelineHeader() {
  const clickedObject = useClickedObject()

  return (
    <div className="grid grid-cols-3 items-center justify-between gap-2">
      <h2
        className="card__title flex items-center"
        title={isTree(clickedObject) ? "Commits that changed this folder" : "Commits that changed this file"}
      >
        <span>
          Commits
          {clickedObject ? (
            <>
              {" "}
              to <span className="text-primary-text dark:text-primary-text-dark">{clickedObject.name}</span>
            </>
          ) : null}
        </span>
      </h2>
      <div className="card__title flex items-start justify-center gap-[1ch]">
        Aggregate by
        <TimeUnitForm />
      </div>
      <TimeRangePresetButtons />
    </div>
  )
}
