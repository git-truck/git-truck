import { useId, useMemo } from "react"
import { categoricalScheme } from "~/const"

export function useGradient(colors: Array<string>) {
  const gradientId = useId()

  const fill = `url('#${gradientId}')`

  const linearGradient = useMemo(
    () =>
      colors.length > 0 ? (
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          {Array.from(new Set(colors))
            .toSorted()
            .slice(0, categoricalScheme.length)
            .map((color, i, colors) => (
              <stop key={i} offset={`${(i / Math.max(colors.length - 1, 1)) * 100}%`} stopColor={color} />
            ))}
        </linearGradient>
      ) : null,
    [colors, gradientId]
  )

  return { linearGradient, fill }
}
