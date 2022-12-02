import { useSpring } from "@react-spring/web"
import type { MutableRefObject } from "react"
import { useDeferredValue, useState } from "react"
import { useEffect, useMemo } from "react"
import { useBoolean } from "react-use"
import { useComponentSize as useCompSize } from "react-use-size"
import { useOptions } from "./contexts/OptionsContext"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefAndSize = [MutableRefObject<any>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(() => [ref, { width: width ?? 100, height: height ?? 100 }], [ref, width, height])
  return size
}

export function useCSSVar(varName: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName)
}

export function useToggleableSpring<T extends object>(props: T) {
  const { animationsEnabled } = useOptions()
  const [initialRender, setInitialRender] = useBoolean(false)

  useEffect(() => {
    requestIdleCallback(() => setInitialRender(false))
  }, [setInitialRender])

  return useSpring<T>({
    ...props,
    immediate: initialRender || !animationsEnabled,
  })
}

export function useChartSize() {
  const [windowSize, setWindowSize] = useState(() =>
    typeof document !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 100, height: 100 }
  )

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      console.log("resize")
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const size = useMemo(
    () => ({
      height: windowSize.width - 41, // Breadcrumb height
      width: windowSize.height - 35 * 8 * 2,
    }),
    [windowSize]
  )

  const deffv = useDeferredValue(size)

  return deffv
}
