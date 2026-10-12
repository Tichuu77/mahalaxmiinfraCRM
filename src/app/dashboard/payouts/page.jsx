'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Receipt, Download, CheckCircle2, DollarSign, Clock, ShieldCheck, X, Check, Search } from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roleId?.isRoot || user?.roleId?.rank === 0;

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [transactionReference, setTransactionReference] = useState('');
  const [remarks, setRemarks] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => apiFetch('/payouts'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => apiFetch('/payouts', { method: 'PUT', body: JSON.stringify({ _id: id, ...data }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setPayModalOpen(false);
      setSelectedPayout(null);
      setTransactionReference('');
      setRemarks('');
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const payouts = data?.payouts || [];

  const filteredPayouts = payouts.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.billNumber?.toLowerCase().includes(term) ||
      p.recipientId?.name?.toLowerCase().includes(term) ||
      p.bookingId?.bookingNumber?.toLowerCase().includes(term) ||
      p.bookingId?.projectId?.name?.toLowerCase().includes(term) ||
      p.status?.toLowerCase().includes(term)
    );
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedPayouts,
    totalItems: totalPayoutsCount,
  } = usePagination(filteredPayouts, 10);

  const handleOpenPay = (payout) => {
    setSelectedPayout(payout);
    setTransactionReference(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaymentMode('Bank Transfer (NEFT/RTGS)');
    setRemarks('');
    setPayModalOpen(true);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    payMutation.mutate({
      id: selectedPayout._id,
      data: {
        status: 'paid',
        paymentMode,
        transactionReference,
        remarks,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wide">
              Official Bill Generator
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" /> Payout Disbursement & Commission Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 7: Generates official Mahalaxmi Infra Commission Bills formatted with project details, advisor upline chain rows, and company sign-offs.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill #, recipient, booking #, project, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchTerm ? 'No payouts found matching your search' : 'No approved payouts generated yet. Payouts are generated once incentive records are fully approved.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Bill Number</th>
                  <th className="py-3 px-4">Advisor (Recipient)</th>
                  <th className="py-3 px-4">Booking & Plot</th>
                  <th className="py-3 px-4 text-right">Commission Amount</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-right">Official Bill PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPayouts.map((p) => {
                  const canDisburse = isAdmin || (user?.roleId?.rank <= 1);

                  return (
                    <tr key={p._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-brand-950 block font-mono text-xs">{p.billNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-brand-950 block">{p.recipientId?.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {p.recipientId?.roleId?.name} • {p.recipientId?.phone}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          Plot {p.bookingId?.plotId?.plotNumber}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.bookingId?.projectId?.name} ({p.bookingId?.bookingNumber})
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-sm">
                        ₹{(p.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.paidAt && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            {new Date(p.paidAt).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download PDF Bill Button */}
                          <a
                            href={`/api/payouts/${p._id}/bill`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Official Bill PDF
                          </a>

                          {/* Disburse / Mark as Paid */}
                          {p.status !== 'paid' && canDisburse && (
                            <button
                              onClick={() => handleOpenPay(p)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition shadow flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Disburse
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

        <Pagination
          currentPage={currentPage}
          totalItems={totalPayoutsCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Disburse Modal */}
      {payModalOpen && selectedPayout && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Disburse Commission Payout</h3>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Recipient:</span>
                  <span className="font-bold text-brand-950">{selectedPayout.recipientId?.name}</span>
                </div>
                <div className="flex justify-between font-medium mt-1">
                  <span className="text-slate-600">Commission Payable:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ₹{(selectedPayout.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Disbursement Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {['Bank Transfer (NEFT/RTGS)', 'Cheque', 'UPI', 'Cash'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Transaction / UTR / Cheque Reference
                </label>
                <input
                  type="text"
                  required
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UTR-99881122"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment confirmation notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  Confirm Payout & Send Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
