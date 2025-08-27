import type { CSSProperties } from "react"

export function Icon({
  path,
  size = "1rem",
  color = "currentColor",
  style = {},
  className = ""
}: {
  path: string
  size?: string | number
  color?: string
  style?: CSSProperties
  className?: string
}) {
  size = typeof size === "string" ? size : `${size * 1.5}rem`
  style = {
    ...style,
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    aspectRatio: "square"
  }
  return (
    <svg
      width={style.width}
      height={style.height}
      className={className}
      style={style}
      viewBox={`0 0 24 24`}
      fill={color}
    >
      <path d={path} />
    </svg>
  )
}
