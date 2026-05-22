import { useQueryState } from "nuqs"
import type { RefObject } from "react"
import { useState, useEffect, useMemo, useSyncExternalStore, useCallback, useRef, useLayoutEffect } from "react"
import { flushSync } from "react-dom"
import { href, useLocation, useSubmit } from "react-router"

import { viewSearchParamsConfig } from "~/shared/viewParams"
import { promiseHelper } from "~/shared/util"
import { useData } from "~/contexts/DataContext"

type ComponentSize = { width: number; height: number }
type RefAndSize<T extends HTMLElement> = [RefObject<T | null>, ComponentSize]

const measureElement = (element: HTMLElement): ComponentSize => ({
  width: element.offsetWidth,
  height: element.offsetHeight
})

export function useComponentSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [currentSize, setCurrentSize] = useState<ComponentSize>({ width: 0, height: 0 })

  const measure = useCallback((sync = false) => {
    const element = ref.current
    if (!element) return

    const nextSize = measureElement(element)
    const updateSize = () => {
      setCurrentSize((prevSize) =>
        prevSize.width === nextSize.width && prevSize.height === nextSize.height ? prevSize : nextSize
      )
    }

    if (sync) {
      flushSync(updateSize)
      return
    }

    updateSize()
  }, [])

  useLayoutEffect(() => {
    measure()

    const element = ref.current
    if (!element) return

    const resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [measure])

  useEffect(() => {
    let animationFrame = 0

    const measureForPrint = () => {
      measure(true)
      animationFrame = window.requestAnimationFrame(() => measure(true))
    }

    const measureAfterPrint = () => measure()
    const mediaQueryList = window.matchMedia("print")
    const listener = (event: MediaQueryListEvent) => {
      if (event.matches) {
        measureForPrint()
        return
      }

      measureAfterPrint()
    }

    window.addEventListener("beforeprint", measureForPrint)
    window.addEventListener("afterprint", measureAfterPrint)
    mediaQueryList.addEventListener("change", listener)

    if (mediaQueryList.matches) measureForPrint()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener("beforeprint", measureForPrint)
      window.removeEventListener("afterprint", measureAfterPrint)
      mediaQueryList.removeEventListener("change", listener)
    }
  }, [measure])

  const size: RefAndSize<HTMLDivElement> = useMemo(() => [ref, currentSize], [currentSize])
  return size
}

export function useIsPrinting() {
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    const setPrinting = (value: boolean, sync = false) => {
      const update = () => setIsPrinting(value)

      if (sync) {
        flushSync(update)
        return
      }

      update()
    }

    const mediaQueryList = window.matchMedia("print")
    const beforePrint = () => setPrinting(true, true)
    const afterPrint = () => setPrinting(false)
    const listener = (event: MediaQueryListEvent) => setPrinting(event.matches, event.matches)

    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)
    mediaQueryList.addEventListener("change", listener)

    if (mediaQueryList.matches) setPrinting(true, true)

    return () => {
      window.removeEventListener("beforeprint", beforePrint)
      window.removeEventListener("afterprint", afterPrint)
      mediaQueryList.removeEventListener("change", listener)
    }
  }, [])

  return isPrinting
}

export function useIsClient() {
  const [client, setClient] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient(true)
  }, [setClient])
  return client
}

export function useKey(
  options: { key?: string; ctrlOrMeta?: boolean; shift?: boolean; alt?: boolean },
  callback: (event: KeyboardEvent) => void
) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!options.key || event.key === options.key) {
        const ctrlOrMetaMatch =
          options.ctrlOrMeta === undefined ||
          event.ctrlKey === options.ctrlOrMeta ||
          event.metaKey === options.ctrlOrMeta
        const shiftMatch = options.shift === undefined || event.shiftKey === options.shift
        const altMatch = options.alt === undefined || event.altKey === options.alt

        if (ctrlOrMetaMatch && shiftMatch && altMatch) {
          callback(event)
        }
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [options, callback])
}

export function useMouse() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      setMouse({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener("mousemove", listener)
    return () => window.removeEventListener("mousemove", listener)
  }, [])
  return mouse
}

export function useFullscreen<T extends Element>(getElement: () => T | RefObject<T>) {
  const isFullscreen = useSyncExternalStore(
    (handler) => {
      document.addEventListener("fullscreenchange", handler)
      return () => {
        document.removeEventListener("fullscreenchange", handler)
      }
    },
    () => Boolean(document.fullscreenElement),
    () => false
  )

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const element = getElement()
      if (element instanceof Element) {
        void promiseHelper(element.requestFullscreen())
      } else if (element.current) {
        void promiseHelper(element.current.requestFullscreen())
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  return { isFullscreen, toggleFullscreen } as const
}

export function useViewAction() {
  const location = useLocation()
  return href("/view") + location.search
}

export function useViewSubmit() {
  const submit = useSubmit()
  const location = useLocation()

  type Target = Parameters<typeof submit>[0]

  type Options = Parameters<typeof submit>[1] & { action?: never }

  return (target: Target, options?: Options) => {
    submit(target, { ...options, action: href("/view") + location.search })
  }
}

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(true)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    mediaQueryList.addEventListener("change", listener)
    return () => mediaQueryList.removeEventListener("change", listener)
  }, [query])

  return matches
}

//TODO - this is broken when paths are concatenated, it should zoom to nearest ancestor with children.
export const useZoomToParent = () => {
  const [zoomPath, setZoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)

  const sep = zoomPath ? (zoomPath?.includes("/") ? "/" : "\\") : null

  return useCallback(() => {
    if (!sep || !zoomPath) return
    // Move up to parent
    const parentPath = zoomPath.split(sep).slice(0, -1).join(sep)
    setZoomPath(parentPath)
  }, [sep, setZoomPath, zoomPath])
}

export const usePathIsRepositoryRoot = (path: string | null = null): boolean => {
  const data = useData()
  return path === data.repo.repositoryName
}
