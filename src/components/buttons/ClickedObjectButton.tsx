import { mdiClose, mdiFile, mdiFolder, mdiMagnifyMinusOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { useData } from "~/contexts/DataContext"
import { useQueryState } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { $inspect, isRepositoryRoot } from "~/shared/util"

export function ClickedObjectButton({ style = {} }: { style?: React.CSSProperties }) {
  const [zoomPath, setZoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const data = useData()
  const isRepoRoot = isRepositoryRoot(clickedObject)
  const isZoomPath = clickedObject.path === zoomPath && !isRepoRoot
  $inspect({
    "clickedObject.path": clickedObject?.path,
    zoomPath,
    isZoomPath,
    isRepoRoot
  })

  if (!clickedObject || !data) return null

  const sep = zoomPath ? (zoomPath?.includes("/") ? "/" : "\\") : null

  const zoomOneLevelOut = () => {
    if (!sep || !zoomPath) return
    // Move up to parent
    const parentPath = zoomPath.split(sep).slice(0, -1).join(sep)
    setZoomPath(parentPath)
  }

  return (
    <button
      className="btn btn--primary"
      title={isZoomPath ? `Deselect and zoom out of ${clickedObject.name}` : `Deselect ${clickedObject.name}`}
      style={style}
      onClick={() => {
        if (isZoomPath) {
          zoomOneLevelOut()
          return
        }
        setClickedObject(null)
      }}
    >
      <Icon path={clickedObject.type === "tree" ? mdiFolder : mdiFile} />
      {clickedObject.name}
      {!isRepoRoot ? <Icon path={isZoomPath ? mdiMagnifyMinusOutline : mdiClose} /> : null}
    </button>
  )
}
