'use client';

import { useMemo } from 'react';
import { 
  ChevronDown, ChevronRight, Crown, Mail, Phone, 
  Info, ArrowUpRight, Users, ShieldAlert, Sparkles, Edit3 
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function OrgChartNode({
  node,
  isRoot = false,
  hasParent = false,
  isNodeOpen,
  onToggle,
  onSelectMember,
  onFocusMember,
  onEditMember,
  searchQuery = '',
  selectedRoleId = '',
  focusedMemberId = null,
}) {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.roleId?.isRoot || currentUser?.roleId?.rank === 0;
  const isSelf = currentUser?._id === node._id;
  const canManage = isAdmin || (!isSelf && node.roleId?.rank > (currentUser?.roleId?.rank ?? 999));

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isOpen = isNodeOpen ? isNodeOpen(node._id) : true;

  // Calculate downline count recursively
  const downlineCount = useMemo(() => {
    const count = (n) => {
      if (!n.children || n.children.length === 0) return 0;
      return n.children.reduce((acc, c) => acc + 1 + count(c), 0);
    };
    return count(node);
  }, [node]);

  // Rank styling definitions
  const rankThemes = {
    0: {
      accent: 'from-rose-500 to-red-600',
      border: 'border-rose-300 hover:border-rose-400',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      avatarBg: 'bg-gradient-to-tr from-rose-600 to-red-500 text-white',
      ring: 'ring-rose-200',
      title: 'Root Admin',
    },
    1: {
      accent: 'from-purple-500 to-indigo-600',
      border: 'border-purple-300 hover:border-purple-400',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      avatarBg: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white',
      ring: 'ring-purple-200',
      title: 'Director',
    },
    2: {
      accent: 'from-blue-500 to-sky-600',
      border: 'border-blue-300 hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      avatarBg: 'bg-gradient-to-tr from-blue-600 to-sky-600 text-white',
      ring: 'ring-blue-200',
      title: 'Sales Manager',
    },
    3: {
      accent: 'from-emerald-500 to-green-600',
      border: 'border-emerald-300 hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      avatarBg: 'bg-gradient-to-tr from-emerald-600 to-green-500 text-white',
      ring: 'ring-emerald-200',
      title: 'Sales Executive',
    },
    5: {
      accent: 'from-emerald-500 to-green-600',
      border: 'border-emerald-300 hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      avatarBg: 'bg-gradient-to-tr from-emerald-600 to-green-500 text-white',
      ring: 'ring-emerald-200',
      title: 'Sales Executive',
    },
  };

  const theme = rankThemes[node.roleId?.rank] || {
    accent: 'from-slate-500 to-slate-700',
    border: 'border-slate-300 hover:border-slate-400',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    avatarBg: 'bg-slate-700 text-white',
    ring: 'ring-slate-200',
    title: 'Member',
  };

  // Search match check
  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase().trim();
    return (
      node.name?.toLowerCase().includes(query) ||
      node.email?.toLowerCase().includes(query) ||
      node.phone?.includes(query) ||
      node.roleId?.name?.toLowerCase().includes(query)
    );
  }, [searchQuery, node]);

  // Role filter check
  const isRoleMatch = useMemo(() => {
    if (!selectedRoleId) return true;
    return node.roleId?._id === selectedRoleId || node.roleId?.name === selectedRoleId;
  }, [selectedRoleId, node]);

  const isDimmed = (searchQuery && !isSearchMatch) || (selectedRoleId && !isRoleMatch);
  const isFocusedThis = focusedMemberId === node._id;

  return (
    <div className="flex flex-col items-center">
      {/* Top connector line from parent bus bar */}
      {hasParent && (
        <div className="w-0.5 h-6 bg-slate-300 transition-colors" />
      )}

      {/* The Node Card */}
      <div
        className={`relative w-72 rounded-2xl bg-white border shadow-sm transition-all duration-200 group text-left select-none ${
          isFocusedThis
            ? 'ring-2 ring-amber-500 border-amber-500 shadow-md'
            : isSearchMatch
            ? 'ring-2 ring-amber-400 border-amber-400 shadow-lg scale-105'
            : theme.border
        } ${isDimmed ? 'opacity-40 grayscale-[40%] hover:opacity-90 hover:grayscale-0' : 'hover:shadow-md'}`}
      >
        {/* Role Color Top Accent Strip */}
        <div className={`h-2 w-full rounded-t-2xl bg-gradient-to-r ${theme.accent}`} />

        <div className="p-4 space-y-3">
          {/* Top row: Avatar & Identity */}
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl shadow-sm flex items-center justify-center font-bold text-sm shrink-0 ring-2 ${theme.ring} ${theme.avatarBg}`}
            >
              {node.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${theme.badge}`}>
                  {node.roleId?.name || 'User'}
                </span>
                {node.roleId?.isRoot && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> Root
                  </span>
                )}
              </div>

              <h4 
                className="text-sm font-bold text-brand-950 mt-1 truncate group-hover:text-amber-600 transition" 
                title={node.name}
              >
                {node.name}
              </h4>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Quick Details Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMember(node);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="View full profile"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Quick Edit Action */}
              {canManage && onEditMember && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMember(node);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                  title="Edit member & team"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 truncate" title={node.email}>
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{node.email}</span>
            </div>
            {node.phone && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{node.phone}</span>
              </div>
            )}
          </div>

          {/* Downline Stats & Drill-down Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                {children.length} direct
              </span>
              {downlineCount > children.length && (
                <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 text-[10px]" title="Total downline team size">
                  +{downlineCount} total
                </span>
              )}
            </div>

            {hasChildren && onFocusMember && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocusMember(node);
                }}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5 hover:underline"
                title="Focus on this manager's subtree"
              >
                Focus <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Expand / Collapse Button Pill on bottom border */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node._id);
            }}
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full border text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 z-10 ${
              isOpen
                ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600 hover:scale-105 shadow'
            }`}
          >
            {isOpen ? (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>+{children.length} Reports</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Children Connector & Branching Layout */}
      {hasChildren && isOpen && (
        <div className="flex flex-col items-center w-max flex-nowrap">
          {/* Vertical stem from bottom of card down to bus bar */}
          <div className="w-0.5 h-6 bg-slate-300" />

          {/* Children row with bus bar */}
          <div className="flex items-start justify-center relative pt-0 w-max flex-nowrap">
            {children.map((child, index) => (
              <div key={child._id} className="relative flex flex-col items-center px-4 sm:px-6 shrink-0">
                {/* Horizontal bus line across sibling nodes */}
                {children.length > 1 && (
                  <div
                    className={`absolute top-0 h-0.5 bg-slate-300 ${
                      index === 0
                        ? 'left-1/2 right-0'
                        : index === children.length - 1
                        ? 'left-0 right-1/2'
                        : 'left-0 right-0'
                    }`}
                  />
                )}

                {/* Recursive Child Node */}
                <OrgChartNode
                  node={child}
                  isRoot={false}
                  hasParent={true}
                  isNodeOpen={isNodeOpen}
                  onToggle={onToggle}
                  onSelectMember={onSelectMember}
                  onFocusMember={onFocusMember}
                  onEditMember={onEditMember}
                  searchQuery={searchQuery}
                  selectedRoleId={selectedRoleId}
                  focusedMemberId={focusedMemberId}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
