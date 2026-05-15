import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useClickedObject, useObjectColor } from "~/state/stores/clicked-object"
import { isBlob, isDarkColor, isRepositoryRoot, isTree } from "~/shared/util"
import { MetricsInspection } from "~/components/inspection/MetricsInspection"
import { mdiSourceRepository, mdiFile, mdiFolder } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

export function InspectPanel({ className = "" }: { className?: string }) {
  const clickedObject = useClickedObject()
  const objectPath = clickedObject?.path
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)
  const objectColor = useObjectColor(clickedObject)
  const isDark = objectColor ? isDarkColor(objectColor) : false

  return (
    <button
      className={cn(
        "rounded-md text-sm px-3 py-2 h-button text-primary-text dark:text-primary-text-dark ml-1 inline-flex items-center gap-1 font-bold",

        { "text-primary-text-dark dark:text-primary-text": isDark },
        className
      )}
      style={{
        backgroundColor: objectColor ? objectColor : undefined
      }}
    >
      <Icon path={objectPathIsRepo ? mdiSourceRepository : objectPathIsFile ? mdiFile : mdiFolder} />
      {clickedObject.name}
    </button>
  )
}
