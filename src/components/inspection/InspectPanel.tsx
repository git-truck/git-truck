import { useClickedObject, useObjectColor } from "~/state/stores/clicked-object"
import { isBlob, isDarkColor, isRepositoryRoot } from "~/shared/util"
import { mdiSourceRepository, mdiFile, mdiFolder } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

export function InspectPanel({ className = "" }: { className?: string }) {
  const clickedObject = useClickedObject()
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)
  const objectColor = useObjectColor(clickedObject)
  const isDark = objectColor ? isDarkColor(objectColor) : false

  return (
    <button
      className={cn(
        "h-button text-primary-text dark:text-primary-text-dark pointer-events-none ml-1 inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold",

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
