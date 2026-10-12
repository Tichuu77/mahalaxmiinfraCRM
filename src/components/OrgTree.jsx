'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Network, ListTree, ZoomIn, ZoomOut, RotateCcw, 
  Search, Filter, ChevronRight, ChevronDown, Users, 
  Crown, Mail, Phone, Info, ArrowUpRight, Check, X,
  Maximize2, Minimize2, Move, Compass, Sparkles, Edit3
} from 'lucide-react';
import OrgChartNode from './OrgChartNode';
import OrgMemberModal from './OrgMemberModal';
import UserEditModal from './UserEditModal';
import { useAuthStore } from '@/lib/store';

export default function OrgTree({ tree = [] }) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'directory'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  
  // Diagram Pan & Zoom state (Mermaid / Canvas style)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [focusedMember, setFocusedMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  const viewportRef = useRef(null);
  const diagramContentRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMovedDuringDrag = useRef(false);

  // Flatten all nodes for quick search / ancestors / roles
  const allNodesList = useMemo(() => {
    const list = [];
    const traverse = (nodes, parent = null) => {
      nodes.forEach((node) => {
        list.push({ ...node, parentRef: parent });
        if (node.children?.length > 0) {
          traverse(node.children, node);
        }
      });
    };
    traverse(tree);
    return list;
  }, [tree]);

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const map = new Map();
    allNodesList.forEach((n) => {
      if (n.roleId?.name) {
        map.set(n.roleId.name, {
          id: n.roleId._id || n.roleId.name,
          name: n.roleId.name,
          rank: n.roleId.rank,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }, [allNodesList]);

  // Search matching IDs & their ancestors to auto-expand
  const { matchingIds, ancestorsOfMatches } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { matchingIds: new Set(), ancestorsOfMatches: new Set() };
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = new Set();
    const ancestors = new Set();

    allNodesList.forEach((node) => {
      const match =
        node.name?.toLowerCase().includes(q) ||
        node.email?.toLowerCase().includes(q) ||
        node.phone?.includes(q) ||
        node.roleId?.name?.toLowerCase().includes(q);

      if (match) {
        matches.add(node._id);
        let curr = node.parentRef;
        while (curr) {
          ancestors.add(curr._id);
          curr = curr.parentRef;
        }
      }
    });

    return { matchingIds: matches, ancestorsOfMatches: ancestors };
  }, [searchQuery, allNodesList]);

  // Build breadcrumb trail when a node is focused
  const breadcrumbTrail = useMemo(() => {
    if (!focusedMember) return [];
    const trail = [focusedMember];
    let currId = focusedMember.reportsTo?._id || focusedMember.reportsTo;
    while (currId) {
      const parentNode = allNodesList.find((n) => n._id?.toString() === currId.toString());
      if (parentNode) {
        trail.unshift(parentNode);
        currId = parentNode.reportsTo?._id || parentNode.reportsTo;
      } else {
        break;
      }
    }
    return trail;
  }, [focusedMember, allNodesList]);

  // Determine current active root nodes (either full tree or focused member)
  const activeRoots = useMemo(() => {
    if (!focusedMember) return tree;
    const found = allNodesList.find((n) => n._id === focusedMember._id);
    return found ? [found] : tree;
  }, [focusedMember, tree, allNodesList]);

  // Toggle node expansion
  const toggleNode = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isNodeOpen = (id) => {
    if (searchQuery.trim() && ancestorsOfMatches.has(id)) {
      return true;
    }
    return !collapsedIds.has(id);
  };

  const expandAll = () => {
    setCollapsedIds(new Set());
  };

  const collapseAll = () => {
    const parentIds = new Set();
    allNodesList.forEach((n) => {
      if (n.children && n.children.length > 0) {
        parentIds.add(n._id);
      }
    });
    setCollapsedIds(parentIds);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))));
  
  // Center Diagram to initial origin
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Fit Diagram to Viewport
  const handleFitToScreen = useCallback(() => {
    if (!viewportRef.current || !diagramContentRef.current) return;
    const vpRect = viewportRef.current.getBoundingClientRect();
    const contentRect = diagramContentRef.current.getBoundingClientRect();

    if (contentRect.width > 0 && contentRect.height > 0) {
      const currentScale = zoom;
      const unscaledWidth = contentRect.width / currentScale;
      const unscaledHeight = contentRect.height / currentScale;

      const padding = 80;
      const scaleX = (vpRect.width - padding) / unscaledWidth;
      const scaleY = (vpRect.height - padding) / unscaledHeight;
      const newScale = Math.max(0.4, Math.min(1.2, Math.min(scaleX, scaleY)));

      setZoom(Number(newScale.toFixed(2)));
      setPan({ x: 0, y: 20 });
    }
  }, [zoom]);

  // Mouse wheel pan & zoom listener
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || viewMode !== 'chart') return;

    const handleWheel = (e) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming via pinch or Ctrl+wheel
        const zoomDelta = -e.deltaY * 0.002;
        setZoom((prevZoom) => {
          const next = Math.max(0.35, Math.min(2.0, prevZoom + zoomDelta));
          return Number(next.toFixed(2));
        });
      } else {
        // Panning with wheel / touchpad scroll
        setPan((prev) => ({
          x: prev.x - e.deltaX * 1.0,
          y: prev.y - e.deltaY * 1.0,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [viewMode]);

  // Mouse drag handlers for canvas panning
  const handleMouseDown = (e) => {
    // Only drag with left click and avoid clicking inside buttons, inputs, links
    if (e.button !== 0 || e.target.closest('button, input, select, a')) return;
    isDragging.current = true;
    hasMovedDuringDrag.current = false;
    dragStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    hasMovedDuringDrag.current = true;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Reset view when switching between trees or focusing
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [focusedMember]);

  if (!tree || tree.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">No Hierarchy Members Found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          There are currently no reports or supervisors registered under this organizational scope.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-brand-950/50 backdrop-blur-md p-4 sm:p-6 overflow-hidden flex flex-col justify-between' : ''}`}>
      {/* Top Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
        {/* Left: View Mode Toggle & Quick Stats */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch View Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'chart'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-slate-600 hover:text-brand-950'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-amber-500" />
              <span>Org Chart Tree</span>
            </button>

            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'directory'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-slate-600 hover:text-brand-950'
              }`}
            >
              <ListTree className="w-3.5 h-3.5 text-blue-500" />
              <span>Directory Tree</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block mx-1" />

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-brand-950 hover:bg-slate-100 rounded-lg transition"
              title="Expand all branches"
            >
              Expand All
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-brand-950 hover:bg-slate-100 rounded-lg transition"
              title="Collapse all branches"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Right: Search, Filter, Zoom, and Pan Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[230px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member, role, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            >
              <option value="ALL">All Roles ({uniqueRoles.length})</option>
              {uniqueRoles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Canvas Navigation Toolbar (Chart View Only) */}
          {viewMode === 'chart' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.35}
                className="p-1 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 transition"
                title="Zoom Out (Ctrl + Scroll Down)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-white rounded-md transition"
                title="Reset View (100% & Center)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2.0}
                className="p-1 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 transition"
                title="Zoom In (Ctrl + Scroll Up)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />

              <button
                onClick={handleFitToScreen}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-brand-950 hover:bg-white rounded-lg transition"
                title="Fit diagram to screen"
              >
                Fit
              </button>

              <button
                onClick={handleResetView}
                className="p-1 rounded-lg hover:bg-white text-slate-600 transition"
                title="Center diagram"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded-lg hover:bg-white text-slate-600 transition"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb Trail for Focused Subtree */}
      {focusedMember && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
            <span className="font-semibold text-amber-900">Focused View:</span>
            <button
              onClick={() => setFocusedMember(null)}
              className="text-amber-700 hover:text-amber-900 font-bold hover:underline"
            >
              All Company
            </button>
            {breadcrumbTrail.map((m, idx) => (
              <span key={m._id} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-amber-400" />
                {idx === breadcrumbTrail.length - 1 ? (
                  <span className="font-bold text-brand-950 bg-amber-200/70 px-2 py-0.5 rounded">
                    {m.name} ({m.roleId?.name})
                  </span>
                ) : (
                  <button
                    onClick={() => setFocusedMember(m)}
                    className="text-amber-700 hover:text-amber-900 hover:underline"
                  >
                    {m.name}
                  </button>
                )}
              </span>
            ))}
          </div>

          <button
            onClick={() => setFocusedMember(null)}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Show Full Organization
          </button>
        </div>
      )}

      {/* Active Search Highlight Notification */}
      {searchQuery && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 shrink-0">
          <span>
            Highlighting <strong>{matchingIds.size}</strong> member{matchingIds.size === 1 ? '' : 's'} matching &quot;{searchQuery}&quot;
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-amber-700 hover:text-amber-900 font-semibold"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Main Viewport */}
      {viewMode === 'chart' ? (
        <div
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative w-full overflow-hidden bg-slate-50/80 rounded-2xl border border-slate-200 shadow-inner select-none transition-all cursor-grab active:cursor-grabbing ${
            isFullscreen ? 'flex-1 h-full min-h-[500px]' : 'min-h-[620px] h-[620px]'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#94a3b8 1px, #f8fafc 1px)',
            backgroundSize: '28px 28px',
            backgroundPosition: `${pan.x % 28}px ${pan.y % 28}px`,
          }}
        >
          {/* Navigation Helper Pill */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm text-[11px] font-semibold text-slate-600 flex items-center gap-2">
            <Move className="w-3 h-3 text-amber-500" />
            <span>Click &amp; drag canvas to pan</span>
            <span className="text-slate-300">•</span>
            <span>Scroll wheel / trackpad to scroll</span>
            <span className="text-slate-300">•</span>
            <span>Ctrl + scroll to zoom</span>
          </div>

          {/* Quick Recenter Floating Button */}
          {(pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
            <button
              onClick={handleResetView}
              className="absolute bottom-4 right-4 z-20 bg-white/95 hover:bg-white text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold transition flex items-center gap-1.5 hover:text-amber-600"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              Reset View
            </button>
          )}

          {/* 2D Infinite Pannable & Zoomable Canvas Content */}
          <div
            className="w-full h-full flex items-start justify-center pt-16"
            style={{
              pointerEvents: 'none',
            }}
          >
            <div
              ref={diagramContentRef}
              className="w-max h-max transition-transform origin-top flex flex-col items-center gap-14"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                pointerEvents: 'auto',
              }}
            >
              {activeRoots.map((rootNode) => (
                <OrgChartNode
                  key={rootNode._id}
                  node={rootNode}
                  isRoot={true}
                  hasParent={false}
                  isNodeOpen={isNodeOpen}
                  onToggle={toggleNode}
                  onSelectMember={setSelectedMember}
                  onFocusMember={setFocusedMember}
                  onEditMember={setEditingMember}
                  searchQuery={searchQuery}
                  selectedRoleId={selectedRole === 'ALL' ? '' : selectedRole}
                  focusedMemberId={focusedMember?._id}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Directory Tree View */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-y-auto max-h-[700px]">
          <div className="space-y-2">
            {activeRoots.map((rootNode) => (
              <DirectoryRow
                key={rootNode._id}
                node={rootNode}
                level={0}
                isLast={true}
                isNodeOpen={isNodeOpen}
                onToggle={toggleNode}
                onSelectMember={setSelectedMember}
                onFocusMember={setFocusedMember}
                onEditMember={setEditingMember}
                searchQuery={searchQuery}
                selectedRole={selectedRole}
              />
            ))}
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <OrgMemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onFocusMember={setFocusedMember}
          onEditMember={setEditingMember}
        />
      )}

      {/* Member & Team Edit Modal */}
      <UserEditModal
        userToEdit={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
      />
    </div>
  );
}

// Directory Tree Row Component with guide lines
function DirectoryRow({
  node,
  level = 0,
  isLast = false,
  isNodeOpen,
  onToggle,
  onSelectMember,
  onFocusMember,
  onEditMember,
  searchQuery,
  selectedRole,
}) {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.roleId?.isRoot || currentUser?.roleId?.rank === 0;
  const isSelf = currentUser?._id === node._id;
  const canManage = isAdmin || (!isSelf && node.roleId?.rank > (currentUser?.roleId?.rank ?? 999));

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isOpen = isNodeOpen(node._id);

  const rankBadgeColors = {
    0: 'bg-rose-100 text-rose-800 border-rose-200',
    1: 'bg-purple-100 text-purple-800 border-purple-200',
    2: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    3: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    5: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const badgeClass = rankBadgeColors[node.roleId?.rank] || 'bg-slate-100 text-slate-800 border-slate-200';

  const matchesSearch =
    searchQuery &&
    (node.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.phone?.includes(searchQuery) ||
      node.roleId?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const matchesRole = selectedRole === 'ALL' || node.roleId?.name === selectedRole;
  const isDimmed = (searchQuery && !matchesSearch) || (!matchesRole);

  return (
    <div className="flex flex-col">
      <div
        className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
          level === 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200 hover:border-slate-300'
        } ${matchesSearch ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/40' : ''} ${
          isDimmed ? 'opacity-40 grayscale-[30%]' : ''
        }`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Left Side: Expand button + Avatar + Details */}
        <div className="flex items-center gap-3 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => onToggle(node._id)}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 transition"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}

          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
            {node.name.charAt(0)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-brand-950 truncate">{node.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                {node.roleId?.name || 'User'}
              </span>
              {node.roleId?.isRoot && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white uppercase">
                  Root
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 text-slate-400" />
                {node.email}
              </span>
              {node.phone && (
                <span className="hidden sm:flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {node.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {hasChildren && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              {children.length} direct
            </span>
          )}

          {hasChildren && onFocusMember && (
            <button
              onClick={() => onFocusMember(node)}
              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition"
              title="Focus on this branch"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}

          {canManage && onEditMember && (
            <button
              onClick={() => onEditMember(node)}
              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition"
              title="Edit member & team"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onSelectMember(node)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="View details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Children Rows */}
      {hasChildren && isOpen && (
        <div className="relative border-l-2 border-slate-200/80 ml-6 pl-2 my-1 space-y-1">
          {children.map((child, idx) => (
            <DirectoryRow
              key={child._id}
              node={child}
              level={level + 1}
              isLast={idx === children.length - 1}
              isNodeOpen={isNodeOpen}
              onToggle={onToggle}
              onSelectMember={onSelectMember}
              onFocusMember={onFocusMember}
              onEditMember={onEditMember}
              searchQuery={searchQuery}
              selectedRole={selectedRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
