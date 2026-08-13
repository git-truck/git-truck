import { useId, useMemo } from "react"
import { categoricalScheme } from "~/const"

type GradientVector = {
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox"
  x1?: string
  y1?: string
  x2?: string
  y2?: string
}

export function useGradient(colors: Array<string>, vector?: GradientVector) {
  const gradientId = useId()

  const fill = `url('#${gradientId}')`

  const linearGradient = useMemo(
    () =>
      colors.length > 0 ? (
        <linearGradient
          id={gradientId}
          gradientUnits={vector?.gradientUnits ?? "objectBoundingBox"}
          x1={vector?.x1 ?? "0%"}
          y1={vector?.y1 ?? "0%"}
          x2={vector?.x2 ?? "100%"}
          y2={vector?.y2 ?? "100%"}
        >
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
    [colors, gradientId, vector?.gradientUnits, vector?.x1, vector?.y1, vector?.x2, vector?.y2]
  )

  return { linearGradient, fill }
}
