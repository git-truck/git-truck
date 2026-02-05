import type { ReactNode } from "react"
import { createContext, use, useState } from "react"
import { ChevronButton } from "~/components/ChevronButton"
import { cn } from "~/styling"

const CollapsibleHeaderContext = createContext((_open: boolean) => {})

export function useSetOpenCollapsibleHeader() {
  return use(CollapsibleHeaderContext)
}

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
    <CollapsibleHeaderContext.Provider value={setOpen}>
      <details
        className={cn("relative flex flex-col gap-2", className)}
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="dark:text-secondary-text-dark hover:text-primary-text dark:hover:text-primary-text-dark flex cursor-pointer list-none items-center justify-start gap-2 text-sm leading-relaxed font-bold tracking-wider text-inherit uppercase select-none">
          <ChevronButton as="span" open={open} aria-hidden />
          <h2 className="flex flex-1 min-w-0 gap-2 items-center justify-between">{title}</h2>
        </summary>

        <div className={cn("pl-8 pr-1 pb-6", contentClassName)}>{children}</div>
      </details>
    </CollapsibleHeaderContext.Provider>
  )
}
