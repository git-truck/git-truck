import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useClickedObject } from "~/state/stores/clicked-object"
import { isBlob, isRepositoryRoot } from "~/shared/util"
import { MetricsInspection } from "~/components/inspection/MetricsInspection"

export function InspectPanel() {
  const clickedObject = useClickedObject()
  const objectPath = clickedObject?.path
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)
  return (
    <CollapsibleHeader
      className="card"
      title={
        <>
          {objectPath ? (
            <>
              <span className="truncate" title={objectPath}>
                {"inspecting: "}
                <span className="text-primary-text dark:text-primary-text-dark ml-1 font-bold normal-case">
                  {objectPathIsRepo ? (
                    <span>
                      {objectPath} <span className="text-tertiary-text dark:text-tertiary-text-dark">(repo)</span>
                    </span>
                  ) : objectPathIsFile ? (
                    objectPath.split("/").pop()
                  ) : (
                    objectPath.split("/").pop() + "/"
                  )}
                </span>
              </span>
            </>
          ) : (
            "Inspect"
          )}
        </>
      }
      contentClassName="pb-6"
    >
      {<MetricsInspection />}
    </CollapsibleHeader>
  )
}
