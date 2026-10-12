'use client';

export default function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-6 w-56 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-2">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-16 bg-slate-200 rounded-md" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Filter and Plot Grid Skeleton */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs flex justify-between gap-3">
        <div className="h-9 w-64 bg-slate-100 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-100 rounded-lg" />
          <div className="h-9 w-20 bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
              <div className="h-4 w-12 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
