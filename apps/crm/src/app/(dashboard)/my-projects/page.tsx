'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { crmApi } from '@/lib/api';
import {
  Layers, Plus, Search, MapPin, Loader2, Star, Eye, Edit, Trash2,
  Clock, CheckCircle, AlertCircle, Building2, EyeOff, Sparkles, CreditCard,
  ChevronDown, ChevronUp, ExternalLink, Download, X, Bed, Square,
  ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import clsx from 'clsx';
import PropertyAnalyticsModal from '@/components/PropertyAnalyticsModal';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

interface CrmProject {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  district: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'FLAGGED' | 'REMOVED';
  completionStatus: 'READY' | 'OFF_PLAN' | 'UNDER_CONSTRUCTION' | null;
  expectedDelivery: string | null;
  totalUnits: number | null;
  brochureUrl: string | null;
  layoutCount: number;
  viewsCount?: number;
  createdAt: string;
  isFeatured?: boolean;
  featuredUntil?: string | null;
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

export default function MyProjectsPage() {
  const { user } = useCrmAuth();
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'FLAGGED' | 'DRAFT'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Accordion details
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectLayouts, setProjectLayouts] = useState<Record<string, LayoutItem[]>>({});
  const [layoutsLoading, setLayoutsLoading] = useState<Record<string, boolean>>({});

  // Featuring Modal state
  const [featureModal, setFeatureModal] = useState<{ isOpen: boolean; project: CrmProject | null }>({
    isOpen: false,
    project: null,
  });
  const [featuring, setFeaturing] = useState(false);
  const [selectedDays, setSelectedDays] = useState<7 | 30>(7);
  const [featureCost7, setFeatureCost7] = useState(15);
  const [featureCost30, setFeatureCost30] = useState(40);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Inventory drawer state
  const [inventoryDrawerOpen, setInventoryDrawerOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<LayoutItem | null>(null);
  const [selectedProjectForLayout, setSelectedProjectForLayout] = useState<CrmProject | null>(null);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [unitForm, setUnitForm] = useState({
    unitNumbers: '',
    floor: '',
    type: '',
    status: 'AVAILABLE',
    price: '',
  });

  // Export Matrix state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);
  const [exportLanguage, setExportLanguage] = useState<'en' | 'ar'>('ar');
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  // Views analytics modal state
  const [analyticsModal, setAnalyticsModal] = useState<{
    isOpen: boolean;
    propertyId: string;
    propertyTitle: string;
    shortId?: string;
    totalViews: number;
  }>({
    isOpen: false,
    propertyId: '',
    propertyTitle: '',
    totalViews: 0,
  });

  useEffect(() => {
    fetchProjects();
    fetchFeatureCost();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('crmToken') || localStorage.getItem('sre_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/listings/projects/my-projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProjects(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch developer projects:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFeatureCost() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${apiBase}/system/settings`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.project_feature_cost_7_days) {
          setFeatureCost7(parseInt(json.data.project_feature_cost_7_days, 10) || 15);
        }
        if (json.data.project_feature_cost_credits) {
          setFeatureCost30(parseInt(json.data.project_feature_cost_credits, 10) || 40);
        }
      }
    } catch (e) {
      console.error('Failed to fetch feature cost setting:', e);
    }
  }

  const loadLayouts = async (projectId: string) => {
    if (projectLayouts[projectId]) return;
    setLayoutsLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('crmToken') || localStorage.getItem('sre_token') || localStorage.getItem('token');
      
      // Fetch matching project details (includes all layouts including pending ones)
      const res = await fetch(`${apiBase}/listings/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success && json.data?.layouts) {
        const layouts: LayoutItem[] = json.data.layouts.map((l: any) => ({
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
  };

  const toggleLayouts = (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
    } else {
      setExpandedProjectId(projectId);
      loadLayouts(projectId);
    }
  };

  const handleToggleDraft = async (project: CrmProject) => {
    const targetStatus = project.status === 'DRAFT' ? 'FLAGGED' : 'DRAFT';
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('crmToken') || localStorage.getItem('sre_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/listings/projects/${project.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const json = await res.json();
      if (json.success) {
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: targetStatus } : p));
        setToast({
          message: targetStatus === 'DRAFT' ? 'Project hidden (marked as draft).' : 'Project resubmitted for approval.',
          type: 'success'
        });
      } else {
        setToast({ message: json.message || 'Failed to update project visibility.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating status.', type: 'error' });
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setConfirmModal({
      title: 'Delete Project Listing',
      message: 'Are you sure you want to permanently delete this project listing and all of its associated floor plans? This action cannot be undone.',
      onConfirm: async () => {
        setDeletingId(projectId);
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
          const token = localStorage.getItem('crmToken') || localStorage.getItem('sre_token') || localStorage.getItem('token');
          const res = await fetch(`${apiBase}/listings/projects/${projectId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'REMOVED' })
          });
          const json = await res.json();
          if (json.success) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setToast({ message: 'Project listing deleted successfully.', type: 'success' });
          } else {
            setToast({ message: json.message || 'Failed to delete project.', type: 'error' });
          }
        } catch (err: any) {
          setToast({ message: err.message || 'Error deleting project.', type: 'error' });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleConfirmFeature = async () => {
    if (!featureModal.project) return;
    setFeaturing(true);
    const cost = selectedDays === 7 ? featureCost7 : featureCost30;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('crmToken') || localStorage.getItem('sre_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/listings/projects/${featureModal.project.id}/feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ days: selectedDays })
      });
      const json = await res.json();
      if (json.success) {
        setProjects(prev => prev.map(p => p.id === featureModal.project!.id ? { 
          ...p, 
          isFeatured: true,
          featuredUntil: json.data?.featuredUntil || null
        } : p));
        setToast({ message: `Successfully featured project! ${cost} credits deducted.`, type: 'success' });
        setFeatureModal({ isOpen: false, project: null });
      } else {
        setToast({ message: json.message || 'Failed to feature project.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error featuring project.', type: 'error' });
    } finally {
      setFeaturing(false);
    }
  };

  // ── Inventory unit management ──
  const inferFloor = (unitStr: string): number => {
    const clean = unitStr.trim().toUpperCase();
    if (clean.startsWith('G')) return 0;
    if (clean.startsWith('B')) {
      const match = clean.match(/^B(\d+)/);
      if (match) return -parseInt(match[1], 10);
      return -1;
    }
    if (clean.startsWith('M')) return 1;

    const digitsMatch = clean.match(/\d+/);
    if (!digitsMatch) return 1;

    const numStr = digitsMatch[0];
    const numVal = parseInt(numStr, 10);
    if (numStr.length >= 3) {
      return Math.floor(numVal / 100);
    }
    return 1;
  };

  const handleManageInventory = async (layout: LayoutItem, project: CrmProject) => {
    setSelectedLayout(layout);
    setSelectedProjectForLayout(project);
    setInventoryDrawerOpen(true);
    setLoadingUnits(true);

    let defaultBhk = '';
    if (layout.bedrooms) {
      defaultBhk = `${layout.bedrooms}BHK`;
    }

    setUnitForm({
      unitNumbers: '',
      floor: '',
      type: defaultBhk,
      status: 'AVAILABLE',
      price: '',
    });

    await loadUnits(layout.id);
  };

  const loadUnits = async (layoutId: string) => {
    setLoadingUnits(true);
    try {
      const res = await crmApi.getListingUnits(layoutId);
      if (res.success && res.data) {
        setUnitsList(res.data);
      }
    } catch (e) {
      console.error('Failed to load layout units:', e);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleAddUnits = async () => {
    if (!selectedLayout) return;
    if (!unitForm.unitNumbers.trim()) {
      setToast({ message: 'Unit numbers are required.', type: 'error' });
      return;
    }

    const isFloorEmpty = !unitForm.floor.trim();
    let explicitFloorNum = 0;
    if (!isFloorEmpty) {
      explicitFloorNum = parseInt(unitForm.floor, 10);
      if (isNaN(explicitFloorNum)) {
        setToast({ message: 'Floor must be a valid number.', type: 'error' });
        return;
      }
    }

    const priceOverride = unitForm.price ? parseInt(unitForm.price, 10) : undefined;
    const unitsToAdd: Array<{ unitNumber: string; floor: number; type: string; status: string; price?: number }> = [];
    const rawInput = unitForm.unitNumbers.trim();

    if (/^\d+-\d+$/.test(rawInput)) {
      const [start, end] = rawInput.split('-').map(Number);
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          const unitNoStr = String(i);
          const floorVal = isFloorEmpty ? inferFloor(unitNoStr) : explicitFloorNum;
          unitsToAdd.push({
            unitNumber: unitNoStr,
            floor: floorVal,
            type: unitForm.type,
            status: unitForm.status,
            price: priceOverride,
          });
        }
      } else {
        setToast({ message: 'Invalid unit range.', type: 'error' });
        return;
      }
    } else {
      const parts = rawInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
      parts.forEach(p => {
        const floorVal = isFloorEmpty ? inferFloor(p) : explicitFloorNum;
        unitsToAdd.push({
          unitNumber: p,
          floor: floorVal,
          type: unitForm.type,
          status: unitForm.status,
          price: priceOverride,
        });
      });
    }

    if (unitsToAdd.length === 0) {
      setToast({ message: 'No valid units specified.', type: 'error' });
      return;
    }

    setLoadingUnits(true);
    try {
      const res = await crmApi.addListingUnits(selectedLayout.id, unitsToAdd);
      if (res.success) {
        setToast({ message: `Successfully added ${unitsToAdd.length} units to inventory!`, type: 'success' });
        setUnitForm(prev => ({ ...prev, unitNumbers: '', floor: '' }));
        await loadUnits(selectedLayout.id);
      } else {
        setToast({ message: res.error || 'Failed to add units.', type: 'error' });
      }
    } catch (e: any) {
      console.error(e);
      setToast({ message: e.message || 'Failed to add units.', type: 'error' });
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleUpdateUnitStatus = async (unitId: string, newStatus: string) => {
    if (!selectedLayout) return;
    try {
      const res = await crmApi.updateListingUnit(selectedLayout.id, unitId, { status: newStatus });
      if (res.success) {
        setUnitsList(prev => prev.map(u => u.id === unitId ? { ...u, status: newStatus } : u));
      }
    } catch (e) {
      console.error('Failed to update unit status:', e);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!selectedLayout) return;
    try {
      const res = await crmApi.deleteListingUnit(selectedLayout.id, unitId);
      if (res.success) {
        setUnitsList(prev => prev.filter(u => u.id !== unitId));
      }
    } catch (e) {
      console.error('Failed to delete unit:', e);
    }
  };

  const handleExportPDF = async (projectId: string, lang: 'en' | 'ar') => {
    setExportingProjectId(projectId);
    let iframe: HTMLIFrameElement | null = null;

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const detailsRes = await crmApi.getProjectDetails(projectId);
      if (!detailsRes.success || !detailsRes.data) {
        setToast({ message: 'Failed to load project layouts for PDF generation.', type: 'error' });
        return;
      }

      const layouts = detailsRes.data.layouts as any[];
      if (layouts.length === 0) {
        setToast({ message: 'This project has no layouts defined.', type: 'error' });
        return;
      }

      // ── Use preloaded units ──
      const projectUnits = (detailsRes.data as any).units || [];
      const allUnits: any[] = [];
      projectUnits.forEach((u: any) => {
        const layout = layouts.find(l => l.id === u.listingId);
        if (layout) {
          allUnits.push({
            ...u,
            layoutId: layout.id,
            layoutEn: layout.enTitle || layout.arTitle,
            layoutAr: layout.arTitle,
            layoutPrice: layout.price,
            layoutAreaSqm: layout.areaSqm,
          });
        }
      });

      if (allUnits.length === 0) {
        setToast({ message: 'No units found. Please add inventory first.', type: 'error' });
        return;
      }

      // ── Load html2canvas ──
      if (!(window as any).html2canvas) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        await new Promise<void>(resolve => { s.onload = () => resolve(); document.head.appendChild(s); });
      }
      // ── Load jsPDF ──
      if (!(window as any).jspdf) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        await new Promise<void>(resolve => { s.onload = () => resolve(); document.head.appendChild(s); });
      }
      await new Promise(r => setTimeout(r, 300));

      // ── Group by floor, sort descending ──
      const unitsByFloor: Record<number, any[]> = {};
      allUnits.forEach(u => {
        if (!unitsByFloor[u.floor]) unitsByFloor[u.floor] = [];
        unitsByFloor[u.floor].push(u);
      });
      const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

      // ── Chunk layouts into groups of 4 ──
      const chunks: any[][] = [];
      for (let i = 0; i < layouts.length; i += 4) chunks.push(layouts.slice(i, i + 4));

      const isAr = lang === 'ar';

      const floorLabel = (f: number): string => {
        if (f === 0) return isAr ? 'الدور الأرضي' : 'Ground Floor';
        if (f === -1) return isAr ? 'البدروم' : 'Basement';
        if (f < -1) return isAr ? `بدروم ${Math.abs(f)}` : `Basement ${Math.abs(f)}`;
        const ar = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
          'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
        const en = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth',
          'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
        return isAr
          ? (f <= 10 ? `الدور ${ar[f]}` : `الدور ${f}`)
          : (f <= 10 ? `${en[f]} Floor` : `Floor ${f}`);
      };

      type SC = { bg: string; bd: string; tx: string; lbl: string };
      const statusMap: Record<string, SC> = {
        AVAILABLE: { bg: '#eff6ff', bd: '#93c5fd', tx: '#1e40af', lbl: isAr ? 'متاح' : 'Available' },
        RESERVED: { bg: '#fff7ed', bd: '#fed7aa', tx: '#c2410c', lbl: isAr ? 'محجوز' : 'Reserved' },
        SOLD: { bg: '#fef2f2', bd: '#fca5a5', tx: '#991b1b', lbl: isAr ? 'مباع' : 'Sold' },
      };

      // ── Page dimensions ──
      const PAGE_W = 1122;
      const PAGE_H = 794;
      const PAD = 18;
      const INNER_W = PAGE_W - PAD * 2;
      const FLOOR_COL_W = 124;
      const HEADER_H = 130;
      const THEAD_H = 50;
      const FOOTER_H = 30;
      const USABLE_H = PAGE_H - PAD * 2 - HEADER_H - THEAD_H - FOOTER_H;

      const EN_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      const AR_FONT_STACK = "'Segoe UI', Tahoma, 'Geeza Pro', 'Arial', sans-serif";

      const estimateRowH = (floor: number, chunk: any[]): number => {
        let maxBadges = 0;
        chunk.forEach(l => {
          const count = (unitsByFloor[floor] || []).filter(u => u.layoutId === l.id).length;
          if (count > maxBadges) maxBadges = count;
        });
        if (maxBadges === 0) return 44;
        return maxBadges * 64 + 16;
      };

      const splitFloorsIntoPages = (chunk: any[]): number[][] => {
        const pages: number[][] = [];
        let currentPage: number[] = [];
        let usedH = 0;

        for (const floor of sortedFloors) {
          const rowH = estimateRowH(floor, chunk);
          if (currentPage.length > 0 && usedH + rowH > USABLE_H) {
            pages.push(currentPage);
            currentPage = [floor];
            usedH = rowH;
          } else {
            currentPage.push(floor);
            usedH += rowH;
          }
        }
        if (currentPage.length > 0) pages.push(currentPage);
        return pages;
      };

      const buildSheetHtml = (
        chunk: any[],
        floorsOnThisPage: number[],
        chunkIdx: number,
        totalChunks: number,
        pageIdx: number,
        totalPages: number
      ): string => {
        const nCols = chunk.length;
        const dataColW = Math.floor((INNER_W - FLOOR_COL_W) / nCols);

        const av = allUnits.filter(u => u.status === 'AVAILABLE' && chunk.some(l => l.id === u.layoutId)).length;
        const rv = allUnits.filter(u => u.status === 'RESERVED' && chunk.some(l => l.id === u.layoutId)).length;
        const sd = allUnits.filter(u => u.status === 'SOLD' && chunk.some(l => l.id === u.layoutId)).length;

        const groupLabel = totalChunks > 1
          ? (isAr ? `مجموعة ${chunkIdx + 1} من ${totalChunks}` : `Group ${chunkIdx + 1} of ${totalChunks}`)
          : '';
        const pageLabel = totalPages > 1
          ? (isAr ? ` — صفحة ${pageIdx + 1} من ${totalPages}` : ` — Page ${pageIdx + 1} of ${totalPages}`)
          : '';

        const thFloor = `<th style="width:${FLOOR_COL_W}px;min-width:${FLOOR_COL_W}px;background:#0f2d24;color:#6ee7b7;font-size:10px;font-weight:800;text-align:center;padding:10px 6px;letter-spacing:0.04em;border-right:2px solid #1a3d30;">${isAr ? 'الدور' : 'FLOOR'}</th>`;

        const thCols = chunk.map(l => {
          const price = l.price ? (isAr ? `${Number(l.price).toLocaleString()} ريال` : `SAR ${Number(l.price).toLocaleString()}`) : '';
          const area = l.areaSqm ? `${Number(l.areaSqm).toFixed(0)} ${isAr ? 'م²' : 'sqm'}` : '';
          return `<th style="width:${dataColW}px;min-width:${dataColW}px;background:#0f2d24;color:#f0fdf4;font-size:11px;text-align:center;padding:10px 8px;border-right:1px solid #1a3d30;word-wrap:break-word;vertical-align:middle;">
            <div style="font-weight:800;color:#5eead4;font-size:11px;line-height:1.35;margin-bottom:3px;word-break:break-word;">${isAr ? l.arTitle : (l.enTitle || l.arTitle)}</div>
            ${price ? `<div style="font-size:9px;color:#a7f3d0;font-weight:700;margin-top:2px;">${price}</div>` : ''}
            ${area ? `<div style="font-size:8px;color:#6ee7b7;opacity:0.85;margin-top:1px;">${area}</div>` : ''}
          </th>`;
        }).join('');

        const bodyRows = floorsOnThisPage.map((floor, fi) => {
          const isEven = fi % 2 === 0;
          const rowBg = isEven ? '#ffffff' : '#f8fafc';
          const tdFloor = `<td style="width:${FLOOR_COL_W}px;min-width:${FLOOR_COL_W}px;background:#f1f5f9;font-weight:800;font-size:10px;color:#0f2d24;text-align:center;padding:10px 6px;border-bottom:1px solid #e2e8f0;border-right:2px solid #0f2d24;vertical-align:middle;white-space:nowrap;">${floorLabel(floor)}</td>`;

          const tdCols = chunk.map(l => {
            const units = (unitsByFloor[floor] || [])
              .filter(u => u.layoutId === l.id)
              .sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true }));

            if (units.length === 0) {
              return `<td style="width:${dataColW}px;background:${rowBg};border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;padding:8px;color:#d1d5db;font-size:18px;vertical-align:middle;">—</td>`;
            }

            const badges = units.map(u => {
              const s: SC = statusMap[u.status] ?? statusMap.AVAILABLE;
              return `<div style="background:${s.bg};border:1.5px solid ${s.bd};color:${s.tx};border-radius:7px;padding:5px 8px;margin:3px auto;text-align:center;font-weight:800;width:90%;max-width:110px;">
                <div style="font-size:11px;font-weight:900;letter-spacing:-0.3px;">${isAr ? 'و' : '#'}${u.unitNumber}</div>
                <div style="font-size:8px;font-weight:700;margin-top:1px;opacity:0.9;">${s.lbl}</div>
                ${u.type ? `<div style="font-size:7px;opacity:0.65;margin-top:1px;">${u.type}</div>` : ''}
              </div>`;
            }).join('');

            return `<td style="width:${dataColW}px;background:${rowBg};border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:6px;vertical-align:middle;text-align:center;">${badges}</td>`;
          }).join('');

          return `<tr>${tdFloor}${tdCols}</tr>`;
        }).join('');

        return `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isAr ? AR_FONT_STACK : EN_FONT_STACK};
      direction: ${isAr ? 'rtl' : 'ltr'};
      background: #fff;
      width: ${PAGE_W}px;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
  </style>
</head>
<body>
<div style="width:${PAGE_W}px;box-sizing:border-box;padding:${PAD}px;background:#fff;direction:${isAr ? 'rtl' : 'ltr'};">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;margin-bottom:10px;border-bottom:3px solid #0f2d24;">
    <div>
      <div style="display:flex;align-items:baseline;gap:7px;direction:ltr;">
        <span style="font-size:21px;font-weight:900;color:#0f2d24;line-height:1;letter-spacing:-0.5px;" dir="rtl">تمليك</span>
        <span style="font-size:14px;font-weight:700;color:#0d9488;letter-spacing:0.03em;line-height:1;">TAMLEEQ</span>
      </div>
      <div style="font-size:9px;color:#64748b;font-weight:600;margin-top:4px;">${isAr ? 'تقرير مخزون الوحدات — مخطط الطوابق' : 'Unit Inventory Report — Floor Plan Matrix'}</div>
    </div>
    <div style="text-align:${isAr ? 'left' : 'right'};">
      <div style="font-size:16px;font-weight:800;color:#0d9488;">${project.nameEn}</div>
      <div style="font-size:10px;color:#64748b;font-weight:600;margin-top:2px;">📍 ${project.city}${project.district ? ` • ${project.district}` : ''}</div>
      ${(groupLabel || pageLabel) ? `<div style="font-size:8px;color:#94a3b8;margin-top:3px;font-weight:600;">${groupLabel}${pageLabel}</div>` : ''}
    </div>
  </div>
  <!-- Legend -->
  <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;border:1px solid #e8edf5;border-radius:8px;padding:7px 12px;margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:5px;font-size:9px;line-height:11px;font-weight:800;color:#1e40af;"><div style="width:11px;height:11px;background:#eff6ff;border:2px solid #93c5fd;border-radius:3px;flex-shrink:0;"></div>${isAr ? 'متاح' : 'Available'} (${av})</div>
    <div style="display:flex;align-items:center;gap:5px;font-size:9px;line-height:11px;font-weight:800;color:#c2410c;"><div style="width:11px;height:11px;background:#fff7ed;border:2px solid #fed7aa;border-radius:3px;flex-shrink:0;"></div>${isAr ? 'محجوز' : 'Reserved'} (${rv})</div>
    <div style="display:flex;align-items:center;gap:5px;font-size:9px;line-height:11px;font-weight:800;color:#991b1b;"><div style="width:11px;height:11px;background:#fef2f2;border:2px solid #fca5a5;border-radius:3px;flex-shrink:0;"></div>${isAr ? 'مباع' : 'Sold'} (${sd})</div>
    <div style="margin-${isAr ? 'right' : 'left'}:auto;font-size:9px;color:#94a3b8;font-weight:700;">${isAr ? `الإجمالي: ${av + rv + sd} وحدة` : `Total: ${av + rv + sd} units`}</div>
  </div>
  <!-- Table -->
  <table style="width:${INNER_W}px;table-layout:fixed;border-collapse:collapse;border:2px solid #0f2d24;font-size:11px;">
    <thead><tr>${thFloor}${thCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:7px;border-top:1px solid #e2e8f0;font-size:7px;color:#94a3b8;font-weight:600;">
    <span>${isAr ? 'تم التصدير: ' : 'Exported: '}${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    <span>${isAr ? 'نظام تمليك الإداري © ' : 'Tamleeq Admin System © '}${new Date().getFullYear()}</span>
  </div>
</div>
</body>
</html>`;
      };

      const PDF_W_MM = 297;
      const PDF_H_MM = 210;

      // @ts-ignore
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const filename = `${project.nameEn.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_inventory_${lang}.pdf`;

      let isFirstPdfPage = true;

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const floorPages = splitFloorsIntoPages(chunk);

        for (let pi = 0; pi < floorPages.length; pi++) {
          const floorsOnThisPage = floorPages[pi];
          const sheetHtml = buildSheetHtml(chunk, floorsOnThisPage, ci, chunks.length, pi, floorPages.length);

          iframe = document.createElement('iframe');
          iframe.style.cssText = `position:fixed;left:-${PAGE_W + 200}px;top:0;width:${PAGE_W}px;height:${PAGE_H + 200}px;border:none;visibility:hidden;`;
          document.body.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(sheetHtml);
            iframeDoc.close();
          }

          const fontsReady = (iframeDoc as any)?.fonts?.ready;
          if (fontsReady) {
            await Promise.race([
              fontsReady,
              new Promise(r => setTimeout(r, 3000)),
            ]);
          }
          await new Promise(r => setTimeout(r, 300));

          // @ts-ignore
          const canvas = await html2canvas(iframeDoc!.body, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: PAGE_W,
            height: PAGE_H,
            windowWidth: PAGE_W,
            windowHeight: PAGE_H,
            backgroundColor: '#ffffff',
            letterRendering: true,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.98);

          if (!isFirstPdfPage) doc.addPage();
          isFirstPdfPage = false;

          doc.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM);

          if (iframe && document.body.contains(iframe)) document.body.removeChild(iframe);
          iframe = null;
        }
      }

      doc.save(filename);

    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setToast({ message: 'Error generating PDF. Please try again.', type: 'error' });
    } finally {
      if (iframe && document.body.contains(iframe)) document.body.removeChild(iframe);
      setExportingProjectId(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchQuery || 
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.nameAr.includes(searchQuery) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusTab === 'ALL' || p.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const totalCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length;
  const pendingCount = projects.filter(p => p.status === 'FLAGGED').length;
  const draftCount = projects.filter(p => p.status === 'DRAFT').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 w-full">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
          toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border border-emerald-700' : 'bg-red-900 text-red-100 border border-red-700'
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[10px] font-bold uppercase tracking-wider">
              Developer Workspace
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">My Real Estate Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your compound and residential development bulk listings</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/billing" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all">
            <CreditCard className="w-4 h-4 text-primary-400" />
            <span>Balance: <strong className="text-white font-extrabold">{user?.creditsBalance ?? 0}</strong> Credits</span>
          </Link>
          <Link href="/my-projects/create" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all">
            <Plus className="w-4.5 h-4.5" />
            <span>List New Project</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase">Total Projects</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-emerald-600 text-xs font-bold uppercase">Active & Approved</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-amber-600 text-xs font-bold uppercase">Pending Approval</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase">Drafts / Hidden</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{draftCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['ALL', 'ACTIVE', 'FLAGGED', 'DRAFT'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                statusTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab === 'ALL' && 'All'}
              {tab === 'ACTIVE' && `Active (${activeCount})`}
              {tab === 'FLAGGED' && `Pending Approval (${pendingCount})`}
              {tab === 'DRAFT' && `Drafts (${draftCount})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search my projects..."
            className="bg-transparent border-none outline-none text-xs text-slate-900 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-slate-500 text-xs mt-2">Loading your projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusTab !== 'ALL'
              ? 'No projects match your current filters. Try resetting your search.'
              : 'You have not listed any projects yet. Click below to create your first bulk project listing.'}
          </p>
          {!searchQuery && statusTab === 'ALL' && (
            <Link href="/my-projects/create" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all">
              <Plus className="w-4 h-4" />
              List First Project
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                  <th className="py-4 px-5">Project</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-center">Layouts</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {filteredProjects.map(project => (
                  <React.Fragment key={project.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      {/* Project info & Views chart trigger */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate max-w-[200px]">{project.nameEn}</span>
                              {project.isFeatured && (
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px] font-arabic mt-0.5" dir="rtl">{project.nameAr}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <button
                                onClick={() => setAnalyticsModal({
                                  isOpen: true,
                                  propertyId: project.id,
                                  propertyTitle: project.nameEn || project.nameAr || 'Project',
                                  totalViews: project.viewsCount || 0
                                })}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded-full transition-all border border-primary-100"
                                title="Click to view view stats chart"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>Views: {project.viewsCount || 0}</span>
                              </button>

                              {project.isFeatured && project.featuredUntil && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full transition-all">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-550" />
                                  <span>Expires: {new Date(project.featuredUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-5 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{project.district ? `${project.district}, ` : ''}{project.city}</span>
                        </div>
                        {project.expectedDelivery && (
                          <div className="text-[10px] text-slate-400 mt-1">Delivery: {project.expectedDelivery}</div>
                        )}
                      </td>

                      {/* Statuses */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          {project.status === 'FLAGGED' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Approval
                            </span>
                          )}
                          {project.status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          )}
                          {project.status === 'DRAFT' && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <EyeOff className="w-3 h-3 text-slate-500" />
                              Draft / Hidden
                            </span>
                          )}
                          {project.completionStatus && (
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              project.completionStatus === 'READY' ? 'bg-green-50 border-green-200 text-green-700' :
                                project.completionStatus === 'OFF_PLAN' ? 'bg-yellow-50 border-yellow-250 text-yellow-800' :
                                  'bg-blue-50 border-blue-200 text-blue-750'
                            )}>
                              {project.completionStatus === 'READY' ? 'Ready' : project.completionStatus === 'OFF_PLAN' ? 'Off-Plan' : 'Under Construction'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Layouts accordion trigger */}
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => toggleLayouts(project.id)}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border',
                            expandedProjectId === project.id
                              ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{project.layoutCount}</span>
                          {expandedProjectId === project.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Feature Upgrade */}
                          {project.status === 'ACTIVE' && (
                            <button
                              onClick={() => setFeatureModal({ isOpen: true, project })}
                              className={clsx(
                                "inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all border",
                                project.isFeatured 
                                  ? "bg-amber-100/50 hover:bg-amber-100 border-amber-300 text-amber-800"
                                  : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                              )}
                            >
                              <Sparkles className="w-3 h-3 text-amber-550" />
                              {project.isFeatured ? 'Extend Promotion' : 'Feature Project'}
                            </button>
                          )}

                          {/* Brochure Download */}
                          {project.brochureUrl && (
                            <a
                              href={project.brochureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-primary-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all"
                              title="Download Project Brochure"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          {/* Toggle Draft/Hide */}
                          {(project.status === 'ACTIVE' || project.status === 'DRAFT') && (
                            <button
                              onClick={() => handleToggleDraft(project)}
                              className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                            >
                              {project.status === 'DRAFT' ? 'Unhide' : 'Hide'}
                            </button>
                          )}

                          {/* Public Link */}
                          <a
                            href={`${WEB_URL}/en/projects/${project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-primary-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all"
                            title="View Public Preview"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Edit Link */}
                          <Link
                            href={`/my-projects/edit/${project.id}`}
                            className="p-1.5 text-slate-400 hover:text-primary-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all"
                            title="Edit Project"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Permanent Delete */}
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={deletingId === project.id}
                            className="p-1.5 text-slate-400 hover:text-red-650 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete Project"
                          >
                            {deletingId === project.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Layouts accordion expanded row */}
                    {expandedProjectId === project.id && (
                      <tr className="bg-slate-50/70 border-t border-slate-100">
                        <td colSpan={5} className="p-5">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Floor Plans & Layout Models
                              </h4>
                              <button
                                onClick={() => {
                                  setExportProjectId(project.id);
                                  setExportModalOpen(true);
                                }}
                                disabled={exportingProjectId === project.id}
                                className="btn-secondary py-1.5 px-3 text-[11px] font-bold flex items-center gap-1.5 rounded-lg border border-slate-200"
                              >
                                {exportingProjectId === project.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                Export Inventory Matrix PDF
                              </button>
                            </div>

                            {layoutsLoading[project.id] ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
                                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                <span>Loading layouts...</span>
                              </div>
                            ) : !projectLayouts[project.id] || projectLayouts[project.id].length === 0 ? (
                              <p className="text-xs text-slate-400 py-2 italic">No layouts found for this project.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {projectLayouts[project.id].map(layout => (
                                  <div key={layout.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                                    {layout.photos?.[0] ? (
                                      <img src={layout.photos[0]} alt="" className="w-full h-28 object-cover" />
                                    ) : (
                                      <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
                                        <Building2 className="w-8 h-8 text-slate-300" />
                                      </div>
                                    )}
                                    <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 truncate" title={layout.enTitle || layout.arTitle}>
                                          {layout.enTitle || layout.arTitle}
                                        </div>
                                        <div className="text-xs font-black text-primary-600 mt-1">
                                          SAR {layout.price?.toLocaleString()}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t border-slate-100 pt-2 flex-wrap">
                                        {layout.areaSqm && (
                                          <span className="flex items-center gap-1">
                                            <Square className="w-3 h-3 text-slate-400" />
                                            {Number(layout.areaSqm).toFixed(0)} sqm
                                          </span>
                                        )}
                                        {layout.bedrooms !== null && (
                                          <span className="flex items-center gap-1">
                                            <Bed className="w-3 h-3 text-slate-400" />
                                            {layout.bedrooms} BR
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex gap-2 pt-1.5">
                                        <a
                                          href={`${WEB_URL}/en/listings/${layout.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] py-1 flex-1 justify-center text-center border border-slate-200 rounded-lg hover:bg-slate-50 font-bold flex items-center justify-center gap-1"
                                        >
                                          <Eye className="w-3 h-3" /> View
                                        </a>
                                        <button
                                          onClick={() => handleManageInventory(layout, project)}
                                          className="text-[10px] py-1 px-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg flex-1 flex items-center justify-center gap-1 font-bold shadow-sm"
                                          title="Manage Unit Inventory"
                                        >
                                          <Building2 className="w-3.5 h-3.5" /> Inventory
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inventory Side Drawer ── */}
      {inventoryDrawerOpen && selectedLayout && selectedProjectForLayout && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setInventoryDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 animate-in slide-in-from-right">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <span>Inventory Controller</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium truncate max-w-[400px]">
                  {selectedLayout.enTitle || selectedLayout.arTitle}
                </p>
              </div>
              <button
                onClick={() => setInventoryDrawerOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Project Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary-600" />
                  Parent Project
                </h4>
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between mt-2 shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{selectedProjectForLayout.nameEn}</div>
                    <div className="text-xs text-slate-400 font-arabic mt-0.5" dir="rtl">{selectedProjectForLayout.nameAr}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {selectedProjectForLayout.city}{selectedProjectForLayout.district ? ` • ${selectedProjectForLayout.district}` : ''}
                    </div>
                  </div>
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">Linked</span>
                </div>
              </div>

              {/* Add physical units form */}
              <div className="bg-white border border-slate-250/80 rounded-2xl p-4 space-y-4 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Add Units to Inventory
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Unit Number(s)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="e.g. 201 OR 201-205 OR 201, 202"
                      value={unitForm.unitNumbers}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, unitNumbers: e.target.value }))}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block leading-normal">
                      Use dashes for range, commas for list.
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Floor Number (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Auto-detect or e.g. 2"
                      value={unitForm.floor}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, floor: e.target.value }))}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block leading-normal">
                      Leave blank to auto-detect floor from numbers.
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">BHK Type</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="e.g. 2BHK"
                      value={unitForm.type}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Initial Status</label>
                    <select
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      value={unitForm.status}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="SOLD">Sold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Price Override (SAR)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Default Price"
                      value={unitForm.price}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddUnits}
                  disabled={loadingUnits}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 text-xs rounded-xl w-full flex items-center justify-center gap-1.5 transition-all shadow"
                >
                  {loadingUnits ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding units...</>
                  ) : 'Add Unit(s) to Inventory'}
                </button>
              </div>

              {/* Physical unit matrix list */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Physical Unit Matrix
                </h4>
                {loadingUnits ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <span>Loading unit list...</span>
                  </div>
                ) : unitsList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">No units found. Add units above to track inventory availability.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 divide-y divide-slate-150 shadow-sm space-y-3">
                    {(() => {
                      const unitsByFloor = unitsList.reduce((acc: Record<number, any[]>, unit) => {
                        if (!acc[unit.floor]) acc[unit.floor] = [];
                        acc[unit.floor].push(unit);
                        return acc;
                      }, {});
                      const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

                      return sortedFloors.map(floor => (
                        <div key={floor} className="py-3 first:pt-0 last:pb-0">
                          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                            Floor {floor === 0 ? 'G' : floor}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {unitsByFloor[floor].map(unit => (
                              <div key={unit.id} className={clsx(
                                "pl-3 pr-2 py-1.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold transition-all shadow-sm",
                                unit.status === 'AVAILABLE' ? "bg-emerald-50/70 border-emerald-250 text-emerald-800" :
                                  unit.status === 'RESERVED' ? "bg-amber-50/70 border-amber-250 text-amber-800" :
                                    "bg-red-50/70 border-red-250 text-red-800"
                              )}>
                                <span>Unit {unit.unitNumber} ({unit.type})</span>
                                {unit.price && (
                                  <span className="opacity-75 font-medium">SAR {unit.price.toLocaleString()}</span>
                                )}
                                <div className="flex items-center gap-1.5 border-l border-current/25 pl-2 ml-1 select-none">
                                  <select
                                    value={unit.status}
                                    onChange={(e) => handleUpdateUnitStatus(unit.id, e.target.value)}
                                    className="bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 cursor-pointer outline-none w-18 text-current text-xs"
                                  >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="RESERVED">Reserved</option>
                                    <option value="SOLD">Sold</option>
                                  </select>
                                  <button
                                    onClick={() => handleDeleteUnit(unit.id)}
                                    className="text-current/60 hover:text-red-700 transition-colors pl-0.5"
                                    title="Delete Unit"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featuring Confirmation Modal */}
      {featureModal.isOpen && featureModal.project && (() => {
        const cost = selectedDays === 7 ? featureCost7 : featureCost30;
        const hasEnough = !!(user?.creditsBalance && user.creditsBalance >= cost);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Feature Project</h3>
                  <p className="text-xs text-slate-500">Promote this project to the top of homepage and search</p>
                </div>
              </div>

              {/* Target Project */}
              <div className="text-xs text-slate-700 bg-slate-50 border border-slate-150 p-3.5 rounded-xl flex justify-between items-center">
                <span>Target Project:</span>
                <strong className="text-slate-900 font-bold">{featureModal.project.nameEn}</strong>
              </div>

              {/* Selection cards */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Select Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { days: 7, cost: featureCost7, desc: 'Weekly Boost' },
                    { days: 30, cost: featureCost30, desc: 'Monthly Dominance' },
                  ].map(plan => (
                    <button
                      type="button"
                      key={plan.days}
                      onClick={() => setSelectedDays(plan.days as any)}
                      className={clsx(
                        'p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1',
                        selectedDays === plan.days
                          ? 'border-amber-500 bg-amber-50/20 text-amber-800 ring-1 ring-amber-550/20 font-bold'
                          : 'border-slate-205 text-slate-600 hover:border-slate-350'
                      )}
                    >
                      <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">{plan.desc}</span>
                      <span className="text-base font-black">{plan.days} Days</span>
                      <span className="text-[10px] bg-amber-100/50 text-amber-800 px-2 py-0.5 rounded-full font-black mt-0.5">
                        {plan.cost} credits
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit status details */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Featuring Cost:</span>
                  <strong className="text-amber-700 font-bold">{cost} Credits</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span>Your Current Balance:</span>
                  <strong className={hasEnough ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                    {user?.creditsBalance ?? 0} Credits
                  </strong>
                </div>
              </div>

              {!hasEnough ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>You need {cost - (user?.creditsBalance ?? 0)} more credits to feature this project.</span>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFeatureModal({ isOpen: false, project: null })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={featuring || !hasEnough}
                  onClick={handleConfirmFeature}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  {featuring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Confirm ({cost} Credits)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PDF Export Selection Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">Export Inventory Matrix</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose the language layout for the exported PDF report.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportLanguage('ar')}
                className={clsx(
                  "p-3 rounded-2xl border text-center font-bold text-xs transition-all",
                  exportLanguage === 'ar'
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                    : "border-slate-200 hover:border-slate-350"
                )}
              >
                Arabic (العربية)
              </button>
              <button
                type="button"
                onClick={() => setExportLanguage('en')}
                className={clsx(
                  "p-3 rounded-2xl border text-center font-bold text-xs transition-all",
                  exportLanguage === 'en'
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                    : "border-slate-200 hover:border-slate-350"
                )}
              >
                English (Default)
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setExportModalOpen(false);
                  setExportProjectId(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exportProjectId) {
                    handleExportPDF(exportProjectId, exportLanguage);
                  }
                  setExportModalOpen(false);
                }}
                className="flex-1 bg-[#0f2d24] hover:bg-[#1a3d30] text-[#6ee7b7] font-bold py-2 text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Generic) */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-xs rounded-xl shadow"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Views Analytics Modal */}
      <PropertyAnalyticsModal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal(prev => ({ ...prev, isOpen: false }))}
        propertyId={analyticsModal.propertyId}
        propertyTitle={analyticsModal.propertyTitle}
        totalViews={analyticsModal.totalViews}
      />
    </div>
  );
}
