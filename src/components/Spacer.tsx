import { CSSProperties } from "react"

export enum Spacing {
  xs = 0.5,
  sm = 0.75,
  md = 1,
  lg = 1.5,
  xl = 2,
  xxl = 3,
}

type SpacerProps = { horizontal?: boolean } & {
  size?: Spacing
  /**
   * Extra small spacing
   */
  xs?: boolean
  /**
   * Small spacing
   */
  sm?: boolean
  /**
   * Medium spacing
   */
  md?: boolean
  /**
   * Large spacing
   */
  lg?: boolean
  /**
   * Extra large spacing
   */
  xl?: boolean
  /**
   * Extra extra large spacing
   */
  xxl?: boolean
}

export const Spacer = (props: SpacerProps) => {
  const spacing =
    props.size ?? props.xs
      ? Spacing.xs
      : props.sm
      ? Spacing.sm
      : props.md
      ? Spacing.md
      : props.lg
      ? Spacing.lg
      : props.xl
      ? Spacing.xl
      : props.xxl
      ? Spacing.xxl
      : Spacing.md

  const sizeProp = `calc(${spacing} * var(--unit))`
  const styles = {
    height: props.horizontal ? "1px" : sizeProp,
    width: props.horizontal ? sizeProp : "1px",
    ...props.horizontal ? {
      display: "inline-block",
    } : {}
  } as CSSProperties
  return <div aria-hidden style={styles} />
}

Spacer.defaultProps = {
  size: null,
  sm: false,
  md: false,
  lg: false,
  xl: false,
  horizontal: false,
}
