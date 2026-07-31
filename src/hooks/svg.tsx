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
            .flatMap((color, i, uniqueColors) => {
              const start = (i / uniqueColors.length) * 100
              const end = ((i + 1) / uniqueColors.length) * 100

              return [
                <stop key={`${color}-start-${i}`} offset={`${start}%`} stopColor={color} />,
                <stop key={`${color}-end-${i}`} offset={`${end}%`} stopColor={color} />
              ]
            })}
        </linearGradient>
      ) : null,
    [colors, gradientId]
  )

  return { linearGradient, fill }
}
