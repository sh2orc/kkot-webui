import { useState, useMemo } from 'react'

interface UsePaginationProps<T> {
  items: T[]
  itemsPerPage: number
  searchTerm?: string
  searchFields?: (keyof T)[]
}

interface UsePaginationReturn<T> {
  currentPage: number
  totalPages: number
  paginatedItems: T[]
  filteredItems: T[]
  totalItems: number
  startIndex: number
  endIndex: number
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  resetPage: () => void
}

export function usePagination<T extends Record<string, any>>({
  items,
  itemsPerPage,
  searchTerm = '',
  searchFields = []
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) {
      return items
    }

    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      })
    )
  }, [items, searchTerm, searchFields])

  // Calculate pagination values
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length)
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  // Reset to page 1 when filtered items change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredItems.length, totalPages, currentPage])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const resetPage = () => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    totalPages,
    paginatedItems,
    filteredItems,
    totalItems: filteredItems.length,
    startIndex: startIndex + 1, // 1-based index for display
    endIndex,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPage
  }
}
