import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

export function usePath(): {
  path: string
  setPath: (newPath: string) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const path = useMemo(() => searchParams.get("path") ?? "", [searchParams])
  const setPath = useCallback(
    (newPath: string) =>
      setSearchParams((prev) => ({
        ...prev,
        isblob: false,
        path: newPath
      })),
    [setSearchParams]
  )
  return { path, setPath }
}
