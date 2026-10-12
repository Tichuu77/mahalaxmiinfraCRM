'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Users, UserPlus, Key, Trash2, Power, Edit3, X, Check, Search, Shield, Eye } from 'lucide-react';
import UserEditModal from '@/components/UserEditModal';
import Pagination, { usePagination } from '@/components/Pagination';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editUser, setEditUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    reportsTo: '',
  });
  const [formError, setFormError] = useState('');

  const { data: userData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch('/users'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] });
      setModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', roleId: '', reportsTo: '' });
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create user');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch('/users', { method: 'PUT', body: JSON.stringify({ _id: id, status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) =>
      apiFetch('/users', { method: 'PUT', body: JSON.stringify({ _id: id, password }) }),
    onSuccess: () => {
      setPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('Password updated successfully');
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/users?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] });
    },
  });

  const users = userData?.users || [];
  const roles = rolesData?.roles || [];

  // Filter roles allowed for creation (must be lower rank than acting user)
  const allowedRoles = roles.filter((r) => {
    if (isAdmin) return true;
    return r.rank > (user?.roleId?.rank ?? 999);
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm)
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedUsers,
    totalItems: totalUsersCount,
  } = usePagination(filteredUsers, 10);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    createUserMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> Team Members & User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 2.5: You can create, edit, activate/deactivate, and reset passwords for users in your downline at any rank below your own.
          </p>
        </div>

        {allowedRoles.length > 0 && (
          <button
            onClick={() => {
              setFormError('');
              setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                roleId: allowedRoles[0]?._id || '',
                reportsTo: user?._id || '',
              });
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Add Downline Member
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {usersLoading ? (
          <div className="divide-y divide-slate-100 animate-pulse">
            <div className="p-4 bg-slate-50/50 flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-2.5 w-48 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-5 w-24 bg-slate-100 rounded-full hidden sm:block" />
                <div className="h-4 w-28 bg-slate-100 rounded hidden md:block" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-8 w-24 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-medium">User</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Direct Manager</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const isSelf = u._id === user?._id;
                  const canManage = isAdmin || (!isSelf && u.roleId?.rank > (user?.roleId?.rank ?? 999));

                  return (
                    <tr key={u._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/users/${u._id}`}
                          className="flex items-center gap-2.5 text-left group focus:outline-none"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-amber-100 font-bold text-slate-700 group-hover:text-amber-800 flex items-center justify-center text-xs transition">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-brand-950 group-hover:text-amber-600 transition block">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-slate-500">{u.email} • {u.phone}</span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-800">
                          {u.roleId?.name}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {u.reportsTo ? (
                          <span className="font-medium text-slate-800">{u.reportsTo.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">None (Top Authority)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <Link
                            href={`/dashboard/users/${u._id}`}
                            title="View user & downline team details"
                            className="p-1.5 text-slate-600 hover:text-brand-950 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {canManage ? (
                            <>
                              {/* Edit Member & Team */}
                              <button
                                onClick={() => setEditUser(u)}
                                title="Edit user & team"
                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Activate / Deactivate Toggle */}
                              <button
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: u._id,
                                    status: u.status === 'active' ? 'inactive' : 'active',
                                  })
                                }
                                title={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                                className={`p-1.5 rounded-lg border transition ${
                                  u.status === 'active'
                                    ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                    : 'text-slate-400 hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewPassword('');
                                  setPasswordModalOpen(true);
                                }}
                                title="Reset Password"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Soft Delete */}
                              <button
                                onClick={() => {
                                  if (confirm(`Soft-delete ${u.name}? They will be marked deleted and removed from the active tree.`)) {
                                    softDeleteMutation.mutate(u._id);
                                  }
                                }}
                                title="Soft Delete"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Self / Superior</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalUsersCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Add Downline Team Member</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@mahalaxmi.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9826012345"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Designation / Role (Subordinate roles only)
                </label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {allowedRoles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} (Seller ₹{r.sellerRate} • Override ₹{r.overrideRate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reports To (Manager)</label>
                <select
                  value={formData.reportsTo}
                  onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={user?._id}>Directly to You ({user?.name})</option>
                  {users
                    .filter((u) => u._id !== user?._id)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.roleId?.name})
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Enables mixed teams: you can assign direct reports straight to yourself or to subordinate managers.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-brand-950 text-sm mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-3">Set new login password for {selectedUser.name}</p>

            <input
              type="password"
              placeholder="Enter new password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                onClick={() => resetPasswordMutation.mutate({ id: selectedUser._id, password: newPassword })}
                className="px-4 py-1.5 bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}


      {/* User & Team Edit Modal */}
      <UserEditModal
        userToEdit={editUser}
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
      />
    </div>
  );
}
