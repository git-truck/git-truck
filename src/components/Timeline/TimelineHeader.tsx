import { TimeRangePresetButtons } from "~/components/forms/TimeRangePresetButtons"
import { TimeUnitForm } from "~/components/forms/TimeUnitForm"
import { Dot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useGradient } from "~/hooks/svg"
import { isTree } from "~/shared/util"
import { useClickedObject, useObjectColors } from "~/state/stores/clicked-object"

export function TimelineHeader({ children }: { children?: React.ReactNode }) {
  const clickedObject = useClickedObject()
  const data = useData()

  const colors = useObjectColors(clickedObject)
  const { linearGradient, fill } = useGradient(colors)

  const props = colors.length > 0 ? { fill } : { className: "fill-blue-primary" }

  const zoomPathName = data.databaseInfo.zoomPathName

  return (
    <div className="card__title grid w-full grid-cols-[1fr_max-content_1fr] items-center justify-between gap-2">
      <h2
        className="flex items-start gap-1"
        title={isTree(clickedObject) ? "Commits that changed this folder" : "Commits that changed this file"}
      >
        Commits per
        <TimeUnitForm />
      </h2>
      <div className="flex gap-1">
        {clickedObject.name !== zoomPathName ? (
          <div className="flex items-center gap-1">
            <Dot shape="square" {...props}>
              {linearGradient}
            </Dot>
            Commit activity for
            <span className="text-primary-text dark:text-primary-text-dark normal-case">{clickedObject.name}</span>
          </div>
        ) : null}{" "}
      </div>
      <div className="flex items-center justify-end gap-1">
        {children}
        <TimeRangePresetButtons unit={data.databaseInfo.commitCountPerTimeIntervalUnit} />
      </div>
    </div>
  )
}
