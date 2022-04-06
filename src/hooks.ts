import { useSpring } from "@react-spring/web"
import { MutableRefObject, useMemo } from "react"
import { useComponentSize as useCompSize } from "react-use-size"
import { useOptions } from "./contexts/OptionsContext"

type RefAndSize = [MutableRefObject<unknown>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(() => [ref, { width, height }], [ref, width, height])
  return size
}

export function useCSSVar(varName: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName)
}

export function useToggleableSpring(props: unknown) {
  const { animationsEnabled } = useOptions()

  return useSpring({
    ...(typeof props === "object" ? props : {}),
    immediate: !animationsEnabled,
  })
}
