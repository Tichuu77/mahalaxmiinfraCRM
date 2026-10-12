export default function FormSkeleton({ title = 'Loading Form...', fields = 6 }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      {/* Form Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-9 w-full bg-slate-100 rounded-lg border border-slate-200/60" />
            </div>
          ))}
        </div>

        {/* Action Buttons Skeleton */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <div className="h-9 w-20 bg-slate-100 rounded-lg" />
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
