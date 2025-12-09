import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (showEllipsis) {
      // Afficher toujours la première page
      pages.push(1)

      if (currentPage > 4) {
        pages.push('...')
      }

      // Pages centrales autour de la page actuelle
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 3) {
        pages.push('...')
      }

      // Afficher toujours la dernière page (si plus d'une page)
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    } else {
      // Peu de pages, tout afficher
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  const pageNumbers = generatePageNumbers()

  return (
    <nav
      className={`flex items-center justify-between px-4 py-3 bg-white border-t border-neutral-200 sm:px-6 ${className}`}
      aria-label="Pagination"
    >
      {/* Navigation mobile - boutons seulement */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed ${
            currentPage <= 1 ? 'pointer-events-none' : ''
          }`}
        >
          <ChevronLeft size={16} className="mr-1" />
          Précédent
        </button>
        <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`relative ml-3 inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed ${
            currentPage >= totalPages ? 'pointer-events-none' : ''
          }`}
        >
          Suivant
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>

      {/* Navigation desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-700">
            Page <span className="font-medium">{currentPage}</span> sur{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div className="flex items-center space-x-1">
          {/* Bouton Précédent */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              currentPage <= 1 ? 'pointer-events-none' : ''
            }`}
          >
            <ChevronLeft size={16} className="mr-1" />
            Précédent
          </button>

          {/* Numéros de pages */}
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300"
                >
                  ...
                </span>
              )
            }

            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentPage === page
                    ? 'z-10 bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border border-neutral-300 text-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {page}
              </button>
            )
          })}

          {/* Bouton Suivant */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              currentPage >= totalPages ? 'pointer-events-none' : ''
            }`}
          >
            Suivant
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Indicateur mobile du nombre total */}
      <div className="hidden sm:block">
        <p className="text-sm text-neutral-500">
          {totalPages > 1 ? `${totalPages} pages au total` : ''}
        </p>
      </div>
    </nav>
  )
}
