'use client';

export default function MetricCard({ title, value, subtitle, icon: Icon, badge, color = 'emerald' }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    gold: 'bg-gold-50 text-gold-700 border-gold-200',
    amber: 'bg-gold-50 text-gold-700 border-gold-200',
    emerald: 'bg-brand-50 text-brand-700 border-brand-200',
    blue: 'bg-brand-50/70 text-brand-700 border-brand-200',
    purple: 'bg-brand-50 text-brand-800 border-brand-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-100/80 p-5 shadow-xs hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-brand-950">{value}</span>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
