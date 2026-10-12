'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import UserEditModal from '@/components/UserEditModal';
import UserDetailSkeleton from '@/components/UserDetailSkeleton';
import Pagination, { usePagination } from '@/components/Pagination';
import {
  Users,
  UserPlus,
  ArrowLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldCheck,
  Crown,
  Copy,
  Check,
  Edit3,
  Power,
  Key,
  TrendingUp,
  CalendarCheck,
  Search,
  Layers,
  ArrowUpRight,
  X,
} from 'lucide-react';

export default function UserDetailPage({ params }) {
  const router = useRouter();
  const routeParams = useParams();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const userId = routeParams?.id || params?.id;

  const [copiedField, setCopiedField] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTargetUser, setEditingTargetUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    reportsTo: userId,
  });

  const isAdmin = currentUser?.roleId?.isRoot || currentUser?.roleId?.rank === 0;

  // Fetch user details, 1-downline members, upline breadcrumbs, and stats
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: () => apiFetch(`/users/${userId}`),
  });

  // Fetch available roles for member creation
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  });

  const targetUser = data?.user;
  const directReports = data?.directReports || [];
  const breadcrumbs = data?.breadcrumbs || [];
  const stats = data?.stats || {};
  const roles = rolesData?.roles || [];

  // Toggle user active/inactive mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch('/users', { method: 'PUT', body: JSON.stringify({ _id: id, status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) =>
      apiFetch('/users', { method: 'PUT', body: JSON.stringify({ _id: id, password }) }),
    onSuccess: () => {
      setPasswordModalOpen(false);
      setNewPassword('');
      alert('Password updated successfully');
    },
  });

  // Create new direct downline member mutation
  const createMemberMutation = useMutation({
    mutationFn: (newMember) =>
      apiFetch('/users', { method: 'POST', body: JSON.stringify(newMember) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddMemberModalOpen(false);
      setNewMemberForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        roleId: '',
        reportsTo: userId,
      });
      alert('Downline team member created successfully');
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create member');
    },
  });

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const formatINR = (val) => {
    if (!val && val !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Check if current user can manage target user
  const isSelf = currentUser?._id === targetUser?._id;
  const canManageTarget =
    isAdmin || (!isSelf && targetUser?.roleId?.rank > (currentUser?.roleId?.rank ?? 999));

  // Filter allowed roles for creating a new member under targetUser
  const allowedRoles = useMemo(() => {
    if (!roles) return [];
    if (isAdmin) return roles;
    return roles.filter((r) => r.rank > (currentUser?.roleId?.rank ?? 999));
  }, [roles, isAdmin, currentUser]);

  // Filter 1-downline team members by search query
  const filteredDirectReports = useMemo(() => {
    if (!searchTerm.trim()) return directReports;
    const term = searchTerm.toLowerCase();
    return directReports.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        (m.phone && m.phone.includes(term)) ||
        (m.roleId?.name && m.roleId.name.toLowerCase().includes(term))
    );
  }, [directReports, searchTerm]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedDirectReports,
    totalItems: totalDirectReportsCount,
  } = usePagination(filteredDirectReports, 10);

  // Use minimalist skeleton loader instead of basic spinner
  if (isLoading) {
    return <UserDetailSkeleton />;
  }

  if (error || !targetUser) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <div className="p-5 bg-white border border-rose-200 rounded-2xl shadow-2xs space-y-2">
          <div className="font-semibold text-rose-700 flex items-center gap-2 text-sm">
            <X className="w-4 h-4" /> User Not Found or Inaccessible
          </div>
          <p className="text-xs text-slate-500">
            {error?.message || 'The user could not be loaded or you do not have permission to view them.'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/users')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Team / Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Minimal Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <nav className="flex items-center gap-1.5 text-xs flex-wrap" aria-label="Breadcrumb">
          <Link
            href="/dashboard/users"
            className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Team Members
          </Link>

          {breadcrumbs.map((uplineUser) => (
            <div key={uplineUser._id} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <Link
                href={`/dashboard/users/${uplineUser._id}`}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
                title={`View ${uplineUser.name} (${uplineUser.roleId?.name || 'Manager'})`}
              >
                <span>{uplineUser.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">({uplineUser.roleId?.name || 'Manager'})</span>
              </Link>
            </div>
          ))}

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {targetUser.name}
          </span>
        </nav>

        <button
          onClick={() => router.back()}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* 2. Hero Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Profile Header */}
        <div className="p-5 sm:p-6 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold bg-slate-900 text-white shadow-2xs shrink-0">
              {targetUser.name?.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                  {targetUser.roleId?.name || 'Advisor'}
                </span>
                {targetUser.roleId?.isRoot && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-600" /> Root Admin
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    targetUser.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      targetUser.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {targetUser.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {targetUser.name}
              </h1>

              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span>Rank {targetUser.roleId?.rank ?? '—'}</span>
                <span>•</span>
                <span>Joined {targetUser.createdAt ? new Date(targetUser.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          {canManageTarget && (
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <button
                onClick={() => {
                  setEditingTargetUser(targetUser);
                  setEditModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit
              </button>

              <button
                onClick={() =>
                  toggleStatusMutation.mutate({
                    id: targetUser._id,
                    status: targetUser.status === 'active' ? 'inactive' : 'active',
                  })
                }
                title={targetUser.status === 'active' ? 'Deactivate User' : 'Activate User'}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  targetUser.status === 'active'
                    ? 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {targetUser.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>

              <button
                onClick={() => {
                  setNewPassword('');
                  setPasswordModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-slate-400" /> Reset Password
              </button>
            </div>
          )}
        </div>

        {/* 3. Metric Counters Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          <div className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {directReports.length}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">1 Downline Members</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {stats.totalDownlineCount ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Total Downline Tree</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {stats.bookingsCount ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Plots Booked</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight truncate">
                {formatINR(stats.totalSales || 0)}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Booked Volume</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Details Grid: Contact, Manager, Commission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Contact Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Contact Details
            </h3>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{targetUser.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(targetUser.email, 'email')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {targetUser.phone && (
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{targetUser.phone}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(targetUser.phone, 'phone')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-500 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-slate-600">{targetUser._id}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(targetUser._id, 'id')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Copy ID"
                >
                  {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Manager Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Direct Manager (Reports To)
            </h3>

            {targetUser.reportsTo ? (
              <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {targetUser.reportsTo.name?.charAt(0) || 'M'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 text-xs block truncate">
                      {targetUser.reportsTo.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {targetUser.reportsTo.roleId?.name || 'Manager'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1.5 border-t border-slate-200/60">
                  <p className="truncate">{targetUser.reportsTo.email}</p>
                  {targetUser.reportsTo.phone && <p>{targetUser.reportsTo.phone}</p>}
                </div>

                <Link
                  href={`/dashboard/users/${targetUser.reportsTo._id}`}
                  className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  View Manager&apos;s Page <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  Root Administrator
                </div>
                <p className="text-[11px] text-slate-400">
                  Top level authority of organization. No direct reporting superior.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Commission & Incentive Tier Rates */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Commission &amp; Rates
            </h3>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Direct Seller Rate</span>
                <span className="font-semibold text-slate-900">
                  ₹{targetUser.roleId?.sellerRate ?? 0} <span className="text-[10px] text-slate-400 font-normal">/ sq.ft</span>
                </span>
              </div>

              <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Team Override Rate</span>
                <span className="font-semibold text-slate-900">
                  ₹{targetUser.roleId?.overrideRate ?? 0} <span className="text-[10px] text-slate-400 font-normal">/ sq.ft</span>
                </span>
              </div>

              <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Minimum Advance %</span>
                <span className="font-semibold text-slate-900">
                  {targetUser.roleId?.minAdvancePercent ?? 20}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Direct 1-Downline Team Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                1 Downline Team Members
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800">
                {directReports.length}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Direct team members supervised immediately by {targetUser.name}. Click to view their profile and downline.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {allowedRoles.length > 0 && canManageTarget && (
              <button
                onClick={() => {
                  setFormError('');
                  setNewMemberForm({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    roleId: allowedRoles[0]?._id || '',
                    reportsTo: targetUser._id,
                  });
                  setAddMemberModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Member
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        {directReports.length > 0 && (
          <div className="p-3.5 border-b border-slate-100 bg-white">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name, email, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
              />
            </div>
          </div>
        )}

        {/* Member List Table */}
        {directReports.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">
              No Direct Downline Members
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {targetUser.name} currently does not have any direct subordinate team members.
            </p>
            {allowedRoles.length > 0 && canManageTarget && (
              <button
                onClick={() => {
                  setFormError('');
                  setNewMemberForm({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    roleId: allowedRoles[0]?._id || '',
                    reportsTo: targetUser._id,
                  });
                  setAddMemberModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition shadow-2xs mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add First Member
              </button>
            )}
          </div>
        ) : filteredDirectReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No team members matched &ldquo;{searchTerm}&rdquo;
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium text-center">Downline</th>
                  <th className="py-2.5 px-4 font-medium text-center">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDirectReports.map((member) => (
                  <tr
                    key={member._id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/users/${member._id}`}
                        className="flex items-center gap-3 group-hover:text-slate-900 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 group-hover:underline block text-xs truncate">
                            {member.name}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {member.email} {member.phone ? `• ${member.phone}` : ''}
                          </span>
                        </div>
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-700">
                        {member.roleId?.name || 'Advisor'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-medium text-[11px]">
                        <Users className="w-3 h-3 text-slate-400" />
                        {member.directReportsCount || 0} direct
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {member.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/users/${member._id}`}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          title="View member and their downline team"
                        >
                          View &amp; Downline <ChevronRight className="w-3 h-3" />
                        </Link>

                        {canManageTarget && (
                          <button
                            onClick={() => {
                              setEditingTargetUser(member);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                            title="Edit Member"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalDirectReportsCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* User Edit Modal */}
      {editingTargetUser && (
        <UserEditModal
          userToEdit={editingTargetUser}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTargetUser(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            refetch();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-600" /> Reset Password
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <strong>{targetUser.name}</strong>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPassword || newPassword.length < 6) {
                  alert('Password must be at least 6 characters');
                  return;
                }
                resetPasswordMutation.mutate({
                  id: targetUser._id,
                  password: newPassword,
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                >
                  {resetPasswordMutation.isPending ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Direct Downline Member Modal */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-600" /> Add Downline Member
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reports directly to <strong>{targetUser.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setAddMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError('');
                createMemberMutation.mutate(newMemberForm);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberForm.name}
                  onChange={(e) =>
                    setNewMemberForm({ ...newMemberForm, name: e.target.value })
                  }
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newMemberForm.email}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newMemberForm.phone}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, phone: e.target.value })
                    }
                    placeholder="Mobile number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assign Role *
                </label>
                <select
                  value={newMemberForm.roleId}
                  onChange={(e) =>
                    setNewMemberForm({ ...newMemberForm, roleId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none bg-white"
                >
                  <option value="">Select a role...</option>
                  {allowedRoles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} (Rank {r.rank})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newMemberForm.password}
                  onChange={(e) =>
                    setNewMemberForm({ ...newMemberForm, password: e.target.value })
                  }
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                Direct Manager: <strong>{targetUser.name}</strong> ({targetUser.roleId?.name || 'Advisor'})
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMemberMutation.isPending}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                >
                  {createMemberMutation.isPending ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
