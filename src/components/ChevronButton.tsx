import { mdiChevronDown } from "@mdi/js"
import Icon from "@mdi/react"
import type { HTMLAttributes, JSX } from "react"
import { cn } from "~/styling"

export function ChevronButton({
  open,
  className = "",
  as: Component = "button",
  ...props
}: { onClick?: () => void; open: boolean; as?: keyof JSX.IntrinsicElements } & HTMLAttributes<
  HTMLElement | SVGElement
>) {
  return (
    <Component className={`z-10 cursor-pointer ${className}`} {...props}>
      <Icon path={mdiChevronDown} size={1} className={cn(`chevron transition-transform`, { "rotate-180": open })} />
    </Component>
  )
}
