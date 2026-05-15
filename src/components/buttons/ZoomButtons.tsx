import { mdiMagnify, mdiMagnifyMinusOutline } from "@mdi/js"
import { useQueryState, useQueryStates } from "nuqs"
import { Link, useLocation } from "react-router"
import { Icon } from "~/components/Icon"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/viewParams"
import { resolveParentFolder } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"

export function ZoomButtons() {
  const clickedObject = useClickedObject()
  const data = useData()
  const [viewSearchParams] = useQueryStates(viewSearchParamsConfig)
  const [zoomPath, setZoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)
  const location = useLocation()

  const isBlob = clickedObject.type === "blob"

  const targetZoomPath = isBlob ? resolveParentFolder(clickedObject.path) : clickedObject.path
  const currentZoomPath = viewSearchParams.zoomPath ?? data.databaseInfo.repo //If no zoomPath, we are at root
  const isSelectedObjectZoomPath = currentZoomPath === targetZoomPath
  const zoomLink = location.pathname + viewSerializer({ ...viewSearchParams, zoomPath: targetZoomPath ?? undefined })

  // if (isSelectedObjectZoomPath) return null

  const sep = zoomPath ? (zoomPath?.includes("/") ? "/" : "\\") : null
  const zoomOneLevelOut = () => {
    if (!sep || !zoomPath) return
    // Move up to parent
    const parentPath = zoomPath.split(sep).slice(0, -1).join(sep)
    setZoomPath(parentPath)
  }

  return (
    <>
      <div className="flex gap-2">
        {!isSelectedObjectZoomPath ? (
          <Link
            className="btn btn--text"
            aria-disabled={isSelectedObjectZoomPath}
            to={!isSelectedObjectZoomPath ? zoomLink : ""}
            title={`Zoom to ${targetZoomPath}`}
          >
            <Icon path={mdiMagnify} />
            Zoom in
          </Link>
        ) : null}
        {zoomPath && zoomPath !== data.databaseInfo.repo ? (
          <button className="btn btn--text" title="Zoom out to repository root" onClick={() => setZoomPath(null)}>
            <Icon path={mdiMagnifyMinusOutline} />
            Zoom out
          </button>
        ) : null}
      </div>
    </>
  )
}
