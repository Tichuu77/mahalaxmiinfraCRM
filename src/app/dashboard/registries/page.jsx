'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { FileCheck, Plus, CheckCircle, Clock, AlertTriangle, X, Check, Search } from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function RegistriesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    bookingId: '',
    registryNumber: '',
    registryDate: new Date().toISOString().split('T')[0],
    registryOffice: 'Indore Registrar Office',
    stampDutyAmount: 150000,
    remarks: '',
  });

  const { data: registriesData, isLoading: registriesLoading } = useQuery({
    queryKey: ['registries'],
    queryFn: () => apiFetch('/registries'),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiFetch('/bookings'),
  });

  const createRegistryMutation = useMutation({
    mutationFn: (data) => apiFetch('/registries', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registries'] });
      setModalOpen(false);
      setFormData({
        bookingId: '',
        registryNumber: '',
        registryDate: new Date().toISOString().split('T')[0],
        registryOffice: 'Indore Registrar Office',
        stampDutyAmount: 150000,
        remarks: '',
      });
    },
    onError: (err) => setFormError(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiFetch('/registries', { method: 'PUT', body: JSON.stringify({ _id: id, status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registries'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const registries = registriesData?.registries || [];
  const bookings = bookingsData?.bookings || [];
  const activeBookings = bookings.filter((b) => b.status === 'active');

  const filteredRegistries = registries.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.registryNumber?.toLowerCase().includes(term) ||
      r.plotId?.plotNumber?.toLowerCase().includes(term) ||
      r.bookingId?.projectId?.name?.toLowerCase().includes(term) ||
      r.customerId?.name?.toLowerCase().includes(term) ||
      r.sellerId?.name?.toLowerCase().includes(term) ||
      r.status?.toLowerCase().includes(term)
    );
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedRegistries,
    totalItems: totalRegistriesCount,
  } = usePagination(filteredRegistries, 10);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    createRegistryMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 uppercase tracking-wide">
              Registry Milestone Tracker
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-blue-600" /> Registry Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 6: Marking a registry completed automatically updates the Plot to Registered and notifies the seller and their entire upline chain to Admin.
          </p>
        </div>

        {activeBookings.length > 0 && (
          <button
            onClick={() => {
              setFormError('');
              setFormData({
                bookingId: activeBookings[0]?._id || '',
                registryNumber: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
                registryDate: new Date().toISOString().split('T')[0],
                registryOffice: 'Indore Sub-Registrar Office',
                stampDutyAmount: 150000,
                remarks: '',
              });
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Register Active Booking
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by registry #, plot, project, customer, advisor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Registries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {registriesLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : filteredRegistries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchTerm ? 'No registries found matching your search' : 'No registries recorded yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Registry Number</th>
                  <th className="py-3 px-4">Plot & Project</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Seller Advisor</th>
                  <th className="py-3 px-4">Registry Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRegistries.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-brand-950 block">{r.registryNumber}</span>
                      <span className="text-[10px] text-slate-400">{r.registryOffice}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">
                        Plot {r.plotId?.plotNumber} ({r.plotId?.sizeSqFt} sq.ft.)
                      </span>
                      <span className="text-[10px] text-slate-400">{r.bookingId?.projectId?.name}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{r.customerId?.name}</span>
                      <span className="text-[10px] text-slate-400">{r.customerId?.phone}</span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {r.sellerId?.name}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {new Date(r.registryDate).toLocaleDateString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'on_hold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => {
                            if (confirm(`Mark registry #${r.registryNumber} completed? This will mark plot registered and notify full upline.`)) {
                              updateStatusMutation.mutate({ id: r._id, status: 'completed' });
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3" /> Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalRegistriesCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Create Registry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Record Plot Registry</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Active Booking
                </label>
                <select
                  required
                  value={formData.bookingId}
                  onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Select Active Booking --</option>
                  {activeBookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bookingNumber} • Plot {b.plotId?.plotNumber} ({b.customerId?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Registry Document Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registryNumber}
                    onChange={(e) => setFormData({ ...formData, registryNumber: e.target.value })}
                    placeholder="REG-987654"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Registry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.registryDate}
                    onChange={(e) => setFormData({ ...formData, registryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Sub-Registrar Office
                </label>
                <input
                  type="text"
                  value={formData.registryOffice}
                  onChange={(e) => setFormData({ ...formData, registryOffice: e.target.value })}
                  placeholder="Indore Sub-Registrar Office"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Registry remarks, document execution notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRegistryMutation.isPending}
                  className="px-4 py-1.5 bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Save Registry Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
