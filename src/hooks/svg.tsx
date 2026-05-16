import { useId, useMemo } from "react"
import { getCategoricalScheme } from "~/metrics/metrics"

const scheme = getCategoricalScheme()

export function useGradient(colors: Array<string>) {
  const gradientId = useId()

  const fill = `url('#${gradientId}')`

  const linearGradient = useMemo(
    () => (
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
        {Array.from(new Set(colors))
          .toSorted()
          .slice(0, scheme.length)
          .map((color, i, colors) => (
            <stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={color} />
          ))}
      </linearGradient>
    ),
    [colors, gradientId]
  )

  return { linearGradient, fill }
}
