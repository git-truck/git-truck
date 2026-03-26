import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

export function ExpandingPanelButton({
  icon,
  children,
  disabled = false,
  iconClassName = "",
  onClick,
  danger = false,
  expanded = false
}: {
  icon: string
  children: string
  disabled?: boolean
  iconClassName?: string
  onClick?: () => void
  danger?: boolean
  expanded?: boolean
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "btn group flex h-8 w-fit shrink-0 items-center justify-start gap-0 overflow-hidden rounded-t-lg rounded-b-none px-2 transition-all duration-200",
        disabled && "cursor-not-allowed opacity-50",
        danger && "btn--danger border-border border-2"
      )}
      onClick={onClick}
    >
      <span className={cn("transition-transform duration-150", iconClassName)}>
        <Icon path={icon} size="1em" />
      </span>
      <span
        className={cn(
          "max-w-0 overflow-hidden text-xs font-bold whitespace-nowrap transition-all duration-200",
          !expanded && !disabled && "opacity-0 group-hover:ml-2 group-hover:max-w-fit group-hover:opacity-100",
          expanded && "ml-2 max-w-16 opacity-100"
        )}
      >
        {children}
      </span>
    </button>
  )
}
