'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import PlotDetailSkeleton from '@/components/PlotDetailSkeleton';
import {
  Grid,
  Building2,
  MapPin,
  Calendar,
  Compass,
  Maximize2,
  DollarSign,
  ArrowLeft,
  Edit3,
  Trash2,
  ArrowRight,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function PlotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const plotId = params?.plotId;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Fetch Plot Details (and any active booking)
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
  const booking = plotData?.booking;

  // Soft Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/plots/${plotId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plots', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteModalOpen(false);
      router.push(`/dashboard/projects/${projectId}`);
    },
    onError: (err) => {
      alert(`Error deleting plot: ${err.message}`);
    },
  });

  if (isLoading) {
    return <PlotDetailSkeleton />;
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

  const statusColors = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    booked: 'bg-amber-50 text-amber-700 border-amber-200',
    registered: 'bg-blue-50 text-blue-700 border-blue-200',
    reserved: 'bg-purple-50 text-purple-700 border-purple-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 text-slate-500 hover:text-brand-950 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Back to Project"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Link href="/dashboard/projects" className="hover:text-brand-950">Projects</Link>
              <span>/</span>
              <Link href={`/dashboard/projects/${projectId}`} className="hover:text-brand-950 font-medium">
                {project?.name || 'Project'}
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-bold">{plot.plotNumber}</span>
            </div>
            <h1 className="text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2 mt-0.5">
              <Grid className="w-6 h-6 text-amber-500" /> Plot {plot.plotNumber}
            </h1>
          </div>
        </div>

        {/* Actions: Edit, Delete, Book */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {/* Edit Plot */}
              <Link
                href={`/dashboard/projects/${projectId}/plots/${plotId}/edit`}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs hover:shadow transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Edit Plot
              </Link>

              {/* Delete Plot (Soft Delete) */}
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete Plot
              </button>
            </>
          )}

          {plot.status === 'available' && (
            <Link
              href={`/dashboard/bookings?projectId=${projectId}&plotId=${plotId}`}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5"
            >
              Book Plot <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Plot Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        {/* Header Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-brand-950">{plot.plotNumber}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border capitalize ${
                  statusColors[plot.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {plot.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Project: </span>
              <Link
                href={`/dashboard/projects/${projectId}`}
                className="font-bold text-brand-900 hover:text-amber-600 transition underline underline-offset-2"
              >
                {project?.name} ({project?.code})
              </Link>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Plot Value</span>
            <span className="text-2xl font-black text-brand-950">
              ₹{(plot.totalPrice || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Plot Size</span>
            </div>
            <span className="text-base font-extrabold text-slate-900">
              {plot.sizeSqFt?.toLocaleString('en-IN')}
            </span>{' '}
            <span className="text-xs text-slate-500 font-medium">sq. ft.</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Rate</span>
            </div>
            <span className="text-base font-extrabold text-slate-900">
              ₹{plot.ratePerSqFt?.toLocaleString('en-IN')}
            </span>{' '}
            <span className="text-xs text-slate-500 font-medium">/sq.ft.</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Facing</span>
            </div>
            <span className="text-base font-extrabold text-slate-900">{plot.facing || 'East'}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dimensions</span>
            </div>
            <span className="text-base font-extrabold text-slate-900">
              {plot.dimension || 'Not specified'}
            </span>
          </div>
        </div>

        {/* Location & Meta Info */}
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-amber-800 font-bold uppercase block mb-0.5">Township Location</span>
            <p className="text-slate-700 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {project?.location || 'Indore'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-amber-800 font-bold uppercase block mb-0.5">Inventory Record</span>
            <p className="text-slate-700 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Added on {plot.createdAt ? new Date(plot.createdAt).toLocaleDateString('en-IN') : 'N/A'}
              {plot.createdBy?.name && ` by ${plot.createdBy.name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Active Booking Card (if booked or registered) */}
      {booking && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-brand-950 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Active Booking Details
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Booking Number</span>
              <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{booking.bookingNumber}</span>
              <span className="text-[11px] text-slate-400">
                Booked on {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('en-IN') : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{booking.customerId?.name || 'N/A'}</span>
              {booking.customerId?.phone && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {booking.customerId.phone}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Seller / Advisor</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{booking.sellerId?.name || 'N/A'}</span>
              {booking.sellerId?.email && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" /> {booking.sellerId.email}
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              Booking Amount Collected: <strong className="text-slate-900">₹{(booking.bookingAmount || 0).toLocaleString('en-IN')}</strong> ({booking.paymentMode || 'Cheque'})
            </div>
            <Link
              href={`/dashboard/bookings?bookingId=${booking._id}`}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
            >
              View Full Booking <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Delete Plot Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Plot"
        itemName={`${plot.plotNumber} (${project?.name || ''})`}
        itemType="plot"
        message="Are you sure you want to delete this plot? It will be soft-deleted and removed from active township inventory."
        isLoading={deleteMutation.isPending}
        confirmButtonText="Delete Plot"
      />
    </div>
  );
}
