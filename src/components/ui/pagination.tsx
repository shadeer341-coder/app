"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function PaginationControls({
  currentPage,
  totalPages,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  currentPage: number
  totalPages: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(createPageURL(page), { scroll: false })
    }
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const pageRange = 2 

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      pageNumbers.push(1)
      if (currentPage > pageRange + 2) {
        pageNumbers.push("...")
      }

      const startPage = Math.max(2, currentPage - pageRange)
      const endPage = Math.min(totalPages - 1, currentPage + pageRange)

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }

      if (currentPage < totalPages - pageRange - 1) {
        pageNumbers.push("...")
      }

      pageNumbers.push(totalPages)
    }

    return pageNumbers
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    >
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <Button
            aria-label="Go to previous page"
            size="icon"
            variant="ghost"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </li>
        {renderPageNumbers().map((page, index) => (
          <li key={index}>
            {page === "..." ? (
              <span className="flex h-9 w-9 items-center justify-center">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <Button
                aria-current={currentPage === page ? "page" : undefined}
                variant={currentPage === page ? "outline" : "ghost"}
                size="icon"
                onClick={() => handlePageChange(page as number)}
              >
                {page}
              </Button>
            )}
          </li>
        ))}
        <li>
          <Button
            aria-label="Go to next page"
            size="icon"
            variant="ghost"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </li>
      </ul>
    </nav>
  )
}

export { PaginationControls }
