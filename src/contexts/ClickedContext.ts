import { useCallback } from "react"
import type { GitObject } from "../shared/model"
import { href, useLocation, useMatch, useNavigate } from "react-router"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"

export function useClickedObject() {
  const location = useLocation()
  const [params] = useQueryStates(viewSearchParamsConfig)
  const clickedObject = params.objectPath ? ((location.state?.clickedObject ?? null) as GitObject | null) : null
  const navigate = useNavigate()
  const tabURL = useMatch(href("/view/commits")) ? "/view/commits" : "/view/details"

  const setClickedObject = useCallback(
    (object: GitObject | null) => {
      // If selecting object, navigate to details or commits and set clickedObject in location state
      if (object) {
        navigate(tabURL + viewSerializer({ ...params, objectPath: object.path }), { state: { clickedObject: object } })
        return
      }
      // Otherwise, navigate back to view and remove objectPath query param
      navigate(href("/view") + viewSerializer({ ...params, objectPath: null }))
    },
    [navigate, params, tabURL]
  )

  return { clickedObject, setClickedObject }
}
