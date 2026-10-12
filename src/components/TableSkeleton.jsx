'use client';

export default function TableSkeleton({ rows = 6, cols = 5, hasSearch = false, hasStats = false }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Optional Stats Bar Skeleton */}
      {hasStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="w-4 h-4 bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-16 bg-slate-200 rounded-md" />
              <div className="h-2.5 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Optional Filter / Search Bar Skeleton */}
      {hasSearch && (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="h-9 w-full md:w-80 bg-slate-100 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-slate-100 rounded-lg" />
            <div className="h-9 w-20 bg-slate-100 rounded-lg" />
            <div className="h-9 w-9 bg-slate-100 rounded-lg" />
          </div>
        </div>
      )}

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header Placeholder */}
        <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
          <div className="h-3.5 w-32 bg-slate-200 rounded" />
          <div className="flex gap-4">
            {Array.from({ length: Math.min(cols, 4) }).map((_, i) => (
              <div key={i} className="h-3 w-20 bg-slate-200 rounded hidden sm:block" />
            ))}
          </div>
        </div>

        {/* Table Rows Placeholder */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="p-4 flex items-center justify-between gap-4">
              {/* Primary Col (Avatar / Title) */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-36 bg-slate-200 rounded" />
                  <div className="h-2.5 w-24 bg-slate-100 rounded" />
                </div>
              </div>

              {/* Intermediate Cols */}
              <div className="h-4 w-28 bg-slate-100 rounded hidden md:block" />
              <div className="h-4 w-20 bg-slate-100 rounded hidden sm:block" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />

              {/* Action Buttons Col */}
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                <div className="w-7 h-7 bg-slate-100 rounded-lg hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
