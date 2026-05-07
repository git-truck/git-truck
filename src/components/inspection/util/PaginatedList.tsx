import { startTransition, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "~/styling"

type PaginationInfo = {
  currentPage: number
  totalPages: number
}

type PaginatedListProps<T> = {
  className?: string
  items: T[]
  itemsPerPage: number
  children: (items: T[], info: PaginationInfo) => ReactNode
  navClassName?: string
  originalItemsCount?: number
  itemHeight?: number
  headerHeight?: number
  totalPages?: number
  //Inject a callback function to load more items on 'next'
  onNextFunc?: () => void
}

export function PaginatedList<T>({
  className = "",
  items,
  itemsPerPage,
  children,
  navClassName = "",
  originalItemsCount,
  itemHeight = 0,
  headerHeight = 0,
  totalPages: totalPagesOverride,
  onNextFunc
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState<number>(0)
  const previousItemsLengthRef = useRef<number>(0)
  const isLoadingMoreRef = useRef<boolean>(false)

  const calculatedTotalPages = Math.max(Math.ceil(items.length / itemsPerPage), 1)
  const totalPages = totalPagesOverride ?? calculatedTotalPages
  const safePage = Math.min(currentPage, totalPages - 1)
  const minHeight = headerHeight + itemHeight * Math.min(itemsPerPage, originalItemsCount ?? 1)

  // Reset to first page when items change, unless we're loading more items
  useEffect(() => {
    startTransition(() => {
      // If we're loading more (items increased), advance to next page
      if (isLoadingMoreRef.current && items.length > previousItemsLengthRef.current) {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
        isLoadingMoreRef.current = false
      } else if (items.length !== previousItemsLengthRef.current) {
        // Items changed for another reason (selection / clickedObject), reset to page 0
        setCurrentPage(0)
      }
      previousItemsLengthRef.current = items.length
    })
  }, [items.length, totalPages])

  const startIdx = safePage * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const shownItems = items.slice(startIdx, endIdx)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
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
        <span className="text-tertiary-text dark:text-tertiary-text-dark text-xs">
          Page {safePage + 1} of {totalPages}
        </span>
        <button
          disabled={safePage === calculatedTotalPages - 1 && !onNextFunc}
          className="btn btn--primary h-min py-1 text-xs"
          title="Next page"
          onClick={() => {
            //Check if we have already initialized 'next' set of items
            const hasNextPage = (safePage + 1) * itemsPerPage < items.length
            if (hasNextPage) {
              setCurrentPage((prev) => prev + 1)
            } else if (onNextFunc) {
              isLoadingMoreRef.current = true
              //Invoke next callback to load more itmes
              onNextFunc()
            }
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
