import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import { useData } from "./DataContext"

export function usePath(): {
  path: string
  setPath: (newPath: string) => void
} {
  const data = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const path = useMemo(() => searchParams.get("path") ?? data.repo.repositoryPath, [data.repo.repositoryPath, searchParams])
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
