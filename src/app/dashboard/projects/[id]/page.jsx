'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Pagination, { usePagination } from '@/components/Pagination';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ProjectDetailSkeleton from '@/components/ProjectDetailSkeleton';
import TableSkeleton from '@/components/TableSkeleton';
import {
  Building2,
  MapPin,
  Calendar,
  Grid,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  X,
  Compass,
  Maximize2,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  // Filter States for Plots
  const [plotSearch, setPlotSearch] = useState('');
  const [plotStatusFilter, setPlotStatusFilter] = useState('all');
  const [plotFacingFilter, setPlotFacingFilter] = useState('all');

  // Modals
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [deletePlotModalOpen, setDeletePlotModalOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState(null);
  const [addPlotModalOpen, setAddPlotModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  // Add Plot Form State
  const [plotForm, setPlotForm] = useState({
    plotNumber: '',
    sizeSqFt: 1500,
    ratePerSqFt: 2500,
    dimension: '30x50',
    facing: 'East',
    status: 'available',
  });

  // Fetch Project Details
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch(`/projects?id=${projectId}`),
    enabled: !!projectId,
  });

  // Fetch Plots for this Project
  const {
    data: plotsData,
    isLoading: plotsLoading,
    isRefetching: plotsRefetching,
    refetch: refetchPlots,
  } = useQuery({
    queryKey: ['plots', projectId],
    queryFn: () => apiFetch(`/plots?projectId=${projectId}`),
    enabled: !!projectId,
  });

  const project = projectData?.project;
  const rawPlots = plotsData?.plots || [];

  // Filter Plots Client-side
  const filteredPlots = useMemo(() => {
    return rawPlots.filter((plot) => {
      if (plotStatusFilter !== 'all' && plot.status !== plotStatusFilter) {
        return false;
      }
      if (plotFacingFilter !== 'all' && plot.facing !== plotFacingFilter) {
        return false;
      }
      if (plotSearch.trim()) {
        const query = plotSearch.toLowerCase().trim();
        const matchesNumber = plot.plotNumber?.toLowerCase().includes(query);
        const matchesDimension = plot.dimension?.toLowerCase().includes(query);
        return matchesNumber || matchesDimension;
      }
      return true;
    });
  }, [rawPlots, plotStatusFilter, plotFacingFilter, plotSearch]);

  // Plots Pagination
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedPlots,
    totalItems,
  } = usePagination(filteredPlots, 10);

  // Soft Delete Project Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/projects?id=${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteProjectModalOpen(false);
      router.push('/dashboard/projects');
    },
    onError: (err) => {
      alert(`Error deleting project: ${err.message}`);
    },
  });

  // Soft Delete Plot Mutation
  const deletePlotMutation = useMutation({
    mutationFn: (plotId) =>
      apiFetch(`/plots?id=${plotId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plots', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletePlotModalOpen(false);
      setPlotToDelete(null);
    },
    onError: (err) => {
      alert(`Error deleting plot: ${err.message}`);
    },
  });

  // Add Plot Mutation
  const createPlotMutation = useMutation({
    mutationFn: (data) =>
      apiFetch('/plots', {
        method: 'POST',
        body: JSON.stringify({ ...data, projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plots', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAddPlotModalOpen(false);
      setPlotForm({
        plotNumber: '',
        sizeSqFt: 1500,
        ratePerSqFt: 2500,
        dimension: '30x50',
        facing: 'East',
        status: 'available',
      });
      setModalError('');
    },
    onError: (err) => {
      setModalError(err.message || 'Failed to add plot');
    },
  });

  const handleDeletePlotClick = (plot) => {
    setPlotToDelete(plot);
    setDeletePlotModalOpen(true);
  };

  const handleConfirmDeletePlot = () => {
    if (plotToDelete?._id) {
      deletePlotMutation.mutate(plotToDelete._id);
    }
  };

  if (projectLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectError || !project) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Project Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This project does not exist or has been deleted.</p>
        <Link
          href="/dashboard/projects"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    upcoming: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="p-2 text-slate-500 hover:text-brand-950 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Projects /</span>
              <span className="text-xs font-bold text-slate-600">{project.code}</span>
            </div>
            <h1 className="text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
              {project.name}
            </h1>
          </div>
        </div>

        {/* Project Action Buttons: Edit, Delete, Add Plot */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {/* Edit Project Button */}
              <Link
                href={`/dashboard/projects/${projectId}/edit`}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs hover:shadow transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Edit Project
              </Link>

              {/* Delete Project Button (Soft Delete) */}
              <button
                type="button"
                onClick={() => setDeleteProjectModalOpen(true)}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete Project
              </button>

              {/* Add Plot Button */}
              <button
                type="button"
                onClick={() => {
                  setModalError('');
                  setAddPlotModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-brand-950 font-bold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Plot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-brand-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                {project.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border capitalize ${
                  statusColors[project.status] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {project.status || 'active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">{project.location}</span>
            </p>
            {project.description && (
              <p className="text-xs text-slate-600 pt-1 leading-relaxed max-w-3xl">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap md:flex-col gap-3 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Township Area</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {(project.totalAreaSqFt || 0).toLocaleString('en-IN')} sq. ft.
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Created Date</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-IN') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Plots KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Plots</span>
            <span className="text-xl font-black text-slate-900">{project.stats?.totalPlots || rawPlots.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Available</span>
            <span className="text-xl font-black text-emerald-700">{project.stats?.availablePlots || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">Booked</span>
            <span className="text-xl font-black text-amber-700">{project.stats?.bookedPlots || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-600 block">Registered</span>
            <span className="text-xl font-black text-blue-700">{project.stats?.registeredPlots || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-purple-600 block">Reserved</span>
            <span className="text-xl font-black text-purple-700">{project.stats?.reservedPlots || 0}</span>
          </div>
        </div>
      </div>

      {/* Plots Inventory Section */}
      <div className="space-y-4">
        {/* Section Header & Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-brand-950 flex items-center gap-2">
              <Grid className="w-5 h-5 text-amber-500" /> Plots in {project.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredPlots.length} of {rawPlots.length} plots in this layout
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Plot */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={plotSearch}
                onChange={(e) => {
                  setPlotSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search plot # or size..."
                className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-44"
              />
              {plotSearch && (
                <button
                  onClick={() => {
                    setPlotSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Facing Filter */}
            <select
              value={plotFacingFilter}
              onChange={(e) => {
                setPlotFacingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Facings</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="North-East">North-East</option>
              <option value="North-West">North-West</option>
              <option value="South-East">South-East</option>
              <option value="South-West">South-West</option>
            </select>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'available', label: 'Available' },
                { id: 'booked', label: 'Booked' },
                { id: 'registered', label: 'Registered' },
                { id: 'reserved', label: 'Reserved' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPlotStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    plotStatusFilter === tab.id
                      ? 'bg-brand-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                onClick={() => refetchPlots()}
                title="Refresh plots"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition border border-slate-200 ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${plotsRefetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Plots Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {plotsLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : filteredPlots.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Grid className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 text-sm">No plots found</p>
              <p className="text-slate-400 mt-1">Try resetting the plot search or status filters</p>
              {(plotSearch || plotStatusFilter !== 'all' || plotFacingFilter !== 'all') && (
                <button
                  onClick={() => {
                    setPlotSearch('');
                    setPlotStatusFilter('all');
                    setPlotFacingFilter('all');
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Plot #</th>
                    <th className="py-3 px-4">Size (Sq. Ft.)</th>
                    <th className="py-3 px-4">Rate (₹/sq.ft.)</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4">Facing & Dimension</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedPlots.map((plot) => {
                    const plotStatusColors = {
                      available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      booked: 'bg-amber-50 text-amber-700 border-amber-200',
                      registered: 'bg-blue-50 text-blue-700 border-blue-200',
                      reserved: 'bg-purple-50 text-purple-700 border-purple-200',
                      cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
                    };

                    return (
                      <tr
                        key={plot._id}
                        className="hover:bg-slate-50/60 transition group cursor-pointer"
                        onClick={() => router.push(`/dashboard/projects/${projectId}/plots/${plot._id}`)}
                      >
                        {/* Plot Number */}
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-brand-950 group-hover:text-amber-600 transition text-sm">
                            {plot.plotNumber}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {plot.sizeSqFt?.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">sq.ft.</span>
                        </td>

                        {/* Rate */}
                        <td className="py-3 px-4 text-slate-600">
                          ₹{plot.ratePerSqFt?.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400">/sq.ft.</span>
                        </td>

                        {/* Total Price */}
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-brand-950">
                            ₹{(plot.totalPrice || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Facing & Dimension */}
                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{plot.facing || 'East'}</span>
                            {plot.dimension && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                {plot.dimension}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border capitalize ${
                              plotStatusColors[plot.status] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {plot.status}
                          </span>
                        </td>

                        {/* Actions: View, Edit, Delete, Book */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Plot */}
                            <Link
                              href={`/dashboard/projects/${projectId}/plots/${plot._id}`}
                              title="View Plot Details"
                              className="p-1.5 text-slate-600 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Edit Plot */}
                            {isAdmin && (
                              <Link
                                href={`/dashboard/projects/${projectId}/plots/${plot._id}/edit`}
                                title="Edit Plot"
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition border border-transparent hover:border-amber-200"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                            )}

                            {/* Delete Plot (Soft Delete) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeletePlotClick(plot)}
                                title="Delete Plot (Soft Delete)"
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Quick Book Button if available */}
                            {plot.status === 'available' && (
                              <Link
                                href={`/dashboard/bookings?projectId=${projectId}&plotId=${plot._id}`}
                                title="Book this plot"
                                className="ml-1 px-2.5 py-1 bg-brand-700 hover:bg-brand-800 text-white font-bold text-[10px] rounded-lg transition shadow-2xs flex items-center gap-0.5"
                              >
                                Book <ArrowRight className="w-3 h-3" />
                              </Link>
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

          {/* Plots Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Delete Plot Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deletePlotModalOpen}
        onClose={() => {
          if (!deletePlotMutation.isPending) {
            setDeletePlotModalOpen(false);
            setPlotToDelete(null);
          }
        }}
        onConfirm={handleConfirmDeletePlot}
        title="Delete Plot"
        itemName={plotToDelete ? `${plotToDelete.plotNumber} in ${project.name}` : ''}
        itemType="plot"
        message="Are you sure you want to delete this plot? It will be soft-deleted and removed from active township inventory."
        isLoading={deletePlotMutation.isPending}
        confirmButtonText="Delete Plot"
      />

      {/* Delete Project Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteProjectModalOpen}
        onClose={() => {
          if (!deleteProjectMutation.isPending) {
            setDeleteProjectModalOpen(false);
          }
        }}
        onConfirm={() => deleteProjectMutation.mutate()}
        title="Delete Township Project"
        itemName={`${project.name} (${project.code})`}
        itemType="project"
        message="Are you sure you want to delete this project? All associated plots will also be soft-deleted and removed from active listings."
        isLoading={deleteProjectMutation.isPending}
        confirmButtonText="Delete Project"
      />

      {/* Add Plot Modal */}
      {addPlotModalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-950 text-base">Add Plot to {project.name}</h3>
                <p className="text-[11px] text-slate-400">Specify plot dimensions and pricing</p>
              </div>
              <button
                onClick={() => setAddPlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalError('');
                createPlotMutation.mutate(plotForm);
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Plot Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={plotForm.plotNumber}
                    onChange={(e) => setPlotForm({ ...plotForm, plotNumber: e.target.value })}
                    placeholder="e.g. Plot-109"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Facing</label>
                  <select
                    value={plotForm.facing}
                    onChange={(e) => setPlotForm({ ...plotForm, facing: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Size (SQ. FT.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={plotForm.sizeSqFt}
                    onChange={(e) => setPlotForm({ ...plotForm, sizeSqFt: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Rate (₹/sq.ft.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={plotForm.ratePerSqFt}
                    onChange={(e) => setPlotForm({ ...plotForm, ratePerSqFt: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dimension</label>
                  <input
                    type="text"
                    value={plotForm.dimension}
                    onChange={(e) => setPlotForm({ ...plotForm, dimension: e.target.value })}
                    placeholder="e.g. 30x50"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Status</label>
                  <select
                    value={plotForm.status}
                    onChange={(e) => setPlotForm({ ...plotForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>

              {/* Total Price preview */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900">Total Plot Value:</span>
                <span className="text-sm font-extrabold text-brand-950">
                  ₹{(plotForm.sizeSqFt * plotForm.ratePerSqFt).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddPlotModalOpen(false)}
                  disabled={createPlotMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlotMutation.isPending}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-brand-950 text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {createPlotMutation.isPending ? 'Adding Plot...' : 'Add Plot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
