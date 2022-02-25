import { MutableRefObject, useMemo } from "react"
import { useComponentSize as useCompSize } from "react-use-size"

type RefAndSize = [MutableRefObject<any>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(
    () => [ref, { width, height }],
    [ref, width, height]
  )
  return size
}
