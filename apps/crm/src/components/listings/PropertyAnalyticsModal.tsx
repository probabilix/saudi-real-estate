'use client';

import { useState, useEffect } from 'react';
import { crmApi } from '@/lib/api';
import { X, Eye, BarChart3, Loader2, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface PropertyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  shortId?: string;
  totalViews: number;
}

interface StatRow {
  day: string;
  views: number;
}

export default function PropertyAnalyticsModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  shortId,
  totalViews,
}: PropertyAnalyticsModalProps) {
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7d' | '30d' | '90d'>('7d');
  const [data, setData] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadStats();
    }
  }, [isOpen, propertyId, period]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await crmApi.getPropertyViewStats(propertyId, period);
      if (res.success && res.data) {

        setData(res.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Failed to load views stats:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;


  const normalizeDbDate = (dayStr: string) => {
    if (!dayStr) return '';
    return dayStr.includes('T') ? dayStr.split('T')[0] : dayStr;
  };

  const generateDateRange = (p: 'today' | 'yesterday' | '7d' | '30d' | '90d'): string[] => {
    const dates: string[] = [];
    const today = new Date();
    
    let daysToSubtract = 0;
    if (p === 'today') daysToSubtract = 0;
    else if (p === 'yesterday') daysToSubtract = 1;
    else if (p === '7d') daysToSubtract = 6;
    else if (p === '30d') daysToSubtract = 29;
    else if (p === '90d') daysToSubtract = 89;

    for (let i = daysToSubtract; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };

  const activeDays = generateDateRange(period);
  const dbDataMap = new Map(data.map(d => [normalizeDbDate(d.day), d.views]));

  const chartData = activeDays.map(day => ({
    day,
    views: dbDataMap.get(day) || 0
  }));

  const maxViewsInPeriod = chartData.length > 0 ? Math.max(...chartData.map(d => d.views)) : 0;
  
  const getTopYValue = (max: number) => {
    if (max <= 5) return 5;
    if (max <= 10) return 10;
    if (max <= 50) return 50;
    if (max <= 100) return 100;
    if (max <= 500) return 500;
    if (max <= 1000) return 1000;
    if (max <= 5000) return Math.ceil(max / 1000) * 1000;
    return Math.ceil(max / 2000) * 2000;
  };
  const topY = getTopYValue(maxViewsInPeriod);

  const formatYLabel = (val: number) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}K`;
    }
    return String(val);
  };

  const totalViewsInPeriod = chartData.reduce((sum, d) => sum + d.views, 0);

  const periodLabel = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  }[period];

  // Helper to decide which date labels to show on the X axis to avoid overcrowding
  const shouldShowXLabel = (index: number, total: number) => {
    if (total <= 10) return true;
    if (total <= 35) return index % 5 === 0 || index === total - 1;
    return index % 15 === 0 || index === total - 1;
  };

  // Format date cleanly for labels, e.g. "17 Jun"
  const formatXLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[#051c1a]/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 transform transition-all duration-300 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#064e4b]/10 flex items-center justify-center text-[#064e4b]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-snug">Property View Analytics</h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[400px]">
                {shortId ? `[${shortId}] ` : ''}{propertyTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#064e4b]/5 border border-[#064e4b]/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#064e4b]/10 flex items-center justify-center text-[#064e4b] shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Lifetime Views</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{totalViews.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Views in Selected Period</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
                  ) : (
                    totalViewsInPeriod.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Range</p>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              {(['today', 'yesterday', '7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all capitalize",
                    period === p
                      ? "bg-white text-slate-800 shadow-sm font-bold border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-6 min-h-[260px] flex flex-col justify-between relative overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#064e4b] mb-2" />
                <p className="text-xs font-semibold text-slate-500">Retrieving stats history...</p>
              </div>
            ) : null}

            {chartData.length === 0 && !loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
                <BarChart3 className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                <p className="text-xs font-semibold">No view records found for this period</p>
                <p className="text-[10px] text-slate-400 mt-1">Analytics populate as properties receive active dwell traffic</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-end">
                
                {/* Chart Layout: Y-Axis Labels + SVG Area */}
                <div className="flex items-stretch gap-4">
                  
                  {/* Left Column: Y Axis Labels */}
                  <div className="flex flex-col justify-between text-[10px] text-slate-400 font-bold text-right w-8 select-none py-1.5">
                    <span>{formatYLabel(topY)}</span>
                    <span>{formatYLabel(Math.round(topY * 0.75))}</span>
                    <span>{formatYLabel(Math.round(topY * 0.5))}</span>
                    <span>{formatYLabel(Math.round(topY * 0.25))}</span>
                    <span>0</span>
                  </div>

                  {/* Right Column: Interactive SVG Graph */}
                  <div className="flex-1 relative h-44 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                          key={ratio}
                          x1="0"
                          y1={150 - ratio * 138 - 6}
                          x2="500"
                          y2={150 - ratio * 138 - 6}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          opacity="0.6"
                        />
                      ))}

                      {/* Bars */}
                      {chartData.map((row, idx) => {
                        const totalBars = chartData.length;
                        const slotWidth = 500 / totalBars;
                        const gapRatio = totalBars > 60 ? 0.15 : totalBars > 10 ? 0.25 : 0.4;
                        const gap = slotWidth * gapRatio;
                        const barWidth = slotWidth - gap;
                        
                        const x = idx * slotWidth + (gap / 2);
                        const heightRatio = topY > 0 ? row.views / topY : 0;
                        const height = heightRatio * 138;
                        const y = 144 - height;

                        // Give it a tiny minimum height if views exist but would be invisible
                        const finalHeight = row.views > 0 ? Math.max(height, 3) : 0;
                        const finalY = row.views > 0 ? 144 - finalHeight : 144;

                        return (
                          <g 
                            key={idx}
                            onMouseEnter={() => setHoveredBar(idx)}
                            onMouseLeave={() => setHoveredBar(null)}
                            className="cursor-pointer"
                          >
                            {/* Bar outline/rect */}
                            <rect
                              x={x}
                              y={finalY}
                              width={barWidth}
                              height={finalHeight}
                              rx={Math.min(barWidth / 2, 4)}
                              fill={hoveredBar === idx ? '#334155' : '#475569'}
                              className="transition-all duration-200"
                            />
                            {/* Invisible fat click target helper for dense graphs */}
                            <rect
                              x={x - gap/2}
                              y={0}
                              width={slotWidth}
                              height={150}
                              fill="transparent"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Tooltip Overlay */}
                    {hoveredBar !== null && chartData[hoveredBar] && (() => {
                      const totalBars = chartData.length;
                      const percentX = (hoveredBar / totalBars) * 100;
                      const translateTransform = percentX > 80 
                        ? 'translateX(-90%)' 
                        : percentX < 20 
                        ? 'translateX(-10%)' 
                        : 'translateX(-50%)';

                      return (
                        <div 
                          className="absolute z-20 bg-slate-900/95 text-white px-3 py-1.5 rounded-xl text-[10px] shadow-xl font-bold pointer-events-none transition-all duration-150 whitespace-nowrap border border-slate-800"
                          style={{
                            left: `${((hoveredBar * (500 / chartData.length)) + (500 / chartData.length) / 2) / 5}%`,
                            transform: translateTransform,
                            bottom: `${Math.min(
                              Math.max((topY > 0 ? chartData[hoveredBar].views / topY : 0) * 138 + 15, 30),
                              140
                            )}px`,
                          }}
                        >
                          <p className="text-slate-400 font-medium">
                            {new Date(chartData[hoveredBar].day).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-emerald-400 font-black text-xs mt-0.5">
                            {chartData[hoveredBar].views.toLocaleString()} unique views
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* X Axis Labels aligned with the SVG columns */}
                <div className="flex text-[10px] text-slate-400 font-bold select-none mt-2 pt-2 border-t border-slate-100 pl-12">
                  <div className="flex-1 flex justify-between">
                    {chartData.map((row, idx) => {
                      if (!shouldShowXLabel(idx, chartData.length)) {
                        return <div key={idx} className="flex-1" />;
                      }
                      return (
                        <div 
                          key={idx} 
                          className="text-center font-bold text-slate-400"
                          style={{
                            width: `${100 / chartData.length}%`,
                            minWidth: '50px'
                          }}
                        >
                          {formatXLabel(row.day)}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-50 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
