import { mdiChevronDown } from "@mdi/js"
import Icon from "@mdi/react"
import type { HTMLAttributes } from "react"
import { cn } from "~/styling"

export function ChevronButton({
  onClick = () => void 0,
  open,
  className = "",
  ...props
}: { onClick?: () => void; open: boolean } & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`z-10 cursor-pointer ${className}`} onClick={onClick} {...props}>
      <Icon path={mdiChevronDown} size={1} className={cn(`chevron transition-transform`, { "rotate-180": open })} />
    </button>
  )
}
