'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Sliders, Plus, Edit2, ShieldAlert, Sparkles, Check, X } from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rank: 4,
    sellerRate: 100,
    overrideRate: 20,
    isRoot: false,
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingRole) {
        return apiFetch('/roles', { method: 'PUT', body: JSON.stringify({ _id: editingRole._id, ...data }) });
      }
      return apiFetch('/roles', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setModalOpen(false);
      setEditingRole(null);
      setFormData({ name: '', rank: 4, sellerRate: 100, overrideRate: 20, isRoot: false });
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to save role');
    },
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', rank: 4, sellerRate: 100, overrideRate: 20, isRoot: false });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      rank: role.rank,
      sellerRate: role.sellerRate || 0,
      overrideRate: role.overrideRate || 0,
      isRoot: role.isRoot || false,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    saveMutation.mutate(formData);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600" />
        <span>Forbidden: Only System Administrators can configure dynamic roles and incentive rates.</span>
      </div>
    );
  }

  const roles = data?.roles || [];

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedRoles,
    totalItems: totalRolesCount,
  } = usePagination(roles, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 uppercase tracking-wide">
              Data-Driven Roles & Rates
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-purple-600" /> Dynamic Role & Rate Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Roles are data, not code. Admin can create, rename, or insert any new tier/rank at any time with custom ₹/sq.ft. rates.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Dynamic Role
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Generalized Rate Model (Section 3.3):</span>
          <span>
            Rates are configured per Role rather than per fixed level number. Both direct seller cut and downline override cut are set in ₹ per SQ. FT. When a sale occurs, the engine automatically resolves these rates dynamically.
          </span>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Authority Level</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4 text-right">Seller Rate (₹/sq.ft.)</th>
                  <th className="py-3 px-4 text-right">Override Rate (₹/sq.ft.)</th>
                  <th className="py-3 px-4 text-center">Root Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRoles.map((role) => (
                  <tr key={role._id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-brand-950">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300">
                        Level {role.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-brand-950 text-sm">{role.name}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700 text-sm">
                      ₹{role.sellerRate}/sq.ft.
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-700 text-sm">
                      ₹{role.overrideRate}/sq.ft.
                    </td>
                    <td className="py-3 px-4 text-center">
                      {role.isRoot ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">
                          Root Admin
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalRolesCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">
                {editingRole ? 'Edit Role & Rates' : 'Create Dynamic Role'}
              </h3>
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Role Name (e.g. Regional Head)
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Senior Sales Manager"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Hierarchy Level (Lower number = Higher authority)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Admin = 0, Director = 1, Sales Manager = 2, Sales Executive = 3. You can insert 1.5, 4, etc.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Seller Rate (₹/sq.ft.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.sellerRate}
                    onChange={(e) => setFormData({ ...formData, sellerRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Override Rate (₹/sq.ft.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.overrideRate}
                    onChange={(e) => setFormData({ ...formData, overrideRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isRoot"
                  checked={formData.isRoot}
                  onChange={(e) => setFormData({ ...formData, isRoot: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300"
                />
                <label htmlFor="isRoot" className="text-xs text-slate-700 font-medium">
                  Is Root Role (Top of entire organizational hierarchy)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Dynamic Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
