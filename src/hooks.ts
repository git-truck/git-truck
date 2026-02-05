import type { Dispatch, RefObject, SetStateAction } from "react"
import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react"

import { useComponentSize as useCompSize } from "react-use-size/src/useComponentSize"
import { getPathFromRepoAndHead, promiseHelper } from "~/shared/util"
import { href, useLocation, useNavigate, useSearchParams, type NavigateOptions } from "react-router"
import type { LinkSearchParams, LinkSegments } from "~/shared/model"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import { useQueryState } from "nuqs"

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

export function useLocalStorage<T>(key: string, initialValue: T | undefined = undefined) {
  const [storedValue, setStoredValue] = useState<T | undefined>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue: Dispatch<SetStateAction<T | undefined>> = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.error(error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

export function useKey(
  options: { key?: string; ctrlOrMeta?: boolean; shift?: boolean; alt?: boolean },
  callback: (event: KeyboardEvent) => void
) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!options.key || event.key === options.key) {
        const ctrlOrMetaMatch = options.ctrlOrMeta === undefined || event.ctrlKey === options.ctrlOrMeta || event.metaKey === options.ctrlOrMeta
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

export function useKeyActive(options: {
  key?: string
  ctrlOrMeta?: boolean
  shift?: boolean
  alt?: boolean
}) {
  const [keyActive, setKeyActive] = useState(false)
  useEffect(() => {
    const downListener = (event: KeyboardEvent) => {
      if (!options.key || event.key === options.key) {
        const ctrlOrMetaMatch = options.ctrlOrMeta === undefined || event.ctrlKey === options.ctrlOrMeta || event.metaKey === options.ctrlOrMeta
        const shiftMatch = options.shift === undefined || event.shiftKey === options.shift
        const altMatch = options.alt === undefined || event.altKey === options.alt

        if (ctrlOrMetaMatch && shiftMatch && altMatch) {
          setKeyActive(true)
        }
      }
    }
    const upListener = (event: KeyboardEvent) => {
      if (!options.key || event.key === options.key) {
        const ctrlOrMetaMatch =
          options.ctrlOrMeta === undefined ||
          event.ctrlKey !== options.ctrlOrMeta ||
          event.metaKey !== options.ctrlOrMeta
        const shiftMatch = options.shift === undefined || event.shiftKey !== options.shift
        const altMatch = options.alt === undefined || event.altKey !== options.alt

        if (ctrlOrMetaMatch && shiftMatch && altMatch) {
          setKeyActive(false)
        }
      }
    }
    window.addEventListener("keydown", downListener)
    window.addEventListener("keyup", upListener)
    return () => {
      window.removeEventListener("keydown", downListener)
      window.removeEventListener("keyup", upListener)
    }
  }, [options])

  return keyActive
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
        void promiseHelper(document.documentElement.requestFullscreen())
      } else {
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

/**
 * @deprecated Use react-router and nuqs instead
 */
export function useCreateLink() {
  const location = useLocation()
  const [currentSearch] = useSearchParams()
  const navigate = useNavigate()

  const currentSegments = location.pathname.split("/").filter((seg) => seg.length > 0) as LinkSegments
  const currentParams = Object.fromEntries(currentSearch.entries()) as LinkSearchParams

  const composeLinkNavigation = ({
    params = currentParams,
    segments = currentSegments
  }: {
    params?: Partial<LinkSearchParams>
    segments?: LinkSegments
  } = {}) => {
    const url = getPathFromRepoAndHead(
      {
        ...currentParams,
        ...params
      } as LinkSearchParams,
      segments
    )
    return {
      url,
      navigate(options?: NavigateOptions) {
        navigate(url, options)
      }
    }
  }
  return composeLinkNavigation
}

export function useHomePath() {
  const [path] = useQueryState("path", viewSearchParamsConfig.path)
  return href("/view") + viewSerializer({ ...(path ? { path } : {}) })
}
