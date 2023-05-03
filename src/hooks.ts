import { useSpring } from "@react-spring/web"
import type { MutableRefObject } from "react"
import { useEffect, useMemo } from "react"
import { useBoolean } from "react-use"
import { useComponentSize as useCompSize } from "react-use-size"
import { useOptions } from "./contexts/OptionsContext"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefAndSize = [MutableRefObject<any>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(() => [ref, { width, height }], [ref, width, height])
  return size
}

export function useToggleableSpring(props: unknown) {
  const { transitionsEnabled } = useOptions()
  const [initialRender, setInitialRender] = useBoolean(true)
  useEffect(() => {
    setTimeout(() => setInitialRender(false), 0)
  }, [setInitialRender])

  return useSpring({
    ...(typeof props === "object" ? props : {}),
    immediate: initialRender || !transitionsEnabled,
  })
}

export function useClient() {
  const [client, setClient] = useBoolean(false)
  useEffect(() => {
    setClient(true)
  }, [setClient])
  return client
}
