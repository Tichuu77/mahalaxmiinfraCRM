'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { TrendingUp, CheckCircle, XCircle, Clock, ShieldCheck, User, MessageSquare, X, ArrowRight } from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function IncentivesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [decision, setDecision] = useState('approved'); // 'approved' | 'rejected'
  const [comments, setComments] = useState('');
  const [modalError, setModalError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['incentives'],
    queryFn: () => apiFetch('/incentives'),
  });

  const approvalMutation = useMutation({
    mutationFn: (data) => apiFetch('/incentives', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setApprovalModalOpen(false);
      setSelectedBooking(null);
      setComments('');
    },
    onError: (err) => setModalError(err.message),
  });

  const incentives = data?.incentives || [];
  const pendingMyApproval = data?.pendingMyApproval || [];

  // Group pending incentives by bookingId
  const pendingBookingsMap = {};
  pendingMyApproval.forEach((inc) => {
    const bId = inc.bookingId?._id;
    if (bId) {
      if (!pendingBookingsMap[bId]) {
        pendingBookingsMap[bId] = {
          booking: inc.bookingId,
          items: [],
          currentStepIndex: inc.currentStepIndex,
        };
      }
      pendingBookingsMap[bId].items.push(inc);
    }
  });
  const pendingBookingGroups = Object.values(pendingBookingsMap);

  const pendingPagination = usePagination(pendingBookingGroups, 10);
  const ledgerPagination = usePagination(incentives, 10);

  const handleOpenApproval = (group) => {
    setSelectedBooking(group);
    setDecision('approved');
    setComments('');
    setModalError('');
    setApprovalModalOpen(true);
  };

  const handleApprovalSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    approvalMutation.mutate({
      bookingId: selectedBooking.booking._id,
      decision,
      comments,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 uppercase tracking-wide">
              Upward-Walk Dynamic Engine
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" /> Incentive Distribution & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 4: Calculated dynamically as Plot Size (SQ. FT.) × Role Rate (₹/sq.ft.) for seller and each upline ancestor.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-brand-950 shadow-xs'
                : 'text-slate-600 hover:text-brand-950'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Pending Review ({pendingBookingGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-white text-brand-950 shadow-xs'
                : 'text-slate-600 hover:text-brand-950'
            }`}
          >
            All Incentives Ledger ({incentives.length})
          </button>
        </div>
      </div>

      {/* Pending Approvals Review Section */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {isLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : pendingBookingGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700">No Pending Approvals Waiting on You</p>
              <p className="text-xs text-slate-400 mt-0.5">All booking incentive chains in your hierarchy are processed.</p>
            </div>
          ) : (
            <>
              {pendingPagination.paginatedItems.map((group) => {
                const b = group.booking;
                const totalBookingIncentives = group.items.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <div key={b._id} className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                          Awaiting Your Sign-Off
                        </span>
                        <h3 className="font-extrabold text-brand-950 text-base mt-1">
                          Booking #{b.bookingNumber} • Plot {b.plotId?.plotNumber} ({b.plotId?.sizeSqFt} sq.ft.)
                        </h3>
                        <p className="text-xs text-slate-500">
                          {b.projectId?.name} • Sold by {b.sellerId?.name} • Total Commission: ₹{totalBookingIncentives.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenApproval(group)}
                        className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <ShieldCheck className="w-4 h-4" /> Review & Approve Chain
                      </button>
                    </div>

                    {/* Chain Breakdown Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                          <tr>
                            <th className="py-2 px-3">Recipient Advisor</th>
                            <th className="py-2 px-3">Designation</th>
                            <th className="py-2 px-3">Basis</th>
                            <th className="py-2 px-3 text-right">Rate (₹/sq.ft.)</th>
                            <th className="py-2 px-3 text-right">Incentive Share</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <tr key={item._id}>
                              <td className="py-2.5 px-3 font-semibold text-brand-950">
                                {item.recipientId?.name}
                                <span className="text-[10px] text-slate-400 block">{item.recipientId?.email}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                {item.roleId?.name}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.basis === 'seller'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {item.basis === 'seller' ? 'Direct Seller' : 'Upline Override'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium">₹{item.ratePerSqFt}/sq.ft.</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700 text-sm">
                                ₹{(item.amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <Pagination
                  currentPage={pendingPagination.currentPage}
                  totalItems={pendingPagination.totalItems}
                  pageSize={pendingPagination.pageSize}
                  onPageChange={pendingPagination.setCurrentPage}
                  onPageSizeChange={pendingPagination.setPageSize}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Full Ledger Table */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : incentives.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No incentive records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Booking / Plot</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Basis</th>
                    <th className="py-3 px-4 text-right">Plot Size</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Incentive</th>
                    <th className="py-3 px-4 text-center">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerPagination.paginatedItems.map((inc) => (
                    <tr key={inc._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-brand-950 block">{inc.bookingId?.bookingNumber}</span>
                        <span className="text-[11px] text-slate-500">
                          Plot {inc.bookingId?.plotId?.plotNumber} ({inc.bookingId?.projectId?.name})
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-brand-950">
                        {inc.recipientId?.name}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {inc.roleId?.name || 'Advisor'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inc.basis === 'seller' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inc.basis === 'seller' ? 'Direct Seller' : 'Upline Override'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700">
                        {inc.plotSizeSqFt} sq.ft.
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹{inc.ratePerSqFt}/sq.ft.
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                        ₹{(inc.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inc.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inc.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : inc.status === 'voided'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={ledgerPagination.currentPage}
            totalItems={ledgerPagination.totalItems}
            pageSize={ledgerPagination.pageSize}
            onPageChange={ledgerPagination.setCurrentPage}
            onPageSizeChange={ledgerPagination.setPageSize}
          />
        </div>
      )}

      {/* Review & Approve Modal */}
      {approvalModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Incentive Approval Sign-Off</h3>
              <button onClick={() => setApprovalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleApprovalSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking:</span>
                  <span className="font-bold text-brand-950">{selectedBooking.booking?.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plot:</span>
                  <span className="font-medium text-slate-800">
                    {selectedBooking.booking?.plotId?.plotNumber} ({selectedBooking.booking?.plotId?.sizeSqFt} sq.ft.)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seller:</span>
                  <span className="font-medium text-slate-800">{selectedBooking.booking?.sellerId?.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('approved')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      decision === 'approved'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Approve Chain
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('rejected')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      decision === 'rejected'
                        ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-red-600" /> Reject Chain
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {decision === 'approved'
                    ? 'Approving advances the incentive chain to the next superior in hierarchy (or finalizes payouts if Admin).'
                    : 'Rejecting halts the chain immediately and notifies the seller.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Remarks / Comments</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Verification notes, payment clearance status..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvalMutation.isPending}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50 ${
                    decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalMutation.isPending ? 'Submitting...' : `Confirm ${decision === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
