'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { 
  X, User, Mail, Phone, Shield, Network, 
  Check, AlertCircle, Key, Lock, Sparkles, UserCheck 
} from 'lucide-react';

export default function UserEditModal({
  userToEdit,
  isOpen,
  onClose,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.roleId?.isRoot || currentUser?.roleId?.rank === 0;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roleId: '',
    reportsTo: '',
    status: 'active',
    password: '',
  });
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all users to populate the manager (reportsTo) list
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch('/users'),
    enabled: isOpen,
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
    enabled: isOpen,
  });

  const allUsers = usersData?.users || [];
  const roles = rolesData?.roles || [];

  // Initialize form state when userToEdit changes
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        phone: userToEdit.phone || '',
        roleId: userToEdit.roleId?._id || userToEdit.roleId || '',
        reportsTo: userToEdit.reportsTo?._id || userToEdit.reportsTo || '',
        status: userToEdit.status || 'active',
        password: '',
      });
      setShowPasswordInput(false);
      setErrorMessage('');
    }
  }, [userToEdit, isOpen]);

  // Compute all subordinate IDs recursively in the loaded user list to prevent circular loops
  const targetSubordinateIds = useMemo(() => {
    if (!userToEdit || !allUsers.length) return new Set();

    const subordinates = new Set();
    const findSubordinates = (parentId) => {
      allUsers.forEach((u) => {
        const mgrId = u.reportsTo?._id || u.reportsTo;
        if (mgrId && mgrId.toString() === parentId.toString() && !subordinates.has(u._id)) {
          subordinates.add(u._id.toString());
          findSubordinates(u._id);
        }
      });
    };

    findSubordinates(userToEdit._id);
    return subordinates;
  }, [userToEdit, allUsers]);

  // Filter allowed roles based on current user's rank
  const allowedRoles = useMemo(() => {
    return roles.filter((r) => {
      if (isAdmin) return true;
      // If userToEdit currently has this role, let them keep it
      if (userToEdit?.roleId?._id === r._id || userToEdit?.roleId === r._id) return true;
      // Can only assign roles with rank strictly greater than current user's rank
      return r.rank > (currentUser?.roleId?.rank ?? 999);
    });
  }, [roles, isAdmin, currentUser, userToEdit]);

  // Filter eligible managers:
  // - Cannot be self
  // - Cannot be inside target user's downline (prevents cycles)
  const eligibleManagers = useMemo(() => {
    if (!userToEdit) return [];
    return allUsers.filter((u) => {
      // Cannot be self
      if (u._id === userToEdit._id) return false;
      // Cannot be a subordinate
      if (targetSubordinateIds.has(u._id.toString())) return false;
      return true;
    });
  }, [allUsers, userToEdit, targetSubordinateIds]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => apiFetch('/users', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] });
      if (onSuccess) onSuccess(res.user);
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.message || 'Failed to update user');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const payload = {
      _id: userToEdit._id,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      roleId: formData.roleId,
      reportsTo: formData.reportsTo || null,
      status: formData.status,
    };

    if (showPasswordInput && formData.password.trim()) {
      if (formData.password.trim().length < 6) {
        setErrorMessage('Password must be at least 6 characters');
        return;
      }
      payload.password = formData.password.trim();
    }

    updateUserMutation.mutate(payload);
  };

  if (!isOpen || !userToEdit) return null;

  const isTargetRoot = userToEdit.roleId?.isRoot || userToEdit.roleId?.rank === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-950">Edit Member &amp; Team</h3>
              <p className="text-xs text-slate-500">Update personal information, role, or reassign reporting line</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="rahul@mahalaxmi.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="9826012345"
                />
              </div>
            </div>
          </div>

          {/* Role / Designation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Designation / Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              >
                {allowedRoles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} (Seller ₹{r.sellerRate} • Override ₹{r.overrideRate})
                  </option>
                ))}
              </select>
            </div>
            {!isAdmin && (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Role rule: You can only assign roles subordinate to your own role in the hierarchy.
              </span>
            )}
          </div>

          {/* Team / Reports To (Manager) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Team / Direct Manager (Reports To)
            </label>
            <div className="relative">
              <Network className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={formData.reportsTo}
                onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              >
                {(isAdmin || isTargetRoot) && (
                  <option value="">None (Top Authority / Root Admin)</option>
                )}
                {eligibleManagers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.roleId?.name || 'User'})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Changing the manager reassigns this member and their downline subtree to a new team in the hierarchy.
            </span>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'active' })}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  formData.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'inactive' })}
                className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                  formData.status === 'inactive'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Inactive
              </button>
            </div>
          </div>

          {/* Optional Password Update */}
          <div className="pt-2 border-t border-slate-100">
            {!showPasswordInput ? (
              <button
                type="button"
                onClick={() => setShowPasswordInput(true)}
                className="text-xs font-semibold text-slate-600 hover:text-amber-600 flex items-center gap-1.5 transition"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                Change Password for this user
              </button>
            ) : (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setFormData({ ...formData, password: '' });
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Cancel password change
                  </button>
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateUserMutation.isPending}
              className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {updateUserMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
