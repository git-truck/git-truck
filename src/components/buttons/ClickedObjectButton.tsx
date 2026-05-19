import { mdiClose, mdiFile, mdiFolder, mdiMagnifyMinusOutline, mdiSourceRepository } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useClickedObject, useSetClickedObjectPath } from "~/state/stores/clicked-object"
import { useData } from "~/contexts/DataContext"
import { useQueryState } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { isRepositoryRoot } from "~/shared/util"
import { useZoomToParent } from "~/hooks"

export function ClickedObjectButton({ style = {} }: { style?: React.CSSProperties }) {
  const [zoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObjectPath()
  const data = useData()
  const isRepoRoot = isRepositoryRoot(clickedObject)
  const isZoomPath = clickedObject.path === zoomPath && !isRepoRoot
  const zoomOneLevelOut = useZoomToParent()

  if (!clickedObject || !data) return null

  return (
    <button
      className="btn btn--primary"
      title={
        isRepoRoot
          ? clickedObject.name
          : isZoomPath
            ? `Deselect and zoom out of ${clickedObject.name}`
            : `Deselect ${clickedObject.name}`
      }
      style={style}
      onClick={() => {
        if (isZoomPath) {
          zoomOneLevelOut()
          return
        }
        setClickedObject(null)
      }}
    >
      <Icon path={isRepoRoot ? mdiSourceRepository : clickedObject.type === "tree" ? mdiFolder : mdiFile} />
      {clickedObject.name}
      {!isRepoRoot ? <Icon path={isZoomPath ? mdiMagnifyMinusOutline : mdiClose} /> : null}
    </button>
  )
}
