'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CalendarCheck, Plus, CheckCircle2, XCircle, FileText, AlertCircle, X, ArrowRight, TrendingUp, Search, Eye, FileCheck } from 'lucide-react';
import Link from 'next/link';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewBooking, setViewBooking] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState(searchParams.get('plotId') || '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [bookingAmount, setBookingAmount] = useState(200000);
  const [paymentMode, setPaymentMode] = useState('Cheque');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiFetch('/bookings'),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch('/projects'),
  });

  const { data: plotsData } = useQuery({
    queryKey: ['plots', selectedProjectId, 'available'],
    queryFn: () => apiFetch(`/plots?projectId=${selectedProjectId}&status=available`),
    enabled: !!selectedProjectId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiFetch('/customers'),
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setModalOpen(false);
    },
    onError: (err) => setModalError(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiFetch('/bookings', { method: 'PUT', body: JSON.stringify({ _id: id, status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const bookings = bookingsData?.bookings || [];
  const projects = projectsData?.projects || [];
  const availablePlots = plotsData?.plots || [];
  const customers = customersData?.customers || [];

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingNumber?.toLowerCase().includes(term) ||
      b.projectId?.name?.toLowerCase().includes(term) ||
      b.plotId?.plotNumber?.toLowerCase().includes(term) ||
      b.customerId?.name?.toLowerCase().includes(term) ||
      b.sellerId?.name?.toLowerCase().includes(term)
    );
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedBookings,
    totalItems: totalBookingsCount,
  } = usePagination(filteredBookings, 10);

  // If a plotId was passed from the project page, pre-select it
  useEffect(() => {
    const plotIdFromQuery = searchParams.get('plotId');
    if (plotIdFromQuery) {
      setSelectedPlotId(plotIdFromQuery);
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    createBookingMutation.mutate({
      plotId: selectedPlotId,
      projectId: selectedProjectId,
      customerId: selectedCustomerId,
      bookingAmount: Number(bookingAmount),
      paymentMode,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wide">
              All-Level Selling Platform
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-amber-500" /> Plot Bookings & Lifecycle
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 3: Any advisor at any rank can book a plot. Activating a booking automatically triggers the upward-walk incentive calculation!
          </p>
        </div>

        <button
          onClick={() => {
            setModalError('');
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Booking
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by booking #, project, plot, customer, advisor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'active', label: 'Active' },
            { id: 'registry', label: 'Registry' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition text-xs ${
                statusFilter === tab.id
                  ? 'bg-brand-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {bookingsLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchTerm || statusFilter !== 'all' ? 'No bookings found matching your search/filter' : 'No downline bookings recorded yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Booking ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Project & Plot</th>
                  <th className="py-3 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Seller (Advisor)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Advance Paid</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Plot Value</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-brand-950 block">{b.bookingNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(b.bookingDate).toLocaleDateString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-brand-950">{b.plotId?.plotNumber}</span>
                      <span className="text-slate-500 block text-[11px]">
                        {b.projectId?.name} ({b.plotId?.sizeSqFt} sq.ft.)
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">{b.customerId?.name}</span>
                      <span className="text-[10px] text-slate-400">{b.customerId?.phone}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">{b.sellerId?.name}</span>
                      <span className="text-[10px] text-slate-400">{b.sellerId?.email}</span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-slate-700">
                      ₹{(b.bookingAmount || 0).toLocaleString('en-IN')}
                      <span className="block text-[10px] text-slate-400">{b.paymentMode}</span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-brand-950 text-sm">
                      ₹{(b.totalPlotValue || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'registry'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Quick View Details */}
                        <button
                          onClick={() => setViewBooking(b)}
                          title="View Booking Details"
                          className="inline-flex items-center justify-center gap-1 h-7 px-2.5 text-slate-600 hover:text-brand-950 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {/* Activate Booking */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => {
                              if (confirm(`Activate Booking #${b.bookingNumber}? This will trigger the dynamic Upward-Walk Incentive Engine.`)) {
                                updateStatusMutation.mutate({ id: b._id, status: 'active' });
                              }
                            }}
                            title="Activate Booking & Calculate Incentives"
                            className="inline-flex items-center justify-center gap-1 h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </button>
                        )}

                        {/* View Incentives */}
                        {b.status === 'active' && (
                          <Link
                            href="/dashboard/incentives"
                            title="View Upward-Walk Incentives"
                            className="inline-flex items-center justify-center gap-1 h-7 px-2.5 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-semibold rounded-lg text-xs transition shadow-2xs"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                            <span>Incentives</span>
                          </Link>
                        )}

                        {/* View Registry */}
                        {b.status === 'registry' && (
                          <Link
                            href="/dashboard/registries"
                            title="View in Registry Management"
                            className="inline-flex items-center justify-center gap-1 h-7 px-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-semibold rounded-lg text-xs transition shadow-2xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Registry</span>
                          </Link>
                        )}

                        {/* Cancel Booking */}
                        {b.status !== 'cancelled' && b.status !== 'registry' && (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel Booking #${b.bookingNumber}? Plot will be released and incentives voided.`)) {
                                updateStatusMutation.mutate({ id: b._id, status: 'cancelled' });
                              }
                            }}
                            title="Cancel Booking"
                            className="inline-flex items-center justify-center gap-1 h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg text-xs font-medium transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
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
          totalItems={totalBookingsCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Create Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Book a Plot</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Project</label>
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Available Plot</label>
                <select
                  required
                  value={selectedPlotId}
                  onChange={(e) => setSelectedPlotId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose Plot --</option>
                  {availablePlots.map((plot) => (
                    <option key={plot._id} value={plot._id}>
                      {plot.plotNumber} • {plot.sizeSqFt} sq.ft. • ₹{(plot.totalPrice || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Booking Advance (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookingAmount}
                    onChange={(e) => setBookingAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {['Cheque', 'NEFT/RTGS', 'UPI', 'Cash', 'Demand Draft'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment details, cheque number, registry target date..."
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
                  disabled={createBookingMutation.isPending}
                  className="px-4 py-1.5 bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Booking Details Modal */}
      {viewBooking && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-brand-950 text-base">
                  {viewBooking.bookingNumber}
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    viewBooking.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : viewBooking.status === 'registry'
                      ? 'bg-blue-100 text-blue-800'
                      : viewBooking.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {viewBooking.status}
                </span>
              </div>
              <button
                onClick={() => setViewBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Property Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Property Details</div>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-brand-950 text-sm">
                    {viewBooking.projectId?.name} ({viewBooking.projectId?.code})
                  </span>
                  <span className="font-semibold text-slate-700">Plot #{viewBooking.plotId?.plotNumber}</span>
                </div>
                <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <span>Size: <strong className="text-slate-700">{viewBooking.plotId?.sizeSqFt} sq.ft.</strong></span>
                  {viewBooking.plotId?.facing && (
                    <span>Facing: <strong className="text-slate-700">{viewBooking.plotId?.facing}</strong></span>
                  )}
                  {viewBooking.plotId?.dimension && (
                    <span>Dimensions: <strong className="text-slate-700">{viewBooking.plotId?.dimension}</strong></span>
                  )}
                </div>
              </div>

              {/* Customer & Advisor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
                  <div className="font-bold text-brand-950">{viewBooking.customerId?.name}</div>
                  <div className="text-slate-500">{viewBooking.customerId?.phone}</div>
                  {viewBooking.customerId?.email && (
                    <div className="text-slate-400 text-[11px] truncate">{viewBooking.customerId?.email}</div>
                  )}
                  {viewBooking.customerId?.aadhaarNumber && (
                    <div className="text-slate-400 text-[10px]">Aadhaar: •••• {viewBooking.customerId?.aadhaarNumber.slice(-4)}</div>
                  )}
                  {viewBooking.customerId?.panNumber && (
                    <div className="text-slate-400 text-[10px]">PAN: {viewBooking.customerId?.panNumber}</div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seller (Advisor)</div>
                  <div className="font-bold text-brand-950">{viewBooking.sellerId?.name}</div>
                  <div className="text-slate-500">{viewBooking.sellerId?.email}</div>
                  {viewBooking.sellerId?.phone && (
                    <div className="text-slate-400 text-[11px]">{viewBooking.sellerId?.phone}</div>
                  )}
                </div>
              </div>

              {/* Financials Breakdown */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/60 space-y-2">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Financial Breakdown</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Total Plot Value</span>
                    <span className="text-sm font-bold text-brand-950">
                      ₹{(viewBooking.totalPlotValue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Advance Paid</span>
                    <span className="text-sm font-bold text-emerald-700">
                      ₹{(viewBooking.bookingAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Balance Due</span>
                    <span className="text-xs font-semibold text-slate-800">
                      ₹{Math.max(0, (viewBooking.totalPlotValue || 0) - (viewBooking.bookingAmount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Payment Mode</span>
                    <span className="text-xs font-semibold text-slate-800">{viewBooking.paymentMode || 'Cheque'}</span>
                  </div>
                </div>
                {viewBooking.transactionReference && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-amber-200/50">
                    Ref #: <span className="font-mono text-slate-800">{viewBooking.transactionReference}</span>
                  </div>
                )}
              </div>

              {/* Notes & Dates */}
              <div className="space-y-1 text-slate-500 text-[11px]">
                <div className="flex justify-between">
                  <span>Booking Date:</span>
                  <span className="font-medium text-slate-700">
                    {new Date(viewBooking.bookingDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                {viewBooking.activatedAt && (
                  <div className="flex justify-between">
                    <span>Activated On:</span>
                    <span className="font-medium text-emerald-700">
                      {new Date(viewBooking.activatedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                {viewBooking.notes && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600 text-xs">
                    <strong>Notes:</strong> {viewBooking.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewBooking(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {viewBooking.status === 'pending' && (
                  <button
                    onClick={() => {
                      if (confirm(`Activate Booking #${viewBooking.bookingNumber}? This will trigger the dynamic Upward-Walk Incentive Engine.`)) {
                        updateStatusMutation.mutate({ id: viewBooking._id, status: 'active' });
                        setViewBooking(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Activate Booking
                  </button>
                )}

                {viewBooking.status === 'active' && (
                  <Link
                    href="/dashboard/incentives"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-semibold rounded-lg text-xs transition shadow-2xs"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                    View Incentives
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
