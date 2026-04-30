import { startTransition, useEffect, useState, type ReactNode } from "react"
import { cn } from "~/styling"

type PaginationInfo = {
  currentPage: number
  totalPages: number
}

type PaginatedListProps<T> = {
  items: T[]
  itemsPerPage: number
  children: (items: T[], info: PaginationInfo) => ReactNode
  navClassName?: string
  originalItemsCount?: number
  itemHeight?: number
  headerHeight?: number
}

export function PaginatedList<T>({
  items,
  itemsPerPage,
  children,
  navClassName = "",
  originalItemsCount,
  itemHeight = 0,
  headerHeight = 0
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState<number>(0)

  const totalPages = Math.max(Math.ceil(items.length / itemsPerPage), 1)
  const maxTotalPages = originalItemsCount ? Math.max(Math.ceil(originalItemsCount / itemsPerPage), 1) : totalPages
  const safePage = Math.min(currentPage, totalPages - 1)

  // Calculate minimum height if pagination exists in original items
  const shouldMaintainHeight = maxTotalPages > 1 && itemHeight > 0
  const minHeight = shouldMaintainHeight ? headerHeight + itemHeight * itemsPerPage : undefined

  // Reset to first page when items change
  useEffect(() => {
    startTransition(() => {
      setCurrentPage(0)
    })
  }, [items.length])

  const startIdx = safePage * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const shownItems = items.slice(startIdx, endIdx)

  return (
    <div className="flex flex-col gap-2">
      <div style={minHeight ? { minHeight: `${minHeight}px` } : undefined} className="flex flex-col gap-2">
        {children(shownItems, { currentPage: safePage, totalPages })}
      </div>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
      <div className={cn("flex items-center justify-between gap-2", navClassName)}>
        <button
          disabled={safePage === 0}
          className="btn btn--primary h-min py-1 text-xs"
          title="Previous page"
          onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
        >
          ← Prev
        </button>
        <span className="text-tertirary-text dark:text-tertiary-text-dark text-xs">
          Page {safePage + 1} of {totalPages}
        </span>
        <button
          disabled={safePage === totalPages - 1}
          className="btn btn--primary h-min py-1 text-xs"
          title="Next page"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
