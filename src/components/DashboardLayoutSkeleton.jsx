'use client';

export default function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f9f7] animate-pulse">
      {/* Sidebar Skeleton */}
      <aside className="w-64 bg-brand-900 text-brand-100 flex flex-col flex-shrink-0 min-h-screen border-r border-brand-800/70 p-4 space-y-6">
        <div className="h-12 w-44 bg-brand-800/60 rounded-xl mt-2" />
        <div className="h-16 w-full bg-brand-800/40 rounded-xl" />
        <div className="space-y-2 flex-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 w-full bg-brand-800/30 rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main Area Skeleton */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Navbar Skeleton */}
        <header className="h-16 bg-white border-b border-brand-100/80 px-6 flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100" />
            <div className="w-8 h-8 rounded-full bg-slate-200" />
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-28 w-full bg-slate-200 rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />
              ))}
            </div>
            <div className="h-64 bg-white rounded-3xl border border-slate-100" />
          </div>
        </main>
      </div>
    </div>
  );
}
