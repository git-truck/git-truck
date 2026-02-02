import { mdiChevronDown } from "@mdi/js"
import { Icon } from "~/components/Icon"
import type { HTMLAttributes, JSX } from "react"
import { cn } from "~/styling"

export function ChevronButton({
  open,
  className = "",
  size = 1,
  as: Component = "button",
  ...props
}: { onClick?: () => void; size?: number; open: boolean; as?: keyof JSX.IntrinsicElements } & HTMLAttributes<
  HTMLElement | SVGElement
>) {
  return (
    <Component className={cn("cursor-pointer", className)} {...props}>
      {props.children}
      <Icon path={mdiChevronDown} size={size} className={cn("chevron transition-transform", { "rotate-180": open })} />
    </Component>
  )
}
