import { CSSProperties } from "react"

export enum Spacing {
  xs = 0.5,
  sm = 0.75,
  md = 1,
  lg = 1.5,
  xl = 2,
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
}

export const Spacer = (props: SpacerProps) => {
  let spacing =
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
      : Spacing.md

  const styles = {
    height: props.horizontal ? "1px" : `calc(${spacing} * var(--unit))`,
    width: props.horizontal ? `calc(${spacing} * var(--unit))` : "1px",
  } as CSSProperties
  return <div aria-hidden style={styles} />
}

Spacer.defaultProps = {
  sm: false,
  md: true,
  lg: false,
  xl: false,
  horizontal: false,
}
