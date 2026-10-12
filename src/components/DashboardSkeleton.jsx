'use client';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Header Banner Skeleton */}
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-brand-900/60 to-brand-800/50 border border-brand-800/40 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2.5">
          <div className="h-4 w-28 bg-brand-700/60 rounded-full" />
          <div className="h-7 w-64 bg-brand-700/70 rounded-xl" />
          <div className="h-3.5 w-80 max-w-full bg-brand-800/70 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-gold-500/30 rounded-xl" />
          <div className="h-9 w-32 bg-brand-700/50 rounded-xl" />
        </div>
      </div>

      {/* 2. Primary KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-200 rounded-md" />
              <div className="w-10 h-10 rounded-xl bg-slate-100" />
            </div>
            <div className="h-8 w-36 bg-slate-200 rounded-lg" />
            <div className="h-3 w-44 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3. Secondary KPI Bar Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4.5 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-slate-100" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-24 bg-slate-200 rounded-md" />
              <div className="h-5 w-32 bg-slate-200 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Interactive Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Inventory Donut Chart Skeleton */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-3 w-20 bg-slate-100 rounded-md" />
          </div>
          <div className="h-56 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-50 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Right: Revenue & Collection Trend Chart Skeleton */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-48 bg-slate-200 rounded-md" />
              <div className="h-3 w-32 bg-slate-100 rounded-md" />
            </div>
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
          </div>
          <div className="h-56 flex items-end gap-3 pt-6 px-4">
            {[40, 70, 55, 90, 65, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 rounded-t-lg transition-all" style={{ height: `${h}%` }} />
                <div className="h-2.5 w-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Performers & Project Performance Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Performers Table Skeleton */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="h-4 w-44 bg-slate-200 rounded-md" />
            <div className="h-3 w-28 bg-slate-100 rounded-md" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100" />
                <div className="space-y-1">
                  <div className="h-3.5 w-28 bg-slate-200 rounded-md" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>

        {/* Project Breakdown Skeleton */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 space-y-3.5 shadow-xs">
          <div className="h-4 w-36 bg-slate-200 rounded-md mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5 p-3 rounded-xl bg-slate-50">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Recent Bookings Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 rounded-md" />
          <div className="h-3 w-16 bg-slate-100 rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full bg-slate-50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
