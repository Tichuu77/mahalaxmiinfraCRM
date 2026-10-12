'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Grid,
  ArrowLeft,
  Save,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import FormSkeleton from '@/components/FormSkeleton';

export default function PlotEditPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const plotId = params?.plotId;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [formData, setFormData] = useState({
    plotNumber: '',
    sizeSqFt: 1500,
    ratePerSqFt: 2500,
    dimension: '30x50',
    facing: 'East',
    status: 'available',
  });
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch Plot Data
  const {
    data: plotData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['plot', plotId],
    queryFn: () => apiFetch(`/plots/${plotId}`),
    enabled: !!plotId,
  });

  const plot = plotData?.plot;
  const project = plot?.projectId;

  useEffect(() => {
    if (plot) {
      setFormData({
        plotNumber: plot.plotNumber || '',
        sizeSqFt: plot.sizeSqFt || 1500,
        ratePerSqFt: plot.ratePerSqFt || 2500,
        dimension: plot.dimension || '',
        facing: plot.facing || 'East',
        status: plot.status || 'available',
      });
    }
  }, [plot]);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data) =>
      apiFetch(`/plots/${plotId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plot', plotId] });
      queryClient.invalidateQueries({ queryKey: ['plots', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/projects/${projectId}/plots/${plotId}`);
      }, 700);
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to update plot');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    updateMutation.mutate(formData);
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">Only Administrators can edit plot specifications.</p>
        <Link
          href={`/dashboard/projects/${projectId}/plots/${plotId}`}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plot Details
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <FormSkeleton title="Loading plot specifications..." fields={6} />;
  }

  if (error || !plot) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Plot Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This plot does not exist or has been deleted.</p>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Link>
      </div>
    );
  }

  const computedTotal = (Number(formData.sizeSqFt) || 0) * (Number(formData.ratePerSqFt) || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}/plots/${plotId}`}
            className="p-2 text-slate-500 hover:text-brand-950 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Cancel & Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Link href="/dashboard/projects" className="hover:text-brand-950">Projects</Link>
              <span>/</span>
              <Link href={`/dashboard/projects/${projectId}`} className="hover:text-brand-950 font-medium">
                {project?.name}
              </Link>
              <span>/</span>
              <Link href={`/dashboard/projects/${projectId}/plots/${plotId}`} className="hover:text-brand-950 font-medium">
                {plot.plotNumber}
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-bold">Edit</span>
            </div>
            <h1 className="text-xl font-black text-brand-950 tracking-tight flex items-center gap-2 mt-0.5">
              <Grid className="w-5 h-5 text-amber-500" /> Edit Plot {plot.plotNumber}
            </h1>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Plot updated successfully! Redirecting...</span>
        </div>
      )}

      {/* Error Notification */}
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Plot Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.plotNumber}
              onChange={(e) => setFormData({ ...formData, plotNumber: e.target.value })}
              placeholder="e.g. Plot-101"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Facing
            </label>
            <select
              value={formData.facing}
              onChange={(e) => setFormData({ ...formData, facing: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West', 'Other'].map(
                (f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Size (SQ. FT.) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.sizeSqFt}
              onChange={(e) => setFormData({ ...formData, sizeSqFt: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Rate (₹/sq.ft.) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.ratePerSqFt}
              onChange={(e) => setFormData({ ...formData, ratePerSqFt: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Dimension
            </label>
            <input
              type="text"
              value={formData.dimension}
              onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
              placeholder="e.g. 30x50"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl capitalize focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="booked">Booked</option>
              <option value="registered">Registered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Real-time Computed Price */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-900">Computed Total Plot Price:</span>
          <span className="text-base font-black text-brand-950">
            ₹{computedTotal.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href={`/dashboard/projects/${projectId}/plots/${plotId}`}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
