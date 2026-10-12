'use client';

import { useState } from 'react';
import { 
  X, Mail, Phone, ShieldCheck, Crown, Users, 
  Copy, Check, Briefcase, Award, Calendar, Edit3, 
  ArrowUpRight, Network, Sparkles 
} from 'lucide-react';

export default function UserViewModal({
  user,
  allUsers = [],
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !user) return null;

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const rankThemes = {
    0: { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-600 text-white' },
    1: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-600 text-white' },
    2: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-600 text-white' },
    3: { border: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-600 text-white' },
    4: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-600 text-white' },
    5: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-600 text-white' },
  };

  const rank = user.roleId?.rank;
  const theme = rankThemes[rank] || {
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    badge: 'bg-slate-700 text-white',
  };

  // Find direct team reports in allUsers if available
  const directReports = allUsers.filter((u) => {
    const mgrId = u.reportsTo?._id || u.reportsTo;
    return mgrId && mgrId.toString() === user._id.toString();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className={`p-6 border-b border-slate-100 relative ${theme.bg}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-sm transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-md border-2 ${theme.border} bg-white text-slate-800`}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}>
                  {user.roleId?.name || 'Member'}
                </span>
                {user.roleId?.isRoot && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Root Admin
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-brand-950">{user.name}</h2>
              <span className="inline-block mt-0.5 text-xs text-slate-500">
                Status:{' '}
                <span className={`font-semibold capitalize ${user.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {user.status || 'Active'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-brand-950">{directReports.length}</div>
                <div className="text-xs text-slate-500">Direct Team Reports</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-950">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-xs text-slate-500">Joined Date</div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Information</h3>
            <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
              <div className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(user.email, 'email')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {user.phone && (
                <div className="p-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.phone, 'phone')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reporting Line (Team Manager) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Manager &amp; Team</h3>
            {user.reportsTo ? (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center">
                    {user.reportsTo.name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-950">{user.reportsTo.name}</div>
                    <div className="text-xs text-slate-500">
                      {user.reportsTo.email} {user.reportsTo.phone ? `• ${user.reportsTo.phone}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Root Administrator (Top Authority of Organization)
              </div>
            )}
          </div>

          {/* Role Incentive Tier */}
          {(user.roleId?.sellerRate !== undefined || user.roleId?.overrideRate !== undefined) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Commission &amp; Incentive Rates</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Direct Seller Rate:</span>
                  <span className="font-bold text-brand-950">₹{user.roleId?.sellerRate ?? 0}/sq.ft</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Override Rate:</span>
                  <span className="font-bold text-brand-950">₹{user.roleId?.overrideRate ?? 0}/sq.ft</span>
                </div>
              </div>
            </div>
          )}

          {/* Direct Reports List */}
          {directReports.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Direct Team Members ({directReports.length})
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {directReports.map((member) => (
                  <div
                    key={member._id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px]">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{member.name}</div>
                        <div className="text-[11px] text-slate-500">{member.roleId?.name || 'Member'}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
          >
            Close
          </button>
          {canEdit && (
            <button
              onClick={() => {
                onClose();
                if (onEdit) onEdit(user);
              }}
              className="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Member &amp; Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
