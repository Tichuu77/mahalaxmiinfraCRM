'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaginationItems } from '@/lib/paginationUtils';

export { getPaginationItems };

/**
 * Reusable hook to handle client-side pagination with default 10 limit
 */
export function usePagination(items = [], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page becomes invalid (e.g. after search filter reduces items)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalItems,
    totalPages,
    paginatedItems,
  };
}

/**
 * Reusable Pagination UI Component
 * Formats: Pre, 1, 2, 3, 4, 5, ..., 15, 16, 17, Next
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) {
    return null;
  }

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const paginationItems = getPaginationItems(currentPage, totalPages);

  const handleJump = (direction) => {
    if (direction === 'prev') {
      onPageChange?.(Math.max(1, currentPage - 5));
    } else {
      onPageChange?.(Math.min(totalPages, currentPage + 5));
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100 text-xs ${className}`}
    >
      {/* Left: Summary text & Limit selector */}
      <div className="flex items-center gap-3 text-slate-500 font-medium">
        <span>
          Showing <strong className="text-slate-800 font-semibold">{startItem}</strong> to{' '}
          <strong className="text-slate-800 font-semibold">{endItem}</strong> of{' '}
          <strong className="text-slate-800 font-semibold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
            <span className="text-[11px] text-slate-400">Limit:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-0.5 text-xs font-semibold border border-slate-200 rounded-md bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pre, Numbers, Next buttons */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* Pre Button */}
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-0.5 transition ${
            currentPage <= 1
              ? 'text-slate-300 border border-slate-100 bg-slate-50 cursor-not-allowed'
              : 'text-slate-700 border border-slate-200 bg-white hover:bg-slate-100 hover:text-brand-950 active:bg-slate-200'
          }`}
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Pre</span>
        </button>

        {/* Page Numbers & Ellipses */}
        {paginationItems.map((item, idx) => {
          if (item === '...') {
            const isLeftEllipsis = idx < paginationItems.length / 2;
            return (
              <button
                key={`ellipsis-${idx}`}
                onClick={() => handleJump(isLeftEllipsis ? 'prev' : 'next')}
                title={isLeftEllipsis ? 'Jump 5 pages back' : 'Jump 5 pages forward'}
                className="w-7 h-7 flex items-center justify-center text-slate-400 font-bold hover:text-brand-900 rounded-md hover:bg-slate-100 transition select-none text-xs"
              >
                ...
              </button>
            );
          }

          const pageNum = Number(item);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => onPageChange?.(pageNum)}
              className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                isActive
                  ? 'bg-brand-900 text-white shadow-xs border border-brand-900 ring-1 ring-brand-900/20'
                  : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-brand-950'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-0.5 transition ${
            currentPage >= totalPages
              ? 'text-slate-300 border border-slate-100 bg-slate-50 cursor-not-allowed'
              : 'text-slate-700 border border-slate-200 bg-white hover:bg-slate-100 hover:text-brand-950 active:bg-slate-200'
          }`}
          title="Next page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
