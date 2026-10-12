'use client';

export default function UserDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Breadcrumbs Skeleton */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-slate-200 rounded-md" />
          <div className="h-4 w-4 bg-slate-100 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="h-4 w-4 bg-slate-100 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded-md" />
        </div>
        <div className="h-7 w-16 bg-slate-100 rounded-lg" />
      </div>

      {/* 2. Hero Profile Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-slate-200 rounded-full" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-6 w-48 bg-slate-200 rounded-lg" />
              <div className="h-3.5 w-60 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 bg-slate-200 rounded-xl" />
            <div className="h-8 w-24 bg-slate-200 rounded-xl" />
          </div>
        </div>

        {/* 4 Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4.5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-20 bg-slate-200 rounded-md" />
                <div className="h-3 w-28 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detail Cards Grid Skeleton (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((card) => (
          <div
            key={card}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs"
          >
            <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
            <div className="space-y-2.5">
              <div className="h-10 w-full bg-slate-50 rounded-xl border border-slate-100" />
              <div className="h-10 w-full bg-slate-50 rounded-xl border border-slate-100" />
              <div className="h-10 w-full bg-slate-50 rounded-xl border border-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. 1-Downline Team Section Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-48 bg-slate-200 rounded-md" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3.5 w-72 bg-slate-100 rounded-md" />
          </div>
          <div className="h-8 w-36 bg-slate-200 rounded-xl" />
        </div>

        {/* Filter bar */}
        <div className="p-3.5 border-b border-slate-100 bg-white">
          <div className="h-8 w-72 bg-slate-100 rounded-xl" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-36 bg-slate-200 rounded" />
                  <div className="h-2.5 w-52 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-5 w-24 bg-slate-100 rounded-full hidden sm:block" />
              <div className="h-5 w-28 bg-slate-100 rounded-lg hidden md:block" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
              <div className="h-8 w-28 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
