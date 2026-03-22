import { useCallback } from "react"
import { useData } from "~/contexts/DataContext"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/view"

export function usePath(): {
  path: string
  setPath: (newPath: string) => void
} {
  const data = useData()
  const [searchParams, setSearchParams] = useQueryStates(viewSearchParamsConfig)

  const path = searchParams.path ?? data.repo.repositoryPath

  const setPath = useCallback(
    (newPath: string) =>
      setSearchParams((prev) => ({
        ...prev,
        path: newPath
      })),
    [setSearchParams]
  )
  return { path, setPath }
}
