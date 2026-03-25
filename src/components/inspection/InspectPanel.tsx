import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useClickedObject } from "~/state/stores/clicked-object"
import { isBlob, isRepositoryRoot } from "~/shared/util"
import Metrics from "~/components/inspection/Metrics"

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
                {" "}
                <span className="font-black normal-case">
                  {objectPathIsRepo
                    ? objectPath
                    : objectPathIsFile
                      ? objectPath.split("/").pop()
                      : objectPath
                          .split("/")
                          .map((segment, index, segments) => (index === segments.length - 1 ? segment : "."))
                          .join("/") + "/"}
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
      {clickedObject ? <Metrics /> : <InspectIndex />}
    </CollapsibleHeader>
  )
}

function InspectIndex() {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="flex items-center gap-1">
          <Key title="Left click">Click</Key> to inspect
        </p>
        <p className="flex items-center gap-1">
          <Key title="Double click">Double click</Key> or <Key title="Scroll">Scroll</Key> to zoom
        </p>
      </div>
    </div>
  )
}

function Key({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <kbd
      className="bg-primary-bg dark:bg-primary-bg-dark h-button flex w-max min-w-max items-center rounded-sm border px-2"
      title={title}
    >
      {children}
    </kbd>
  )
}
