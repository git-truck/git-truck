import type { MutableRefObject } from "react"
import { useState, useEffect, useMemo } from "react"

import { useComponentSize as useCompSize } from "react-use-size"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefAndSize = [MutableRefObject<any>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(() => [ref, { width, height }], [ref, width, height])
  return size
}

export function useClient() {
  const [client, setClient] = useState(false)
  useEffect(() => {
    setClient(true)
  }, [setClient])
  return client
}
