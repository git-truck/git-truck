import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useClickedObject } from "~/state/stores/clicked-object"
import { isBlob, isRepositoryRoot } from "~/shared/util"
import { MetricsInspection } from "~/components/inspection/MetricsInspection"
import { mdiSourceRepository, mdiFile, mdiFolder } from "@mdi/js"
import { Icon } from "~/components/Icon"

export function InspectPanel() {
  const clickedObject = useClickedObject()
  const objectPath = clickedObject?.path
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)

  return (
    <CollapsibleHeader
      className={"card"}
      title={() => (
        <>
          {objectPath ? (
            <>
              <span className="flex items-center gap-1 truncate" title={objectPath}>
                Inspecting:{" "}
                <span className="text-primary-text dark:text-primary-text-dark ml-1 inline-flex items-center gap-1 font-bold normal-case">
                  <Icon path={objectPathIsRepo ? mdiSourceRepository : objectPathIsFile ? mdiFile : mdiFolder} />
                  {clickedObject.name}
                </span>
              </span>
            </>
          ) : (
            "Inspect"
          )}
        </>
      )}
    >
      <MetricsInspection />
    </CollapsibleHeader>
  )
}
