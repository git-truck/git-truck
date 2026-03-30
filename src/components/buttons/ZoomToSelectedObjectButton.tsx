import { mdiMagnify } from "@mdi/js"
import { useQueryStates } from "nuqs"
import { Link, useLocation } from "react-router"
import { Icon } from "~/components/Icon"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import { resolveParentFolder } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"

export function ZoomToSelectedObjectButton() {
  const clickedObject = useClickedObject()
  const data = useData()
  const [viewSearchParams] = useQueryStates(viewSearchParamsConfig)
  const location = useLocation()

  const isBlob = clickedObject.type === "blob"

  const targetZoomPath = isBlob ? resolveParentFolder(clickedObject.path) : clickedObject.path
  const currentZoomPath = viewSearchParams.zoomPath ?? data.databaseInfo.repo //If no zoomPath, we are at root
  const isSelectedObjectZoomPath = currentZoomPath === targetZoomPath
  const zoomLink = location.pathname + viewSerializer({ ...viewSearchParams, zoomPath: targetZoomPath ?? undefined })

  if (isSelectedObjectZoomPath) return null

  return (
    <Link className="btn" to={zoomLink}>
      <Icon path={mdiMagnify} />
      Zoom to {isBlob ? "file" : "folder"}
    </Link>
  )
}
