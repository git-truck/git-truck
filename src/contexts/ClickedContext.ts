import { useCallback } from "react"
import type { GitObject } from "../shared/model"
import { useLocation } from "react-router"
import { useQueryState } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/view"

export function useClickedObject() {
  const location = useLocation()
  const [objectPath, setObjectPath] = useQueryState("objectPath", viewSearchParamsConfig.objectPath)
  const clickedObject = objectPath ? (location.state?.clickedObject ?? null) as GitObject | null : null

  const setClickedObject = useCallback(
    (object: GitObject | null) => {
      setObjectPath(!object ? null : object.path)
    },
    [setObjectPath]
  )

  return { clickedObject, setClickedObject }
}
