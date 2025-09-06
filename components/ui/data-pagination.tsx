"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface DataPaginationProps {
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  totalItems: number
  onPageChange: (page: number) => void
  showInfo?: boolean
  showItemsText?: string
  previousText?: string
  nextText?: string
}

export function DataPagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  showInfo = true,
  showItemsText = "Showing {{start}} to {{end}} of {{total}} items",
  previousText = "Previous",
  nextText = "Next"
}: DataPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const renderPageNumbers = () => {
    const pages = []
    
    // Always show first page
    if (totalPages > 0) {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => onPageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Show ellipsis if needed before current page range
    if (currentPage > 3) {
      pages.push(
        <PaginationItem key="ellipsis-start">
          <span className="px-3 py-2">...</span>
        </PaginationItem>
      )
    }

    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1)
    const endPage = Math.min(totalPages - 1, currentPage + 1)

    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => onPageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    }

    // Show ellipsis if needed after current page range
    if (currentPage < totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis-end">
          <span className="px-3 py-2">...</span>
        </PaginationItem>
      )
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => onPageChange(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return pages
  }

  return (
    <div className="space-y-2">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            >
              {previousText}
            </PaginationPrevious>
          </PaginationItem>
          
          {renderPageNumbers()}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            >
              {nextText}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      
      {showInfo && (
        <div className="text-center text-sm text-muted-foreground">
          {showItemsText
            .replace('{{start}}', String(startIndex))
            .replace('{{end}}', String(endIndex))
            .replace('{{total}}', String(totalItems))}
        </div>
      )}
    </div>
  )
}
