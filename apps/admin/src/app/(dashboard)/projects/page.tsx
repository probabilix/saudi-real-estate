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
  Bed, Square, DollarSign, Star, X, FileText
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
  isFeatured?: boolean;
  featuredOrder?: number;
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
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectLayouts, setProjectLayouts] = useState<Record<string, LayoutItem[]>>({});
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const handleDeleteProject = (id: string) => {
    setConfirmModal({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This will permanently delete the project and all linked layout listings/units.',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          const res = await adminApi.deleteProject(id);
          if (res.success) {
            setProjects(prev => prev.filter(p => p.id !== id));
            setToast({ message: 'Project deleted successfully.', type: 'success' });
          } else {
            setToast({ message: 'Failed to delete project.', type: 'error' });
          }
        } catch (err: any) {
          setToast({ message: err.message || 'Error deleting project.', type: 'error' });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleToggleFeatured = async (id: string, isCurrentlyFeatured: boolean) => {
    try {
      const res = await adminApi.patchProject(id, { isFeatured: !isCurrentlyFeatured });
      if (res.success) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !isCurrentlyFeatured } : p));
        setToast({
          message: isCurrentlyFeatured
            ? 'Project removed from featured section.'
            : 'Project promoted to featured section.',
          type: 'success'
        });
      } else {
        setToast({ message: 'Failed to update project featured status.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating featured status.', type: 'error' });
    }
  };

  const handleUpdateFeaturedOrder = async (id: string, order: number) => {
    try {
      const res = await adminApi.patchProject(id, { featuredOrder: order });
      if (res.success) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, featuredOrder: order } : p));
        setToast({ message: 'Project featured order updated.', type: 'success' });
      } else {
        setToast({ message: 'Failed to update project featured order.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating featured order.', type: 'error' });
    }
  };

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

  const [layoutsLoading, setLayoutsLoading] = useState<Record<string, boolean>>({});

  // ── Inventory Drawer State ──
  const [inventoryDrawerOpen, setInventoryDrawerOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<LayoutItem | null>(null);
  const [selectedProjectForLayout, setSelectedProjectForLayout] = useState<ProjectListItem | null>(null);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  // ── Export Modal State ──
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportProjectId, setExportProjectId] = useState<string | null>(null);
  const [exportLanguage, setExportLanguage] = useState<'en' | 'ar'>('ar');

  // Add Units Form
  const [unitForm, setUnitForm] = useState({
    unitNumbers: '',
    floor: '',
    type: '',
    status: 'AVAILABLE',
    price: '',
  });

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

  const handleManageInventory = async (layout: LayoutItem, project: ProjectListItem) => {
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
      const res = await adminApi.getListingUnits(layoutId);
      if (res.success && res.data) {
        setUnitsList(res.data);
      }
    } catch (e) {
      console.error('Failed to load units:', e);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleAddUnits = async () => {
    if (!selectedLayout) return;
    if (!unitForm.unitNumbers || !unitForm.type) {
      setToast({ message: 'Unit Number(s) and BHK Type are required.', type: 'error' });
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
      const res = await adminApi.addListingUnits(selectedLayout.id, unitsToAdd);
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
      const res = await adminApi.updateListingUnit(selectedLayout.id, unitId, { status: newStatus });
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
      const res = await adminApi.deleteListingUnit(selectedLayout.id, unitId);
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

      const detailsRes = await adminApi.getProjectDetails(projectId);
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
      // A4 landscape at 96dpi ≈ 1122 × 794px. We render at this width.
      const PAGE_W = 1122;
      const PAGE_H = 794;          // A4 landscape px height
      const PAD = 18;
      const INNER_W = PAGE_W - PAD * 2;
      const FLOOR_COL_W = 124;
      const HEADER_H = 130;        // approx px for header + legend
      const THEAD_H = 50;         // approx px for table header row
      const FOOTER_H = 30;         // approx px for footer
      const USABLE_H = PAGE_H - PAD * 2 - HEADER_H - THEAD_H - FOOTER_H;

      // System font stacks — deliberately NOT using Google Fonts here.
      // Fetching a webfont inside a hidden iframe right before an
      // html2canvas capture is a race condition: if the font isn't fully
      // parsed in time, html2canvas measures/rasterizes text with the
      // fallback font's metrics, which is what caused the overlapping
      // "eaten" characters (e.g. "Rehab Project" → "RehalProject").
      // System fonts are already resident in the browser with zero load
      // latency, so there's no race to lose — output is 100% deterministic.
      const EN_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      const AR_FONT_STACK = "'Segoe UI', Tahoma, 'Geeza Pro', 'Arial', sans-serif";

      // ── Helper: estimate row height for a floor given a chunk ──
      // Each badge is ~58px tall + 6px margin. We stack badges in a single column per cell.
      const estimateRowH = (floor: number, chunk: any[]): number => {
        let maxBadges = 0;
        chunk.forEach(l => {
          const count = (unitsByFloor[floor] || []).filter(u => u.layoutId === l.id).length;
          if (count > maxBadges) maxBadges = count;
        });
        if (maxBadges === 0) return 44; // empty row (just dash)
        return maxBadges * 64 + 16;    // badge height × count + cell padding
      };

      // ── Split floors across pages per chunk ──
      // Returns array of page-groups: each page-group is an array of floor numbers.
      const splitFloorsIntoPages = (chunk: any[]): number[][] => {
        const pages: number[][] = [];
        let currentPage: number[] = [];
        let usedH = 0;

        for (const floor of sortedFloors) {
          const rowH = estimateRowH(floor, chunk);
          if (currentPage.length > 0 && usedH + rowH > USABLE_H) {
            // This row won't fit — start a new page
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

      // ── Build the full HTML for one "sheet" (one chunk, one page-worth of floors) ──
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

        // Counts only for units in this chunk
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

      // ── A4 landscape in mm for jsPDF ──
      const PDF_W_MM = 297;
      const PDF_H_MM = 210;

      // @ts-ignore
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const filename = `${project.nameEn.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_inventory_${lang}.pdf`;

      let isFirstPdfPage = true;

      // ── For each layout-chunk, split floors into pages, render each sheet ──
      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const floorPages = splitFloorsIntoPages(chunk); // array of floor[] per page

        for (let pi = 0; pi < floorPages.length; pi++) {
          const floorsOnThisPage = floorPages[pi];
          const sheetHtml = buildSheetHtml(chunk, floorsOnThisPage, ci, chunks.length, pi, floorPages.length);

          // Create a hidden iframe for this single sheet
          iframe = document.createElement('iframe');
          iframe.style.cssText = `position:fixed;left:-${PAGE_W + 200}px;top:0;width:${PAGE_W}px;height:${PAGE_H + 200}px;border:none;visibility:hidden;`;
          document.body.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(sheetHtml);
            iframeDoc.close();
          }

          // Wait for fonts to actually finish loading before capturing —
          // a flat setTimeout is a race condition and is the root cause of
          // the overlapping/garbled text (html2canvas measures with fallback
          // font metrics if the webfont isn't ready yet).
          const fontsReady = (iframeDoc as any)?.fonts?.ready;
          if (fontsReady) {
            await Promise.race([
              fontsReady,
              new Promise(r => setTimeout(r, 3000)), // safety timeout
            ]);
          }
          // Small extra buffer for layout/reflow after fonts swap in
          await new Promise(r => setTimeout(r, 300));

          // Capture with html2canvas at exact PAGE_W × PAGE_H
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
            letterRendering: true, // fixes html2canvas's inaccurate text
            // measurement that causes overlapping /
            // "eaten" characters and spaces on custom fonts
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.98);

          if (!isFirstPdfPage) doc.addPage();
          isFirstPdfPage = false;

          // Fill the entire A4 landscape page
          doc.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM);

          // Clean up iframe immediately
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
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
                  <th className="text-center">Featured</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading projects...</p>
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
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

                        {/* Featured */}
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFeatured(project.id, !!project.isFeatured)}
                              className={clsx(
                                "p-1.5 rounded-lg border transition-all",
                                project.isFeatured
                                  ? "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                  : "text-surface-400 hover:text-amber-600 hover:bg-amber-50 border-transparent"
                              )}
                              title={project.isFeatured ? "Remove from Featured" : "Mark as Featured"}
                            >
                              <Star className={clsx("w-4.5 h-4.5", project.isFeatured && "fill-amber-500 text-amber-500")} />
                            </button>
                            {project.isFeatured && (
                              <div className="flex items-center gap-1 border border-surface-200 rounded px-1 py-0.5 bg-white max-w-[65px]">
                                <span className="text-[9px] text-surface-400 font-bold uppercase select-none">Order:</span>
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={project.featuredOrder ?? 0}
                                  onBlur={(e) => handleUpdateFeaturedOrder(project.id, Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateFeaturedOrder(project.id, Number((e.target as HTMLInputElement).value));
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-8 text-center text-[10px] font-bold p-0 bg-transparent border-none focus:ring-0 outline-none"
                                />
                              </div>
                            )}
                          </div>
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
                            <button
                              onClick={() => {
                                setExportProjectId(project.id);
                                setExportModalOpen(true);
                              }}
                              disabled={exportingProjectId === project.id}
                              className="btn-ghost text-surface-400 hover:text-primary-600 disabled:opacity-50"
                              title="Export Available Inventory PDF"
                            >
                              {exportingProjectId === project.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </button>
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
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={deletingId === project.id}
                              className="btn-ghost text-surface-400 hover:text-red-600 disabled:opacity-50"
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

                      {/* Expanded Layouts Accordion Row */}
                      {expandedProjectId === project.id && (
                        <tr>
                          <td colSpan={7} className="bg-surface-50/80 px-6 py-4 border-t border-surface-100">
                            <div className="flex items-center justify-between mb-4 border-b border-surface-200 pb-2">
                              <h4 className="text-xs font-black uppercase tracking-wider text-surface-500">
                                Floor Plans & Layout Types
                              </h4>
                              <button
                                onClick={() => {
                                  setExportProjectId(project.id);
                                  setExportModalOpen(true);
                                }}
                                disabled={exportingProjectId === project.id}
                                className="btn-secondary py-1.5 px-3 text-[11px] font-bold flex items-center gap-1.5 rounded-lg border border-surface-200"
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
                                      <div className="flex gap-2 mt-2">
                                        <a
                                          href={`${WEB_URL}/en/listings/${layout.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn-ghost text-[10px] py-1 flex-1 justify-center text-center border border-surface-200 rounded-lg flex items-center justify-center gap-1"
                                        >
                                          <Eye className="w-3 h-3" /> View
                                        </a>
                                        <button
                                          onClick={() => handleManageInventory(layout, project)}
                                          className="btn-primary text-[10px] py-1 px-2 rounded-lg flex-1 flex items-center justify-center gap-1"
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

      {/* ── Inventory Side Drawer ── */}
      {inventoryDrawerOpen && selectedLayout && selectedProjectForLayout && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setInventoryDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 animate-in slide-in-from-right">
            <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <div>
                <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <span>Inventory Controller</span>
                </h3>
                <p className="text-xs text-surface-500 mt-1 font-medium truncate max-w-[400px]">
                  {selectedLayout.enTitle || selectedLayout.arTitle}
                </p>
              </div>
              <button
                onClick={() => setInventoryDrawerOpen(false)}
                className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-surface-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary-600" />
                    Parent Project
                  </h4>
                </div>
                <div className="bg-white border border-surface-200 rounded-xl p-3 flex items-start justify-between mt-2">
                  <div>
                    <div className="text-sm font-bold text-surface-800">
                      {selectedProjectForLayout.nameEn}
                    </div>
                    <div className="text-xs text-surface-400 font-mono mt-0.5" dir="rtl">
                      {selectedProjectForLayout.nameAr}
                    </div>
                    <div className="text-[10px] text-surface-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {selectedProjectForLayout.city}
                      {selectedProjectForLayout.district ? ` • ${selectedProjectForLayout.district}` : ''}
                    </div>
                  </div>
                  <span className="badge badge-green">Linked</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-surface-200 rounded-2xl p-4 space-y-4 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-surface-700">
                    Add Units to Inventory
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="admin-label">Unit Number(s)</label>
                      <input
                        type="text"
                        className="admin-input py-2 text-xs"
                        placeholder="e.g. 201 OR 201-205 OR 201, 202"
                        value={unitForm.unitNumbers}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, unitNumbers: e.target.value }))}
                      />
                      <span className="text-[10px] text-surface-400 mt-1 block leading-normal">
                        Use dashes for range, commas for list.
                      </span>
                    </div>
                    <div>
                      <label className="admin-label">Floor Number (Optional)</label>
                      <input
                        type="text"
                        className="admin-input py-2 text-xs"
                        placeholder="Auto-detect or e.g. 2"
                        value={unitForm.floor}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, floor: e.target.value }))}
                      />
                      <span className="text-[10px] text-surface-400 mt-1 block leading-normal">
                        Leave blank to auto-detect floor from unit numbers.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="admin-label">BHK Type</label>
                      <input
                        type="text"
                        className="admin-input py-2 text-xs"
                        placeholder="e.g. 2BHK"
                        value={unitForm.type}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, type: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="admin-label">Initial Status</label>
                      <select
                        className="admin-input py-2 text-xs"
                        value={unitForm.status}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="RESERVED">Reserved</option>
                        <option value="SOLD">Sold</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Price Override (SAR)</label>
                      <input
                        type="number"
                        className="admin-input py-2 text-xs"
                        placeholder="Default Layout Price"
                        value={unitForm.price}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddUnits}
                    disabled={loadingUnits}
                    className="btn-primary py-2 text-xs font-bold w-full justify-center"
                  >
                    {loadingUnits ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Adding units...
                      </>
                    ) : 'Add Unit(s) to Inventory'}
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-surface-700">
                    Physical Unit Matrix
                  </h4>
                  {loadingUnits ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-surface-500">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span>Loading unit list...</span>
                    </div>
                  ) : unitsList.length === 0 ? (
                    <div className="text-center py-8 bg-surface-50 border border-dashed border-surface-200 rounded-2xl">
                      <p className="text-xs text-surface-400 font-medium">No units found. Add units above to track inventory availability.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-surface-200 rounded-2xl p-4 divide-y divide-surface-150">
                      {(() => {
                        const unitsByFloor = unitsList.reduce((acc: Record<number, any[]>, unit) => {
                          if (!acc[unit.floor]) acc[unit.floor] = [];
                          acc[unit.floor].push(unit);
                          return acc;
                        }, {});
                        const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

                        return sortedFloors.map(floor => (
                          <div key={floor} className="py-3 first:pt-0 last:pb-0">
                            <div className="text-xs font-black text-surface-400 uppercase tracking-wider mb-2">
                              Floor {floor === 0 ? 'G' : floor}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {unitsByFloor[floor].map(unit => (
                                <div key={unit.id} className={clsx(
                                  "pl-3 pr-2 py-1.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold group/unit transition-all",
                                  unit.status === 'AVAILABLE' ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" :
                                    unit.status === 'RESERVED' ? "bg-amber-50/70 border-amber-200 text-amber-800" :
                                      "bg-red-50/70 border-red-200 text-red-800"
                                )}>
                                  <span>Unit {unit.unitNumber} ({unit.type})</span>
                                  {unit.price && (
                                    <span className="opacity-75 font-medium">SAR {unit.price.toLocaleString()}</span>
                                  )}
                                  <div className="flex items-center gap-1 border-l border-current/25 pl-1.5 ml-1 select-none">
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
        </div>
      )}

      {/* ── PDF Export Selection Modal ── */}
      {exportModalOpen && exportProjectId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-6 transform scale-95 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-150 pb-3">
              <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <span>Export Inventory Matrix</span>
              </h3>
              <button
                onClick={() => {
                  setExportModalOpen(false);
                  setExportProjectId(null);
                }}
                className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="admin-label block text-xs font-bold text-surface-700">Choose Language / اختر اللغة</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportLanguage('ar')}
                  className={clsx(
                    "py-3 px-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all",
                    exportLanguage === 'ar'
                      ? "border-primary-600 bg-primary-50/55 text-primary-700 font-extrabold"
                      : "border-surface-200 hover:border-surface-300 text-surface-600"
                  )}
                >
                  <span className="text-base">العربية (RTL)</span>
                  <span className="text-[10px] opacity-75">Arabic Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportLanguage('en')}
                  className={clsx(
                    "py-3 px-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-1 transition-all",
                    exportLanguage === 'en'
                      ? "border-primary-600 bg-primary-50/55 text-primary-700 font-extrabold"
                      : "border-surface-200 hover:border-surface-300 text-surface-600"
                  )}
                >
                  <span className="text-base">English (LTR)</span>
                  <span className="text-[10px] opacity-75">English Matrix</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-150">
              <button
                onClick={() => {
                  setExportModalOpen(false);
                  setExportProjectId(null);
                }}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setExportModalOpen(false);
                  handleExportPDF(exportProjectId, exportLanguage);
                }}
                className="btn-primary text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-sm w-full p-6 space-y-6 transform scale-100 transition-all animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-surface-900">{confirmModal.title}</h3>
              <p className="text-xs text-surface-500 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 btn-secondary justify-center py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 btn-primary bg-primary-600 hover:bg-primary-700 text-white border-none justify-center py-2 text-xs font-semibold rounded-xl"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}