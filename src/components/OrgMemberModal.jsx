'use client';

import { useState } from 'react';
import { 
  X, Mail, Phone, ShieldCheck, Crown, Users, 
  ArrowUpRight, Copy, Check, Briefcase, Award, Calendar, Edit3
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function OrgMemberModal({ member, onClose, onFocusMember, onEditMember }) {
  const { user: currentUser } = useAuthStore();
  const [copiedField, setCopiedField] = useState(null);

  if (!member) return null;

  const isAdmin = currentUser?.roleId?.isRoot || currentUser?.roleId?.rank === 0;
  const isSelf = currentUser?._id === member._id;
  const canManage = isAdmin || (!isSelf && member.roleId?.rank > (currentUser?.roleId?.rank ?? 999));

  const copyToClipboard = (text, field) => {
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

  const theme = rankThemes[member.roleId?.rank] || {
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    badge: 'bg-slate-700 text-white',
  };

  const directCount = member.children?.length || 0;
  
  // Calculate downline count recursively
  const getDownlineCount = (node) => {
    if (!node.children || node.children.length === 0) return 0;
    return node.children.reduce((acc, child) => acc + 1 + getDownlineCount(child), 0);
  };
  const totalDownline = getDownlineCount(member);

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
              {member.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}>
                  {member.roleId?.name || 'Member'}
                </span>
                {member.roleId?.isRoot && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Root Admin
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-brand-950">{member.name}</h2>
              <span className="inline-block mt-0.5 text-xs text-slate-500">
                Status: <span className="font-semibold text-emerald-600 capitalize">{member.status || 'Active'}</span>
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
                <div className="text-lg font-bold text-brand-950">{directCount}</div>
                <div className="text-xs text-slate-500">Direct Reports</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-brand-950">{totalDownline}</div>
                <div className="text-xs text-slate-500">Total Downline Team</div>
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
                  <span className="truncate">{member.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(member.email, 'email')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {member.phone && (
                <div className="p-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(member.phone, 'phone')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reporting Line (Supervisor) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Reports Directly To</h3>
            {member.reportsTo ? (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center">
                    {member.reportsTo.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-950">{member.reportsTo.name}</div>
                    <div className="text-xs text-slate-500">{member.reportsTo.email}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Root Administrator (Top of Organization)
              </div>
            )}
          </div>

          {/* Commission & Incentive Rates */}
          {(member.roleId?.sellerRate !== undefined || member.roleId?.overrideRate !== undefined) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Role Incentive Tier</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Direct Seller Rate:</span>
                  <span className="font-bold text-brand-950">₹{member.roleId?.sellerRate ?? 0}/sq.ft</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Override Rate:</span>
                  <span className="font-bold text-brand-950">₹{member.roleId?.overrideRate ?? 0}/sq.ft</span>
                </div>
              </div>
            </div>
          )}

          {/* Direct Reports List */}
          {directCount > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Direct Reports ({directCount})
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {member.children.map((child) => (
                  <div
                    key={child._id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px]">
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{child.name}</div>
                        <div className="text-[11px] text-slate-500">{child.roleId?.name || 'Member'}</div>
                      </div>
                    </div>
                    {child.children?.length > 0 && (
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        +{child.children.length} team
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {directCount > 0 && onFocusMember && (
              <button
                onClick={() => {
                  onFocusMember(member);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Focus on this Branch
              </button>
            )}
            {canManage && onEditMember && (
              <button
                onClick={() => {
                  onClose();
                  onEditMember(member);
                }}
                className="px-3.5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white border border-gold-500/30 text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Member &amp; Team
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
