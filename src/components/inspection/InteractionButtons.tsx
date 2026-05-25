import { mdiOpenInNew, mdiEyeOffOutline } from "@mdi/js"
import { useQueryState } from "nuqs"
import { useNavigation, Form } from "react-router"
import { ZoomButtons } from "~/components/buttons/ZoomButtons"
import { Icon } from "~/components/Icon"
import { useViewAction } from "~/hooks"
import { isRepositoryRoot, last, resolveParentFolder } from "~/shared/util"
import { viewSearchParamsConfig } from "~/shared/viewParams"
import { useClickedObject, useSetClickedObjectPath } from "~/state/stores/clicked-object"

export function InteractionButtons() {
  const clickedObject = useClickedObject()
  const setClickedObjectPath = useSetClickedObjectPath()
  const viewAction = useViewAction()
  const { state } = useNavigation()
  const [, setZoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)

  if (!clickedObject) {
    return null
  }

  const isRoot = isRepositoryRoot(clickedObject)
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <div className="flex flex-wrap">
      <Form method="post" action={viewAction}>
        <input type="hidden" name="open" value={clickedObject.path} />
        <button
          className="btn btn--text"
          disabled={state !== "idle"}
          title={
            clickedObject.type === "blob"
              ? `Open ${clickedObject.name} in default app`
              : `Browse ${clickedObject.name} in system explorer`
          }
        >
          <Icon path={mdiOpenInNew} size="1.25em" className="w-max" />
          {clickedObject.type === "blob" ? "Open" : "Browse"}
        </button>
      </Form>
      <Form
        className="w-max"
        method="post"
        action={viewAction}
        onSubmit={() => {
          if (!isBlob) setZoomPath(resolveParentFolder(clickedObject.path))
          setClickedObjectPath(null)
        }}
      >
        <input type="hidden" name="hide" value={clickedObject.path} />
        {!isRoot && isBlob ? (
          <button
            className="btn btn--text"
            disabled={state !== "idle"}
            title={`Hide ${clickedObject.name} from visualization`}
          >
            <Icon path={mdiEyeOffOutline} />
            Hide
          </button>
        ) : null}
      </Form>
      {isBlob ? (
        <>
          {clickedObject.name.includes(".") ? (
            <Form className="w-max" method="post" action={viewAction}>
              <input type="hidden" name="hide" value={`*.${extension}`} />
              <button
                className="btn btn--text"
                disabled={state !== "idle"}
                title={`Hide all files with .${extension} extension`}
              >
                <Icon path={mdiEyeOffOutline} />
                <span>Hide *.{extension}</span>
              </button>
            </Form>
          ) : null}
        </>
      ) : null}
      <ZoomButtons />
    </div>
  )
}
