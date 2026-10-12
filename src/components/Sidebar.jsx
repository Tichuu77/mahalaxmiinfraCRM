'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import MahalaxmiLogo from '@/components/MahalaxmiLogo';
import {
  LayoutDashboard,
  Users,
  Sliders,
  Building2,
  CalendarCheck,
  UserCheck,
  TrendingUp,
  FileCheck,
  Receipt,
  Layers,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Team / Users', href: '/dashboard/users', icon: Users },
    ...(isAdmin ? [{ name: 'Dynamic Roles', href: '/dashboard/roles', icon: Sliders }] : []),
    { name: 'Projects & Plots', href: '/dashboard/projects', icon: Building2 },
    { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarCheck },
    { name: 'Customers', href: '/dashboard/customers', icon: UserCheck },
    { name: 'Incentives', href: '/dashboard/incentives', icon: TrendingUp },
    { name: 'Registries', href: '/dashboard/registries', icon: FileCheck },
    { name: 'Payouts & Bills', href: '/dashboard/payouts', icon: Receipt },
  ];

  return (
    <aside className="w-64 bg-brand-900 text-brand-100 flex flex-col flex-shrink-0 min-h-screen border-r border-brand-800/70 shadow-xl">
      {/* Brand Header with Official Logo */}
      <div className="h-20 flex items-center px-5 border-b border-brand-800/80 bg-brand-950/60 backdrop-blur-sm">
        <Link href="/dashboard" className="block focus:outline-none transition-opacity hover:opacity-95">
          <MahalaxmiLogo variant="on-dark" layout="horizontal" size="sm" />
        </Link>
      </div>

      {/* Scope Badge */}
      <div className="p-3.5 mx-3 my-3 bg-brand-800/60 rounded-xl border border-brand-700/60 shadow-inner">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gold-400" />
          <span className="text-xs font-semibold text-white">Data Visibility Scope</span>
        </div>
        <p className="text-[11px] text-brand-200/90 mt-1 leading-relaxed">
          {isAdmin ? 'Global Company (All branches)' : 'Restricted to your downline subtree'}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-700 text-white font-semibold shadow-md border-l-4 border-gold-500 pl-3'
                  : 'text-brand-100/80 hover:bg-brand-800/70 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-brand-300'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Info */}
      <div className="p-4 border-t border-brand-800/80 text-[11px] text-brand-300/80 flex flex-col gap-1 bg-brand-950/40">
        <span className="font-medium text-white/90">Mahalaxmi Group ERP</span>
        <span className="text-gold-400 font-medium">A Tradition of Trust • 2026</span>
      </div>
    </aside>
  );
}
