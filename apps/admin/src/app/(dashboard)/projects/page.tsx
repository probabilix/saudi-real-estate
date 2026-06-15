'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi } from '@/lib/api';
import {
  Layers, Plus, Search, MapPin, Loader2,
  ExternalLink, Download, Building2, ChevronDown, ChevronUp,
  CheckCircle, Clock, Construction, Edit, Trash2, Eye,
  Bed, Square, DollarSign
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

interface ProjectListItem {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  district: string | null;
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  expectedDelivery: string | null;
  totalUnits: number | null;
  brochureUrl: string | null;
  regaFalLicense: string | null;
  layoutCount: number;
  leadCount: number;
  createdAt: string;
}

interface LayoutItem {
  id: string;
  enTitle: string | null;
  arTitle: string;
  price: number;
  areaSqm: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  completionStatus: string | null;
  photos: string[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Accordion state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectLayouts, setProjectLayouts] = useState<Record<string, LayoutItem[]>>({});
  const [layoutsLoading, setLayoutsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadProjects() {
    setLoading(true);
    const result = await adminApi.getProjects();
    if (result.success && result.data) {
      setProjects(result.data as any);
    }
    setLoading(false);
  }

  const toggleLayouts = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      return;
    }
    setExpandedProjectId(projectId);
    if (!projectLayouts[projectId]) {
      setLayoutsLoading(prev => ({ ...prev, [projectId]: true }));
      try {
        const res = await adminApi.getProjectDetails(projectId);
        if (res.success && res.data?.layouts) {
          const layouts: LayoutItem[] = res.data.layouts.map((l: any) => ({
            id: l.id,
            enTitle: l.enTitle || null,
            arTitle: l.arTitle,
            price: l.price,
            areaSqm: l.areaSqm ? String(l.areaSqm) : null,
            bedrooms: l.bedrooms !== null ? Number(l.bedrooms) : null,
            bathrooms: l.bathrooms !== null ? Number(l.bathrooms) : null,
            completionStatus: l.completionStatus || null,
            photos: l.photos || []
          }));
          setProjectLayouts(prev => ({ ...prev, [projectId]: layouts }));
        }
      } catch (err) {
        console.error('Failed to load layouts:', err);
      } finally {
        setLayoutsLoading(prev => ({ ...prev, [projectId]: false }));
      }
    }
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAr.includes(searchQuery) ||
      p.city.toLowerCase().includes(q) ||
      (p.district?.toLowerCase().includes(q) ?? false);
    const matchStatus = statusFilter === 'ALL' || p.completionStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  function StatusBadge({ status }: { status: ProjectListItem['completionStatus'] }) {
    if (!status) return <span className="badge badge-gray">Unknown</span>;
    const cfg = {
      READY: { cls: 'badge-green', label: 'Ready', icon: <CheckCircle className="w-3 h-3" /> },
      OFF_PLAN: { cls: 'badge-yellow', label: 'Off-Plan', icon: <Clock className="w-3 h-3" /> },
      UNDER_CONSTRUCTION: { cls: 'badge-blue', label: 'Under Construction', icon: <Construction className="w-3 h-3" /> },
    }[status];
    return (
      <span className={clsx('badge', cfg.cls)}>
        {cfg.icon} {cfg.label}
      </span>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Development Projects" />

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white',
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        )}>
          {toast.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-surface-200 shadow-sm w-full md:w-80">
              <Search className="w-4 h-4 text-surface-400 shrink-0" />
              <input
                type="text"
                placeholder="Search projects..."
                className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-surface-900"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="admin-input py-2 w-auto min-w-[160px]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="READY">Ready</option>
              <option value="OFF_PLAN">Off-Plan</option>
              <option value="UNDER_CONSTRUCTION">Under Construction</option>
            </select>
          </div>

          <Link href="/projects/create" className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>

        {/* Projects Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th className="text-center">Layouts</th>
                  <th className="text-center">Leads</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading projects...</p>
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No projects found</p>
                      <p className="text-xs text-surface-400 mt-1">Create your first development project</p>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map(project => (
                    <React.Fragment key={project.id}>
                      <tr className="group">
                        {/* Project name */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-surface-900 truncate max-w-[200px]">{project.nameEn}</div>
                              <div className="text-xs text-surface-400 truncate max-w-[200px] font-arabic mt-0.5" dir="rtl">{project.nameAr}</div>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td>
                          <div className="flex items-center gap-1.5 text-xs text-surface-600">
                            <MapPin className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                            <span>{project.district ? `${project.district}, ` : ''}{project.city}</span>
                          </div>
                          {project.expectedDelivery && (
                            <div className="text-[10px] text-surface-400 mt-1">Delivery: {project.expectedDelivery}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge status={project.completionStatus} />
                        </td>

                        {/* Layouts count */}
                        <td className="text-center">
                          <button
                            onClick={() => toggleLayouts(project.id)}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors',
                              expandedProjectId === project.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface-100 text-surface-700 hover:bg-primary-50 hover:text-primary-700'
                            )}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {project.layoutCount ?? 0}
                            {expandedProjectId === project.id
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                            }
                          </button>
                        </td>

                        {/* Leads */}
                        <td className="text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-100 text-surface-700 text-xs font-bold">
                            {project.leadCount ?? 0}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {project.brochureUrl && (
                              <a
                                href={project.brochureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-ghost text-surface-400 hover:text-primary-600"
                                title="Download Brochure"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            <a
                              href={`${WEB_URL}/en/projects/${project.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-ghost text-surface-400 hover:text-primary-600"
                              title="View Public Page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <Link
                              href={`/projects/edit/${project.id}`}
                              className="btn-ghost text-surface-400 hover:text-primary-600"
                              title="Edit Project"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Layouts Accordion Row */}
                      {expandedProjectId === project.id && (
                        <tr>
                          <td colSpan={6} className="bg-surface-50/80 px-6 py-4 border-t border-surface-100">
                            {layoutsLoading[project.id] ? (
                              <div className="flex items-center gap-2 text-xs text-surface-500 py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                Loading floor plans...
                              </div>
                            ) : !projectLayouts[project.id] || projectLayouts[project.id].length === 0 ? (
                              <p className="text-xs text-surface-400 py-2">No layouts found for this project.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {projectLayouts[project.id].map(layout => (
                                  <div key={layout.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden flex flex-col shadow-sm">
                                    {layout.photos?.[0] ? (
                                      <img src={layout.photos[0]} alt="" className="w-full h-28 object-cover" />
                                    ) : (
                                      <div className="w-full h-28 bg-surface-100 flex items-center justify-center">
                                        <Building2 className="w-8 h-8 text-surface-300" />
                                      </div>
                                    )}
                                    <div className="p-3 flex-1 flex flex-col">
                                      <div className="text-xs font-bold text-surface-800 truncate mb-1">
                                        {layout.enTitle || layout.arTitle}
                                      </div>
                                      <div className="text-xs font-bold text-primary-600 mb-2">
                                        SAR {layout.price?.toLocaleString()}
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-surface-500 mt-auto">
                                        {layout.areaSqm && (
                                          <span className="flex items-center gap-1">
                                            <Square className="w-3 h-3" />
                                            {Number(layout.areaSqm).toFixed(0)} sqm
                                          </span>
                                        )}
                                        {layout.bedrooms !== null && (
                                          <span className="flex items-center gap-1">
                                            <Bed className="w-3 h-3" />
                                            {layout.bedrooms} BR
                                          </span>
                                        )}
                                      </div>
                                      <a
                                        href={`${WEB_URL}/en/listings/${layout.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 btn-ghost text-[10px] py-1 justify-center w-full text-center border border-surface-200 rounded-lg"
                                      >
                                        <Eye className="w-3 h-3" /> View Listing
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredProjects.length > 0 && (
            <div className="p-4 bg-surface-50 border-t border-surface-200">
              <div className="text-xs text-surface-500">
                Showing <b>{filteredProjects.length}</b> of <b>{projects.length}</b> projects
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
