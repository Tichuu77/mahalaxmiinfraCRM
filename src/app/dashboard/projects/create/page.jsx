'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Building2,
  ArrowLeft,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    totalAreaSqFt: 50000,
    status: 'active',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: (data) =>
      apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSaveSuccess(true);
      const newProjectId = res?.project?._id;
      setTimeout(() => {
        if (newProjectId) {
          router.push(`/dashboard/projects/${newProjectId}`);
        } else {
          router.push('/dashboard/projects');
        }
      }, 700);
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate(formData);
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">Only Administrators can create projects.</p>
        <Link
          href="/dashboard/projects"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="p-2 text-slate-500 hover:text-brand-950 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Cancel & Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Link href="/dashboard/projects" className="hover:text-brand-950">Projects</Link>
              <span>/</span>
              <span className="text-slate-600 font-bold">New Project</span>
            </div>
            <h1 className="text-xl font-black text-brand-950 tracking-tight flex items-center gap-2 mt-0.5">
              <Building2 className="w-5 h-5 text-amber-500" /> Create Township Project
            </h1>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Project created successfully! Redirecting...</span>
        </div>
      )}

      {/* Error Notification */}
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mahalaxmi Nagar 40"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Project Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. MN-40"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Super Corridor, Indore"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Total Area (SQ. FT.)
            </label>
            <input
              type="number"
              min="0"
              value={formData.totalAreaSqFt}
              onChange={(e) => setFormData({ ...formData, totalAreaSqFt: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
            Initial Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full sm:w-1/2 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="active">Active (Selling)</option>
            <option value="upcoming">Upcoming (Pre-launch)</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
            Description & Specifications
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed township description, RERA approval number, nearby landmarks, amenities..."
            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
          />
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/projects"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Creating Project...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
