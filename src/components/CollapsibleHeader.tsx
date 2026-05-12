import type { ReactNode } from "react"
import { useState } from "react"
import { ChevronButton } from "~/components/ChevronButton"
import { cn } from "~/styling"

export function CollapsibleHeader({
  title: Title,
  children,
  defaultOpen = true,
  className,
  contentClassName = "",
  reversed = false,
  onToggle
}: {
  title: React.FC<{ open: boolean }>
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
  reversed?: boolean
  onToggle?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className={cn("relative flex flex-col gap-2", className)}
      open={open}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open
        setOpen(isOpen)
        onToggle?.(isOpen)
      }}
    >
      <summary className="dark:text-secondary-text-dark hover:text-primary-text dark:hover:text-primary-text-dark flex cursor-pointer list-none items-center justify-start gap-2 text-sm leading-relaxed font-bold tracking-wider text-inherit uppercase select-none">
        <h2 className="card__title flex min-w-0 flex-1 items-center justify-between gap-2">
          <Title open={open} />
        </h2>
        <ChevronButton aria-hidden as="span" open={reversed ? !open : open} />
      </summary>

      <div className={cn("", contentClassName)}>{children}</div>
    </details>
  )
}
