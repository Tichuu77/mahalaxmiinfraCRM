'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Pagination, { usePagination } from '@/components/Pagination';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  MapPin,
  Layers,
  Sparkles,
  X,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [modalError, setModalError] = useState('');

  // Create Project Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    location: '',
    totalAreaSqFt: 50000,
    status: 'active',
    description: '',
  });

  // Fetch Projects List
  const {
    data: projectsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch('/projects'),
  });

  const rawProjects = projectsData?.projects || [];

  // Filter Projects Client-side for Instant Feedback
  const filteredProjects = useMemo(() => {
    return rawProjects.filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(query);
        const matchesCode = p.code?.toLowerCase().includes(query);
        const matchesLocation = p.location?.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesLocation;
      }
      return true;
    });
  }, [rawProjects, statusFilter, searchTerm]);

  // Pagination hook (default 10 per page)
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedProjects,
    totalItems,
  } = usePagination(filteredProjects, 10);

  // Overall Inventory Stats
  const inventoryStats = useMemo(() => {
    let totalProjects = rawProjects.length;
    let totalPlots = 0;
    let availablePlots = 0;
    let bookedPlots = 0;
    let registeredPlots = 0;

    rawProjects.forEach((p) => {
      totalPlots += p.stats?.totalPlots || 0;
      availablePlots += p.stats?.availablePlots || 0;
      bookedPlots += p.stats?.bookedPlots || 0;
      registeredPlots += p.stats?.registeredPlots || 0;
    });

    return { totalProjects, totalPlots, availablePlots, bookedPlots, registeredPlots };
  }, [rawProjects]);

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: (data) =>
      apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        code: '',
        location: '',
        totalAreaSqFt: 50000,
        status: 'active',
        description: '',
      });
      setModalError('');
    },
    onError: (err) => {
      setModalError(err.message || 'Failed to create project');
    },
  });

  // Soft Delete Project Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) =>
      apiFetch(`/projects?id=${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    },
    onError: (err) => {
      alert(`Error deleting project: ${err.message}`);
    },
  });

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (projectToDelete?._id) {
      deleteProjectMutation.mutate(projectToDelete._id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Township Inventory
            </span>
            <span className="text-xs text-slate-400 font-medium">• Section 5.1 Shared Group Inventory</span>
          </div>
          <h1 className="text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-amber-500" /> Township Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Browse and manage all real estate projects and layouts across the company. Group-wide inventory is accessible to all advisors.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalError('');
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
            <Link
              href="/dashboard/projects/create"
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition shadow-2xs"
            >
              Full Form
            </Link>
          </div>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-brand-950 mt-1.5">{inventoryStats.totalProjects}</p>
          <span className="text-[10px] text-slate-500 font-medium">Active townships</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Plots</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{inventoryStats.totalPlots}</p>
          <span className="text-[10px] text-slate-500 font-medium">Across all projects</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Plots</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1.5">{inventoryStats.availablePlots}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Ready for booking</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Booked Plots</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1.5">{inventoryStats.bookedPlots}</p>
          <span className="text-[10px] text-amber-600 font-medium">Pending registry</span>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered</span>
            <Briefcase className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-1.5">{inventoryStats.registeredPlots}</p>
          <span className="text-[10px] text-blue-600 font-medium">Fully finalized</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search project by name, code or location..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-brand-950 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => refetch()}
            title="Refresh list"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition border border-slate-200 ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Projects Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600 text-sm">No projects found</p>
            <p className="text-slate-400 mt-1">Try changing your search term or status filter</p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
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
                  <th className="py-3 px-4">Project & Code</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Total Area</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Plots Overview</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedProjects.map((project) => {
                  const statusColors = {
                    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    upcoming: 'bg-amber-50 text-amber-700 border-amber-200',
                    completed: 'bg-blue-50 text-blue-700 border-blue-200',
                  };

                  const totalPlots = project.stats?.totalPlots || 0;
                  const availablePlots = project.stats?.availablePlots || 0;
                  const bookedPlots = project.stats?.bookedPlots || 0;
                  const registeredPlots = project.stats?.registeredPlots || 0;

                  return (
                    <tr
                      key={project._id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => router.push(`/dashboard/projects/${project._id}`)}
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-900 flex items-center justify-center font-black text-xs border border-brand-100 shrink-0">
                            <Building2 className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-brand-950 text-sm group-hover:text-amber-600 transition">
                                {project.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border border-slate-200">
                                {project.code}
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{project.location}</span>
                        </div>
                      </td>

                      {/* Total Area */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {(project.totalAreaSqFt || 0).toLocaleString('en-IN')}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">sq. ft.</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border capitalize ${
                            statusColors[project.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {project.status || 'active'}
                        </span>
                      </td>

                      {/* Plots Overview */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold" title="Total plots">
                            {totalPlots} total
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100" title="Available plots">
                            {availablePlots} avail
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100" title="Booked plots">
                            {bookedPlots} booked
                          </span>
                        </div>
                      </td>

                      {/* Actions: View, Edit, Delete */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1) View */}
                          <Link
                            href={`/dashboard/projects/${project._id}`}
                            title="View Project Details & Plots"
                            className="p-1.5 text-slate-600 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* 2) Edit */}
                          {isAdmin && (
                            <Link
                              href={`/dashboard/projects/${project._id}/edit`}
                              title="Edit Project"
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition border border-transparent hover:border-amber-200"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                          )}

                          {/* 3) Delete */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(project)}
                              title="Delete Project (Soft Delete)"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Soft Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteProjectMutation.isPending) {
            setDeleteModalOpen(false);
            setProjectToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Township Project"
        itemName={projectToDelete ? `${projectToDelete.name} (${projectToDelete.code})` : ''}
        itemType="project"
        message="Are you sure you want to delete this project? This will soft-delete the project and all its associated plots. They will be removed from active inventory but kept securely for historical audit logs."
        isLoading={deleteProjectMutation.isPending}
        confirmButtonText="Delete Project"
      />

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-950 text-base">Create Township Project</h3>
                  <p className="text-[11px] text-slate-400">Add a new project to group inventory</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
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
                createProjectMutation.mutate(createForm);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Mahalaxmi Nagar 40"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    placeholder="MN-40"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Area (sq. ft.)</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.totalAreaSqFt}
                    onChange={(e) => setCreateForm({ ...createForm, totalAreaSqFt: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder="e.g. Super Corridor, Indore"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Township specifications, approvals, landmarks..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createProjectMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
