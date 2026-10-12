'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { Bell, CheckCheck, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: !!user,
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiFetch('/notifications', { method: 'PUT', body: JSON.stringify({ all: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  return (
    <header className="h-16 bg-white border-b border-brand-100/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600">
            Mahalaxmi Group Portal
          </span>
          <span className="text-sm font-bold text-brand-950">
            {isAdmin ? 'System Administrator' : `${user?.roleId?.name || 'User'} Workspace`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full text-brand-800 hover:text-brand-950 hover:bg-brand-50 relative transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-gold-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-brand-100 overflow-hidden z-50">
              <div className="p-3 bg-brand-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold-400" />
                  <span className="font-semibold text-sm">Hierarchy Alerts</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-xs text-gold-300 hover:text-gold-100 flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-brand-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3 text-xs transition ${
                        n.isRead ? 'bg-white hover:bg-brand-50/40' : 'bg-gold-50/40 hover:bg-gold-50/70'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-brand-950">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-brand-100">
          <div className="w-9 h-9 rounded-full bg-brand-700 text-gold-300 border border-gold-500/40 flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-semibold text-brand-950 leading-tight">{user?.name}</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gold-50 text-gold-800 border border-gold-200">
                {user?.roleId?.name}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
