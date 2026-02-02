import type { ReactNode } from "react"
import { useState } from "react"
import { ChevronButton } from "~/components/ChevronButton"
import { cn } from "~/styling"

export function CollapsibleHeader({
  title,
  children,
  defaultOpen = true,
  className,
  contentClassName = ""
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className={cn("relative flex flex-col gap-2", className)}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="dark:text-secondary-text-dark hover:text-primary-text dark:hover:text-primary-text-dark flex cursor-pointer list-none items-center justify-start gap-2 text-sm leading-relaxed font-bold tracking-wider text-inherit uppercase select-none">
        <ChevronButton as="span" open={open} aria-hidden />
        <h2 className="flex flex-1 items-center justify-between">{title}</h2>
      </summary>

      <div className={cn("px-8 pb-6", contentClassName)}>{children}</div>
    </details>
  )
}
