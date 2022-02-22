import "./Box.css"
import { HTMLProps, PropsWithChildren } from "react"
import { clsx } from "../util"
import { Spacer } from "./Spacer"

type BoxTitleProps = PropsWithChildren<HTMLProps<HTMLDivElement>>

export function BoxTitle({ children, className, ...props }: BoxTitleProps) {
  return (
    <h2 {...props} className={clsx("box-title", className)}>
      {children}
    </h2>
  )
}

type BoxProps = PropsWithChildren<HTMLProps<HTMLDivElement>> & {
  title?: string
}

export function Box({ title, children, className, ...props }: BoxProps) {
  return (
    <div {...props} className={clsx("box", className)}>
      {title ? (
        <>
          <BoxTitle>{title}</BoxTitle>
          <Spacer />
        </>
      ) : null}
      {children}
    </div>
  )
}
