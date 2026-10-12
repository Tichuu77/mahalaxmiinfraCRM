export default function PlotDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Top Breadcrumb & Header Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-3 w-40 bg-slate-200 rounded" />
            <div className="h-6 w-32 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Main Plot Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Header Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3.5 w-44 bg-slate-100 rounded" />
          </div>

          <div className="space-y-1">
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-7 w-36 bg-slate-200 rounded" />
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Dimension Boundaries Box */}
        <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-200/70 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
