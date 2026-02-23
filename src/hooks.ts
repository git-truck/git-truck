import type { RefObject } from "react"
import { useState, useEffect, useMemo, useSyncExternalStore } from "react"

import { useComponentSize as useCompSize } from "react-use-size/src/useComponentSize"
import { promiseHelper } from "~/shared/util"

type RefAndSize<T> = [RefObject<T>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize<HTMLDivElement> = useMemo(() => [ref, { width, height }], [ref, width, height])
  return size
}

export function useIsClient() {
  const [client, setClient] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient(true)
  }, [setClient])
  return client
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", callback)
      return () => mediaQuery.removeEventListener("change", callback)
    },
    () => {
      return window.matchMedia(query).matches
    },
    () => false
  )
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
