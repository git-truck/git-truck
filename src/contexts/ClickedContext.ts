import { useCallback } from "react"
import type { GitObject } from "../shared/model"
import { useLocation, useSearchParams } from "react-router"

export function useClickedObject() {
  const location = useLocation()
  const clickedObject = (location.state?.clickedObject ?? null) as GitObject | null
  const [searchParams, setSearchParams] = useSearchParams()

  const setClickedObject = useCallback(
    (object: GitObject | null) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      if (!object) {
        newSearchParams.delete("path")
      } else {
        newSearchParams.set("path", object.path)
      }

      setSearchParams(newSearchParams, {
        state: { clickedObject: object }
      })
    },
    [setSearchParams, searchParams]
  )

  return { clickedObject, setClickedObject }
}
