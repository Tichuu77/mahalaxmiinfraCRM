'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  UserCheck,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Search,
  X,
  Check,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Building,
  CreditCard,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Add form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Indore',
    panNumber: '',
    aadhaarNumber: '',
  });

  // View state
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewBookings, setViewBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    panNumber: '',
    aadhaarNumber: '',
  });
  const [editFormError, setEditFormError] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Query customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiFetch('/customers'),
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (newCustomer) =>
      apiFetch('/customers', { method: 'POST', body: JSON.stringify(newCustomer) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: 'Indore',
        panNumber: '',
        aadhaarNumber: '',
      });
    },
    onError: (err) => setFormError(err.message),
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: (updatedData) =>
      apiFetch('/customers', {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditModalOpen(false);
      if (viewCustomer && viewCustomer._id === editingCustomer?._id) {
        setViewCustomer(res.customer || { ...viewCustomer, ...editFormData });
      }
    },
    onError: (err) => setEditFormError(err.message),
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/customers?id=${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteTarget(null);
      if (viewCustomer && viewCustomer._id === deleteTarget?._id) {
        setViewCustomer(null);
      }
    },
    onError: (err) => setDeleteError(err.message),
  });

  const customers = data?.customers || [];

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.aadhaarNumber && c.aadhaarNumber.includes(searchTerm)) ||
      (c.panNumber && c.panNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedCustomers,
    totalItems: totalCustomersCount,
  } = usePagination(filteredCustomers, 10);

  // Handle Add Customer
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const cleanAadhaar = formData.aadhaarNumber ? formData.aadhaarNumber.replace(/\s+/g, '') : '';
    if (!cleanAadhaar || cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
      setFormError('Aadhaar number is required and must be exactly 12 digits');
      return;
    }

    createCustomerMutation.mutate({
      ...formData,
      aadhaarNumber: cleanAadhaar,
    });
  };

  // Handle View Customer
  const handleView = async (customer) => {
    setViewCustomer(customer);
    setViewBookings([]);
    setLoadingBookings(true);
    try {
      const res = await apiFetch(`/customers?id=${customer._id}`);
      if (res?.bookings) {
        setViewBookings(res.bookings);
      }
    } catch (err) {
      console.error('Failed to load customer bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Handle Open Edit Customer
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || 'Indore',
      panNumber: customer.panNumber || '',
      aadhaarNumber: customer.aadhaarNumber || '',
    });
    setEditFormError('');
    setEditModalOpen(true);
  };

  // Handle Submit Edit Customer
  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditFormError('');

    const cleanAadhaar = editFormData.aadhaarNumber
      ? editFormData.aadhaarNumber.replace(/\s+/g, '')
      : '';
    if (!cleanAadhaar || cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
      setEditFormError('Aadhaar number is required and must be exactly 12 digits');
      return;
    }

    updateCustomerMutation.mutate({
      _id: editingCustomer._id,
      ...editFormData,
      aadhaarNumber: cleanAadhaar,
    });
  };

  // Handle Delete Click
  const handleDeleteClick = (customer) => {
    setDeleteTarget(customer);
    setDeleteError('');
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteCustomerMutation.mutate(deleteTarget._id);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'registry':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 uppercase tracking-wide">
              Downline Scoped Directory
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-950 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-500" /> Customer Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Section 5: View, edit, delete, and manage all customers registered by you or anyone within your downline team.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setFormData({
              name: '',
              phone: '',
              email: '',
              address: '',
              city: 'Indore',
              panNumber: '',
              aadhaarNumber: '',
            });
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, email, Aadhaar, PAN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No customers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">KYC (Aadhaar / PAN)</th>
                  <th className="py-3 px-4">Registered By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-950 text-sm">{c.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Added: {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="max-w-[200px] truncate" title={c.address || c.city || 'Indore'}>
                        {c.address || c.city || 'Indore'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <span className="font-semibold text-slate-700 block">
                          UID: {c.aadhaarNumber ? `•••• ${c.aadhaarNumber.slice(-4)}` : '—'}
                        </span>
                        <span className="text-slate-500 block">
                          PAN: {c.panNumber ? c.panNumber : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{c.createdBy?.name || 'Self'}</span>
                      <span className="text-[10px] text-slate-400">{c.createdBy?.email}</span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(c)}
                          title="View Profile & Bookings"
                          className="p-1.5 text-slate-600 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          title="Edit Customer"
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c)}
                          title="Delete Customer"
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          totalItems={totalCustomersCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* VIEW CUSTOMER MODAL */}
      {viewCustomer && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center font-bold text-amber-700 text-lg">
                  {viewCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-brand-950 text-lg">{viewCustomer.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Customer
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Registered{' '}
                    {viewCustomer.createdAt
                      ? new Date(viewCustomer.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Contact & KYC Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Card */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Information
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <a
                        href={`tel:${viewCustomer.phone}`}
                        className="font-semibold text-brand-900 hover:underline"
                      >
                        {viewCustomer.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-medium text-slate-800">
                        {viewCustomer.email ? (
                          <a href={`mailto:${viewCustomer.email}`} className="hover:underline">
                            {viewCustomer.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">City:</span>
                      <span className="font-medium text-slate-800">{viewCustomer.city || 'Indore'}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 block mb-0.5">Address:</span>
                      <span className="text-slate-700 block text-[11px] leading-relaxed">
                        {viewCustomer.address || 'No street address provided.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KYC Card */}
                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2.5">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" /> KYC Verification Details
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/60">
                      <div className="text-[10px] text-slate-400 font-medium">Aadhaar (UID)</div>
                      <div className="font-mono font-bold text-brand-950 text-sm tracking-wider mt-0.5">
                        {viewCustomer.aadhaarNumber
                          ? viewCustomer.aadhaarNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
                          : 'Not Provided'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/60">
                      <div className="text-[10px] text-slate-400 font-medium">PAN Card</div>
                      <div className="font-mono font-bold text-brand-950 text-sm tracking-wider mt-0.5">
                        {viewCustomer.panNumber || 'Not Provided (Optional)'}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Registered by:{' '}
                      <strong className="text-slate-800">
                        {viewCustomer.createdBy?.name || 'Self'}
                      </strong>{' '}
                      {viewCustomer.createdBy?.email && `(${viewCustomer.createdBy.email})`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Bookings Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-brand-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-amber-500" /> Associated Plot Bookings
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {loadingBookings
                      ? ''
                      : `${viewBookings.length} booking${viewBookings.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                {loadingBookings ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-32 bg-slate-200 rounded" />
                          <div className="h-2.5 w-48 bg-slate-100 rounded" />
                        </div>
                        <div className="h-6 w-20 bg-slate-200 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : viewBookings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No plot bookings found for this customer.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewBookings.map((b) => (
                      <div
                        key={b._id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-950">{b.bookingNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                                b.status
                              )}`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            Project: <strong>{b.projectId?.name || '—'}</strong> | Plot:{' '}
                            <strong>{b.plotId?.plotNumber || '—'}</strong> (
                            {b.plotId?.sizeSqFt || 0} sq.ft.)
                          </div>
                        </div>

                        <div className="text-right sm:self-center">
                          <div className="text-slate-400 text-[10px]">Booking Amount</div>
                          <div className="font-bold text-brand-950 text-sm">
                            ₹{(b.bookingAmount || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Total Value: ₹{(b.totalPlotValue || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const cust = viewCustomer;
                  setViewCustomer(null);
                  handleEdit(cust);
                }}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-700" /> Edit Customer
              </button>

              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-950 text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" /> Edit Customer
                </h3>
                <p className="text-[11px] text-slate-400">Update customer information and KYC</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFormError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Mukesh Chouhan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="9826011223"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="mukesh@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Aadhaar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.aadhaarNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12),
                      })
                    }
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    PAN Card <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.panNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        panNumber: e.target.value.toUpperCase().slice(0, 10),
                      })
                    }
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">City</label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  placeholder="Indore"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="Street, locality, landmarks..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCustomerMutation.isPending}
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition"
                >
                  {updateCustomerMutation.isPending ? 'Saving...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-brand-950 text-center">Delete Customer</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to delete <strong className="text-slate-800">{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteCustomerMutation.isPending}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                {deleteCustomerMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-brand-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-950 text-base">Add New Customer</h3>
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
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mukesh Chouhan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9826011223"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mukesh@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Aadhaar Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.aadhaarNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12),
                      })
                    }
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    PAN Card <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        panNumber: e.target.value.toUpperCase().slice(0, 10),
                      })
                    }
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Indore"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, locality, landmarks..."
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
                  disabled={createCustomerMutation.isPending}
                  className="px-4 py-1.5 bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
