'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Building2,
  CalendarCheck,
  FileCheck,
  TrendingUp,
  Wallet,
  Clock,
  Users,
  Award,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// Indian Currency Formatter helper
const formatINR = (val) => {
  if (!val && val !== 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

// Custom Chart Tooltips
const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-950/95 backdrop-blur-md text-white p-3 rounded-xl border border-brand-800 shadow-xl text-xs space-y-1.5 z-50">
        <p className="font-bold text-gold-400 border-b border-brand-800/80 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-white">{formatINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-brand-950/95 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-brand-800 shadow-xl text-xs space-y-0.5 z-50">
        <div className="flex items-center gap-1.5 font-bold" style={{ color: data.payload.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
          {data.name} Plots
        </div>
        <p className="font-bold text-white text-sm">
          {data.value} Units{' '}
          <span className="text-[11px] font-normal text-slate-400">({pct}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiFetch('/dashboard'),
  });

  const kpi = data?.kpi || {};
  const plotDistribution = data?.plotDistribution || [];
  const projectDistribution = data?.projectDistribution || [];
  const monthlyTrend = data?.monthlyTrend || [];
  const teamPerformers = data?.teamPerformers || [];
  const recentBookings = data?.recentBookings || [];

  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  // Compute total plots for percentage in donut chart
  const totalPlotsCount = useMemo(() => {
    return plotDistribution.reduce((acc, curr) => acc + (curr.value || 0), 0) || kpi.totalPlots || 0;
  }, [plotDistribution, kpi.totalPlots]);

  // Max project revenue for progress bars
  const maxProjectRevenue = useMemo(() => {
    if (!projectDistribution.length) return 1;
    return Math.max(...projectDistribution.map((p) => p.totalRevenue || 0), 1);
  }, [projectDistribution]);

  // If loading, show the full DashboardSkeleton instead of spinning loader
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
        <div>
          <span className="font-bold block">Failed to load dashboard metrics</span>
          <span className="text-xs text-red-600">{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-brand-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500 text-brand-950 uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-950" /> {user?.roleId?.name || 'Advisor'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-800/80 text-brand-200 border border-brand-700">
              Live Operations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            Welcome, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-100/90 mt-1 max-w-xl leading-relaxed">
            {isAdmin
              ? 'Administrator Master Command: Full enterprise visibility across all regional branches, plots, and financial payouts.'
              : 'Hierarchy Downline View: Real-time telemetry of your team performance, commissions, and customer bookings.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 flex-shrink-0 flex-wrap">
          <Link
            href="/dashboard/bookings"
            className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-brand-950 font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5 border border-gold-400"
          >
            <CalendarCheck className="w-4 h-4 text-brand-900" /> Book a Plot
          </Link>
          <Link
            href="/dashboard/users"
            className="px-4 py-2.5 bg-brand-800/90 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl border border-brand-600/70 transition flex items-center gap-1.5 shadow-sm"
          >
            <Users className="w-4 h-4 text-gold-400" /> Team &amp; Downline
          </Link>
        </div>
      </div>

      {/* 2. Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Downline Revenue"
          value={formatINR(kpi.totalRevenue || 0)}
          subtitle={`${formatINR(kpi.totalCollected || 0)} collected advance`}
          icon={TrendingUp}
          color="brand"
        />

        <MetricCard
          title="My Approved Earnings"
          value={formatINR(kpi.myApprovedEarnings || 0)}
          subtitle={`${formatINR(kpi.myPaidEarnings || 0)} already disbursed`}
          icon={Wallet}
          color="gold"
        />

        <MetricCard
          title="Team Bookings"
          value={kpi.totalBookings || 0}
          subtitle={`${kpi.activeBookings || 0} active / paid bookings`}
          icon={CalendarCheck}
          color="brand"
        />

        <MetricCard
          title="Pending Approvals"
          value={kpi.pendingApprovalsCount || 0}
          subtitle={kpi.pendingApprovalsCount > 0 ? 'Action required in Incentives' : 'All caught up'}
          icon={Clock}
          color={kpi.pendingApprovalsCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* 3. Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex items-center gap-4 shadow-xs hover:border-brand-200 transition">
          <div className="p-3 bg-brand-50 text-brand-700 rounded-xl border border-brand-100 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Active Projects
            </span>
            <p className="text-lg font-black text-brand-950 truncate">
              {kpi.totalProjects || 0} Prime Townships
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex items-center gap-4 shadow-xs hover:border-brand-200 transition">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Completed Registries
            </span>
            <p className="text-lg font-black text-brand-950 truncate">
              {kpi.totalRegistries || 0} Registered Plots
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex items-center gap-4 shadow-xs hover:border-brand-200 transition">
          <div className="p-3 bg-gold-50 text-gold-700 rounded-xl border border-gold-200 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Hierarchy Scope
            </span>
            <p className="text-lg font-black text-brand-950 truncate">
              {isAdmin ? 'Entire Company' : `${kpi.downlineTeamSize || 0} Downline Advisors`}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Plot Inventory Distribution (Donut Chart) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-brand-950 text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brand-700" /> Plot Inventory Breakdown
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {totalPlotsCount} Total
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time plotted development availability across all townships.
            </p>

            {/* Donut Chart Canvas */}
            <div className="h-60 w-full relative flex items-center justify-center">
              {mounted && totalPlotsCount > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={plotDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      cornerRadius={6}
                    >
                      {plotDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip total={totalPlotsCount} />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-slate-400">Loading chart...</div>
              )}

              {/* Central Metric in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-brand-950 tracking-tight">
                  {totalPlotsCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Units
                </span>
              </div>
            </div>
          </div>

          {/* Donut Legend Cards */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            {plotDistribution.map((item) => {
              const pct = totalPlotsCount > 0 ? Math.round((item.value / totalPlotsCount) * 100) : 0;
              return (
                <div
                  key={item.name}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-center space-y-0.5"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-sm font-extrabold text-brand-950">{item.value}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{pct}% share</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Chart: Financial Trend (Area Chart) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-extrabold text-brand-950 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> Sales & Collection Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly progression of total booked value vs. received advance payments.
                </p>
              </div>

              {/* Chart Legend Pills */}
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Total Sales
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold-500" /> Collected Advance
                </span>
              </div>
            </div>

            {/* Area Chart Canvas */}
            <div className="h-64 w-full mt-3">
              {mounted && monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(val) => (val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val)}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Total Sales"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      name="Collected Advance"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#collectedGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading trajectory data...
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Footer */}
          <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-emerald-900 font-medium">Recorded Sales</span>
              <span className="font-extrabold text-emerald-800">
                {formatINR(kpi.totalRevenue || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-gold-50/50 rounded-xl border border-gold-200/60">
              <span className="text-gold-900 font-medium">Realized Advance</span>
              <span className="font-extrabold text-gold-800">
                {formatINR(kpi.totalCollected || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Performers Leaderboard & Project Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Performers Table */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-brand-950 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-gold-500" /> Top Sales Performers
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Top advisors in your downline ranked by booked plot volume.
              </p>
            </div>
            <Link
              href="/dashboard/users"
              className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1"
            >
              Full Team <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {teamPerformers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No sales recorded in your downline team yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-2.5">Rank / Advisor</th>
                    <th className="pb-2.5">Designation</th>
                    <th className="pb-2.5 text-center">Bookings</th>
                    <th className="pb-2.5 text-right">Total Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamPerformers.map((performer, idx) => (
                    <tr key={performer._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 font-semibold text-brand-950">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-brand-950 block">{performer.name}</span>
                            <span className="text-[10px] text-slate-400">{performer.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                          {performer.roleName || 'Advisor'}
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-brand-950">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold">
                          {performer.bookingsCount} plots
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-emerald-700 text-sm">
                        {formatINR(performer.totalSales || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Project-wise Revenue Contribution */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-brand-950 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-700" /> Township Performance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revenue contribution by plotted project.
                </p>
              </div>
              <Link
                href="/dashboard/projects"
                className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1"
              >
                All Projects <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projectDistribution.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active project sales logged yet
              </div>
            ) : (
              <div className="space-y-3.5">
                {projectDistribution.map((project) => {
                  const pct = Math.round(((project.totalRevenue || 0) / maxProjectRevenue) * 100);
                  return (
                    <div
                      key={project._id}
                      className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-bold text-brand-950 text-xs truncate block">
                            {project.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {project.code} • {project.bookingsCount} Bookings
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-brand-950 text-xs block">
                            {formatINR(project.totalRevenue)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            {formatINR(project.totalCollected)} coll.
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-700 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Combined Township Volume</span>
            <span className="font-extrabold text-brand-950">
              {formatINR(kpi.totalRevenue || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Recent Downline Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-brand-950 text-sm">Recent Downline Bookings</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest transactions entered across your accessible territory.
            </p>
          </div>
          <Link
            href="/dashboard/bookings"
            className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1"
          >
            View All Bookings <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No bookings recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Booking No</th>
                  <th className="pb-3 px-3">Township & Plot</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Seller Advisor</th>
                  <th className="pb-3 px-3 text-right">Plot Value</th>
                  <th className="pb-3 px-3 text-right">Advance Paid</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-bold text-brand-950 font-mono">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-brand-950 block">{b.projectId?.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {b.plotId?.plotNumber} ({b.plotId?.sizeSqFt} sq.ft.)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 block">{b.customerId?.name}</span>
                      <span className="text-[10px] text-slate-400">{b.customerId?.phone}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700 block">{b.sellerId?.name}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-brand-950">
                      {formatINR(b.totalPlotValue || 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {formatINR(b.bookingAmount || 0)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'registry'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
