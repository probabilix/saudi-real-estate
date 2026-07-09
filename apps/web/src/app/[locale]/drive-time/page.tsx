'use client';

/**
 * Commute / Drive Time Search Page — /[locale]/drive-time
 * ──────────────────────────────────────────────────────────────────────────
 * Search properties based on drive-time proximity to Point A and Point B.
 * Renders commute pins with spatial clustering on a Google Maps canvas.
 *
 * Left panel: Beautiful 2-column grid of Premium property cards with commute times.
 * Right panel: Google Map with custom teal/amber spatial clustering at low zoom,
 * and clean dot pins at high zoom. Click shows InfoWindow popup.
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLoadScript, GoogleMap, MarkerF, Polygon, InfoWindow, OverlayView } from '@react-google-maps/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, SlidersHorizontal, ChevronDown, Filter, Loader2,
  Building2, Home, ArrowLeft, Car, ArrowRight, Settings, Info, Search, X,
  Building, Warehouse, Tent, Landmark
} from 'lucide-react';

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];
const SAUDI_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh center

// ── Types ────────────────────────────────────────────────────────────────────

interface CommutePin {
  id: string;
  shortId?: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  purpose: string;
  bedrooms?: number;
  city: string;
  district?: string;
  enTitle?: string;
  arTitle: string;
  thumb?: string;
  isFeatured?: boolean;
  kind: 'listing' | 'project';
  driveTimeA: number;
  driveTimeB: number | null;
  nameEn?: string;
  nameAr?: string;
  completionStatus?: string;
  foreignerEligible?: boolean;
  muslimOnly?: boolean;
}

interface ClusterPoint {
  lat: number;
  lng: number;
  count: number;
  hasFeatured: boolean;
  pins: CommutePin[];
  kind: 'cluster';
  id: string;
}

type MapItem = CommutePin | ClusterPoint;

interface Filters {
  priceMin: string;
  priceMax: string;
  type: string;
  purpose: string;
  foreignerEligible: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}K`;
  return price.toLocaleString();
}

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment', VILLA: 'Villa', FLOOR: 'Floor',
  RESIDENTIAL_BUILDING: 'Building', OFFICE: 'Office', WAREHOUSE: 'Warehouse',
  TOWNHOUSE: 'Townhouse', DUPLEX: 'Duplex', REST_HOUSE: 'Rest House',
  CHALET: 'Chalet', ROOM: 'Room', RESIDENTIAL_LAND: 'Land',
};

// ── Spatial Clustering Helpers ────────────────────────────────────────────────

function latLngToMercator(lat: number, lng: number, zoom: number) {
  const scale = Math.pow(2, zoom) * 256;
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}

function clusterCommutePins(pins: CommutePin[], zoom: number): MapItem[] {
  if (zoom >= 14) return pins;
  const r = zoom >= 12 ? 40 : zoom >= 10 ? 65 : zoom >= 8 ? 100 : 140;
  const done = new Set<string>();
  const out: MapItem[] = [];
  for (const pin of pins) {
    if (done.has(pin.id)) continue;
    const pt = latLngToMercator(pin.lat, pin.lng, zoom);
    const group: CommutePin[] = [pin];
    done.add(pin.id);
    for (const o of pins) {
      if (done.has(o.id)) continue;
      const op = latLngToMercator(o.lat, o.lng, zoom);
      const d = Math.hypot(pt.x - op.x, pt.y - op.y);
      if (d < r) { group.push(o); done.add(o.id); }
    }
    if (group.length === 1) {
      out.push(group[0]);
    } else {
      const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
      const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
      out.push({
        kind: 'cluster',
        id: `c-${pin.id}`,
        lat: avgLat,
        lng: avgLng,
        count: group.length,
        hasFeatured: group.some(p => p.isFeatured),
        pins: group,
      });
    }
  }
  return out;
}

// ── Cluster badge ────────────────────────────────────────────────────────────
function ClusterBadge({ item, onClick }: { item: ClusterPoint; onClick: () => void }) {
  const sz = item.count >= 100 ? 52 : item.count >= 10 ? 44 : 38;
  return (
    <div onClick={onClick} style={{ transform: 'translate(-50%,-50%)', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{
        width: sz, height: sz, borderRadius: '50%',
        background: item.hasFeatured ? '#f59e0b' : '#0d9488',
        color: 'white', fontWeight: 900,
        fontSize: item.count >= 100 ? 11 : 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.22)', border: '3px solid white',
        transition: 'transform 0.1s',
      }}>{item.count >= 1000 ? `${Math.floor(item.count / 1000)}K` : item.count}</div>
    </div>
  );
}

function getPinIcon(pin: CommutePin) {
  if (pin.kind === 'project') {
    return Building2;
  }
  switch (pin.type) {
    case 'VILLA':
    case 'TOWNHOUSE':
    case 'DUPLEX':
      return Home;
    case 'APARTMENT':
    case 'FLOOR':
    case 'ROOM':
      return Building2;
    case 'RESIDENTIAL_BUILDING':
    case 'OFFICE':
      return Building;
    case 'WAREHOUSE':
      return Warehouse;
    case 'CHALET':
    case 'REST_HOUSE':
      return Tent;
    case 'RESIDENTIAL_LAND':
      return Landmark;
    default:
      return Home;
  }
}

// ── Redesigned speech bubble pin (large, easy to click, contextual icon & label) ────────
function DotPin({ pin, selected, locale, faded, onClick }: { pin: CommutePin; selected: boolean; locale: string; faded?: boolean; onClick: (e: React.MouseEvent) => void }) {
  const isP = pin.kind === 'project';
  const isFeatured = pin.isFeatured;
  const isForeigner = pin.foreignerEligible;
  const isMuslimOnly = pin.muslimOnly;

  let bg = selected
    ? '#064e4b'
    : isForeigner
      ? (isMuslimOnly ? '#ea580c' : '#7c3aed')
      : isP
        ? '#1e40af'
        : (isFeatured ? '#f59e0b' : '#0d9488');

  if (faded) {
    bg = '#94a3b8';
  }

  const Icon = getPinIcon(pin);

  return (
    <div
      onClick={onClick}
      style={{
        transform: 'translate(-50%, -100%)', // Anchor bottom center
        cursor: 'pointer',
        userSelect: 'none',
        filter: faded ? 'opacity(0.6) grayscale(20%)' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
      }}
      className={`group transition-all duration-150 ${selected ? 'scale-110 z-50' : 'hover:scale-105'}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Capsule */}
        <div
          style={{
            background: bg,
            color: 'white',
            borderRadius: '16px',
            padding: '5px 9px',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon className="w-3.5 h-3.5 text-white shrink-0" />
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2px' }}>
            {isP ? (locale === 'ar' ? 'مشروع' : 'Project') : formatPrice(pin.price)}
          </span>
        </div>

        {/* Pointer (overlapping border) */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid white`,
            marginTop: '-1px',
            zIndex: 1,
          }}
        />
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${bg}`,
            marginTop: '-6px',
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}

// ── Google Map Wrapper ──

interface MapWrapperProps {
  pointA: { lat: number; lng: number } | null;
  pointB: { lat: number; lng: number } | null;
  setPointA: (pt: { lat: number; lng: number } | null) => void;
  setPointB: (pt: { lat: number; lng: number } | null) => void;
  reverseGeocode: (lat: number, lng: number, target: 'A' | 'B') => void;
  polyAPath: { lat: number; lng: number }[] | null;
  polyBPath: { lat: number; lng: number }[] | null;
  pins: CommutePin[];
  selectedPin: CommutePin | null;
  setSelectedPin: (pin: CommutePin | null) => void;
  onLoad: (mapInstance: google.maps.Map) => void;
  locale: string;
}

function GoogleMapWrapper({
  pointA,
  pointB,
  setPointA,
  setPointB,
  reverseGeocode,
  polyAPath,
  polyBPath,
  pins,
  selectedPin,
  setSelectedPin,
  onLoad,
  locale
}: MapWrapperProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);
  const [items, setItems] = useState<MapItem[]>([]);
  const [viewportPins, setViewportPins] = useState<CommutePin[]>([]);
  const [contextMenu, setContextMenu] = useState<{ lat: number; lng: number } | null>(null);

  // Sync selection to pan map
  useEffect(() => {
    if (selectedPin && mapRef.current) {
      mapRef.current.panTo({ lat: selectedPin.lat, lng: selectedPin.lng });
      if ((mapRef.current.getZoom() ?? 0) < 13) {
        mapRef.current.setZoom(13);
      }
    }
  }, [selectedPin]);

  const fetchViewportPins = useCallback(async (m: google.maps.Map) => {
    const b = m.getBounds(); if (!b) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const params = new URLSearchParams({
      north: String(ne.lat()),
      south: String(sw.lat()),
      east: String(ne.lng()),
      west: String(sw.lng()),
    });
    try {
      const res = await fetch(`${base}/listings/map?${params}`);
      const json = await res.json();
      if (json.success) {
        const parsed: CommutePin[] = [
          ...json.data.listings.map((l: any) => ({ ...l, kind: 'listing' as const, driveTimeA: 999, driveTimeB: null })),
          ...json.data.projects.map((p: any) => ({ ...p, kind: 'project' as const, driveTimeA: 999, driveTimeB: null }))
        ];
        setViewportPins(parsed);
      }
    } catch (e) {
      console.error('[DriveTime] fetchViewportPins error:', e);
    }
  }, []);

  const handleIdle = useCallback(() => {
    if (mapRef.current) {
      setZoom(mapRef.current.getZoom() ?? 12);
      fetchViewportPins(mapRef.current);
    }
  }, [fetchViewportPins]);

  const mergedPins = useMemo(() => {
    const commuteMap = new Map<string, CommutePin>();
    pins.forEach(p => commuteMap.set(`${p.kind}-${p.id}`, p));

    const hasCommute = !!pointA;
    const merged = viewportPins.map(vp => {
      const match = commuteMap.get(`${vp.kind}-${vp.id}`);
      if (match) {
        return { ...match, faded: false };
      }
      return { ...vp, faded: hasCommute };
    });

    const viewportKeys = new Set(viewportPins.map(vp => `${vp.kind}-${vp.id}`));
    pins.forEach(p => {
      if (!viewportKeys.has(`${p.kind}-${p.id}`)) {
        merged.push({ ...p, faded: false });
      }
    });

    return merged;
  }, [pins, viewportPins, pointA]);

  useEffect(() => {
    setItems(clusterCommutePins(mergedPins, zoom));
  }, [mergedPins, zoom]);

  const handleLocalLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
    onLoad(m);
  }, [onLoad]);

  const selectedProject = selectedPin?.kind === 'project' ? selectedPin : null;
  const selectedListing = selectedPin?.kind === 'listing' ? selectedPin : null;
  const detailUrl = selectedPin
    ? (selectedPin.kind === 'project'
      ? `/${locale}/projects/${selectedPin.id}`
      : `/${locale}/listings/${selectedPin.shortId || selectedPin.id}`)
    : '';

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={pointA || SAUDI_CENTER}
      zoom={pointA ? 12 : 11}
      onLoad={handleLocalLoad}
      onIdle={handleIdle}
      onClick={() => {
        setSelectedPin(null);
        setContextMenu(null);
      }}
      onRightClick={(e) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat && lng) {
          setContextMenu({ lat, lng });
        }
      }}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      }}
    >
      {/* Native right-click context menu to set Point A/B */}
      {contextMenu && (
        <InfoWindow
          position={{ lat: contextMenu.lat, lng: contextMenu.lng }}
          onCloseClick={() => setContextMenu(null)}
        >
          <div className="p-2 flex flex-col gap-1.5 font-sans min-w-[120px]">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center border-b border-slate-100 pb-1 mb-1">Set Point</span>
            <button
              onClick={() => {
                setPointA({ lat: contextMenu.lat, lng: contextMenu.lng });
                reverseGeocode(contextMenu.lat, contextMenu.lng, 'A');
                setContextMenu(null);
              }}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-150 rounded-lg text-emerald-800 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Set as Point A
            </button>
            <button
              onClick={() => {
                setPointB({ lat: contextMenu.lat, lng: contextMenu.lng });
                reverseGeocode(contextMenu.lat, contextMenu.lng, 'B');
                setContextMenu(null);
              }}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100/70 border border-blue-150 rounded-lg text-blue-800 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Set as Point B
            </button>
          </div>
        </InfoWindow>
      )}
      {/* Point A Premium HTML Marker (zIndex: 99999 overlay - Issue 3 / 4) */}
      {pointA && (
        <OverlayView
          position={{ lat: pointA.lat, lng: pointA.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] pointer-events-none drop-shadow-md"
            style={{ zIndex: 99999 }}
          >
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-t-full rounded-bl-full rotate-45 border-2 border-white shadow-md bg-emerald-600">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center -rotate-45 shadow-sm">
                  <span className="text-[10px] font-black text-emerald-700">A</span>
                </div>
              </div>
              {/* Visual pointer extension */}
              <div className="w-0.5 h-3 bg-emerald-600/80 mt-[-1px] shadow-sm" />
              <div className="w-1 h-0.5 bg-black/40 rounded-full blur-[0.5px] mt-0.5" />
            </div>
          </div>
        </OverlayView>
      )}

      {/* Point B Premium HTML Marker (zIndex: 99999 overlay - Issue 3 / 4) */}
      {pointB && (
        <OverlayView
          position={{ lat: pointB.lat, lng: pointB.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
          <div
            className="absolute -translate-x-1/2 -translate-y-[calc(100%+14px)] pointer-events-none drop-shadow-md"
            style={{ zIndex: 99999 }}
          >
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-t-full rounded-bl-full rotate-45 border-2 border-white shadow-md bg-blue-600">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center -rotate-45 shadow-sm">
                  <span className="text-[10px] font-black text-blue-700">B</span>
                </div>
              </div>
              {/* Visual pointer extension */}
              <div className="w-0.5 h-3 bg-blue-600/80 mt-[-1px] shadow-sm" />
              <div className="w-1 h-0.5 bg-black/40 rounded-full blur-[0.5px] mt-0.5" />
            </div>
          </div>
        </OverlayView>
      )}

      {/* Floating map hint banner */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full shadow-lg border border-slate-800 pointer-events-none">
        Use Right Click to place a pin on the map and select your location
      </div>

      {/* Isochrone Polygon A */}
      {polyAPath && (
        <Polygon
          paths={polyAPath}
          options={{
            fillColor: '#10b981',
            fillOpacity: 0.12,
            strokeColor: '#059669',
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />
      )}

      {/* Isochrone Polygon B */}
      {polyBPath && (
        <Polygon
          paths={polyBPath}
          options={{
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            strokeColor: '#2563eb',
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />
      )}

      {/* Cluster badges */}
      {items.filter(i => i.kind === 'cluster').map(i => {
        const c = i as ClusterPoint;
        return (
          <OverlayView key={c.id} position={{ lat: c.lat, lng: c.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <ClusterBadge item={c} onClick={() => {
              if (mapRef.current) {
                mapRef.current.setZoom((mapRef.current.getZoom() ?? 8) + 3);
                mapRef.current.panTo({ lat: c.lat, lng: c.lng });
              }
            }} />
          </OverlayView>
        );
      })}

      {/* Individual dot pins */}
      {items.filter(i => i.kind !== 'cluster').map(i => {
        const pin = i as CommutePin & { faded?: boolean };
        return (
          <OverlayView key={`${pin.kind}-${pin.id}`} position={{ lat: pin.lat, lng: pin.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={() => ({ x: 0, y: 0 })}>
            <DotPin pin={pin} selected={selectedPin?.id === pin.id} locale={locale} faded={pin.faded} onClick={e => { e.stopPropagation?.(); setSelectedPin(pin); }} />
          </OverlayView>
        );
      })}

      {/* InfoWindow popup */}
      {selectedPin && (
        <InfoWindow
          position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
          onCloseClick={() => setSelectedPin(null)}
          options={typeof window !== 'undefined' && window.google ? { pixelOffset: new window.google.maps.Size(0, -32) } : undefined}
        >
          <div className="bg-white overflow-hidden w-[200px] font-sans">
            {selectedPin.thumb ? (
              <img src={selectedPin.thumb} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
            ) : (
              <div className="w-full h-20 bg-slate-100 flex items-center justify-center rounded-lg text-slate-300 mb-2">
                <Home className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg mb-1 ${selectedPin.kind === 'project' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
                }`}>
                {selectedPin.kind === 'project' ? 'Project' : TYPE_LABELS[selectedPin.type] || selectedPin.type}
              </span>
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {selectedProject ? (selectedProject.nameEn || selectedProject.nameAr) : (selectedListing?.enTitle || selectedListing?.arTitle)}
              </h4>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {selectedPin.district ? `${selectedPin.district}, ` : ''}{selectedPin.city}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-lg">
                  <Car className="w-3 h-3 text-emerald-600" />
                  <span>{selectedPin.driveTimeA}m to A</span>
                </span>
                {selectedPin.driveTimeB && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded-lg">
                    <Car className="w-3 h-3 text-blue-600" />
                    <span>{selectedPin.driveTimeB}m to B</span>
                  </span>
                )}
              </div>
              <a
                href={detailUrl}
                className="mt-3 flex items-center justify-center w-full bg-[#064e4b] text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-xl hover:bg-[#043a37] transition-all"
              >
                View details
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

// ── Premium Property Card (2-column layout compatible with commute details) ──
interface PremiumCardProps {
  pin: CommutePin;
  selected: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

function PremiumCommuteCard({ pin, selected, onClick, onMouseEnter }: PremiumCardProps) {
  const isP = pin.kind === 'project';
  const title = isP ? (pin.nameEn || pin.nameAr) : (pin.enTitle || pin.arTitle);
  const location = [pin.district, pin.city].filter(Boolean).join(', ');

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`group bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 ${selected
          ? 'border-[#064e4b] ring-4 ring-[#064e4b]/5 shadow-lg'
          : 'border-slate-100 hover:border-slate-200/80 hover:shadow-md'
        } flex lg:flex-col h-[128px] lg:h-auto w-full relative`}
    >
      {/* Image Container */}
      <div className="relative w-[128px] lg:w-full h-full lg:h-44 overflow-hidden bg-slate-50 shrink-0 pointer-events-none">
        {pin.thumb ? (
          <img
            src={pin.thumb}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-350 bg-slate-50">
            {isP ? <Building2 className="w-8 h-8" /> : <Home className="w-8 h-8" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-45" />

        {/* Overlay Badges on Image (Featured) */}
        {pin.isFeatured && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="bg-amber-400 text-amber-955 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
              ★ Featured
            </span>
          </div>
        )}

        {/* Purpose Badge overlay (Buy/Rent - Desktop only) */}
        {!isP && (
          <div className="absolute top-2 right-2 z-10 lg:block hidden">
            <span className={`text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm ${pin.purpose === 'SALE' ? 'bg-[#064e4b] text-white' : 'bg-teal-500 text-white'
              }`}>
              {pin.purpose === 'SALE' ? 'Buy' : 'Rent'}
            </span>
          </div>
        )}
      </div>

      {/* Info / Content Area */}
      <div className="p-3.5 lg:p-4 flex-1 flex flex-col justify-between min-w-0 pointer-events-none">
        <div>
          {/* Price or completion status */}
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            {isP ? (
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-wider text-blue-655 truncate block max-w-full">
                Project • {pin.completionStatus?.replace(/_/g, ' ') || 'Off Plan'}
                {pin.foreignerEligible && ` • ${pin.muslimOnly ? '🕌 Muslims' : '🌍 Foreigner'}`}
              </span>
            ) : (
              <span className="text-sm lg:text-base font-black text-slate-900 leading-tight">
                SAR {formatPrice(pin.price)}
                {pin.purpose === 'RENT' && <span className="text-xs text-slate-400 font-normal">/yr</span>}
              </span>
            )}

            {/* Purpose Badge overlay (Buy/Rent - Mobile only) */}
            {!isP && (
              <span className={`lg:hidden text-[7.5px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${pin.purpose === 'SALE' ? 'bg-[#064e4b] text-white' : 'bg-teal-500 text-white'
                }`}>
                {pin.purpose === 'SALE' ? 'Buy' : 'Rent'}
              </span>
            )}
          </div>

          {/* Commute Badge Grid Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md">
              <Car className="w-3 h-3 text-emerald-650 shrink-0" />
              <span>{pin.driveTimeA} min to A</span>
            </span>
            {pin.driveTimeB !== null && pin.driveTimeB !== undefined ? (
              <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-md">
                <Car className="w-3 h-3 text-blue-655 shrink-0" />
                <span>{pin.driveTimeB} min to B</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider bg-slate-55 text-slate-450 border border-slate-100 px-1.5 py-0.5 rounded-md">
                <Car className="w-3 h-3 text-slate-300 shrink-0" />
                <span>- min to B</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[11.5px] lg:text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-[#064e4b] transition-colors mb-0.5">
            {title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-slate-455">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#064e4b]/70" />
            <span className="text-[10px] truncate">{location}</span>
          </div>
        </div>

        {/* Specs footer for listings */}
        {!isP && (
          <div className="flex items-center gap-1.5 pt-1.5 mt-1.5 border-t border-slate-100 text-slate-500 text-[10px] flex-wrap">
            {!!(pin.bedrooms && Number(pin.bedrooms) > 0) && (
              <span className="font-bold">{pin.bedrooms} Beds</span>
            )}
            {!!(pin.bedrooms && Number(pin.bedrooms) > 0) && <span className="w-1 h-1 rounded-full bg-slate-200" />}
            <span className="font-semibold truncate">{TYPE_LABELS[pin.type] || pin.type}</span>
            {pin.foreignerEligible && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span className={`font-bold text-[9px] uppercase tracking-wide shrink-0 ${pin.muslimOnly ? 'text-orange-600' : 'text-purple-655'
                  }`}>
                  {pin.muslimOnly ? '🕌 Muslims' : '🌍 Foreigner Ok'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inner Main Content Component ──

interface DriveTimeInnerProps {
  googleMapsKey: string;
  locale: string;
}

function DriveTimeInner({ googleMapsKey, locale }: DriveTimeInnerProps) {
  const router = useRouter();

  // Load Maps SDK dynamically inside child component
  const { isLoaded: mapsLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    id: 'tamleq-maps-sdk',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const chooseMapRef = useRef<google.maps.Map | null>(null);

  const [pointA, setPointA] = useState<{ lat: number; lng: number } | null>(null);
  const [pointB, setPointB] = useState<{ lat: number; lng: number } | null>(null);
  const [pointALabel, setPointALabel] = useState<string>('');
  const [pointBLabel, setPointBLabel] = useState<string>('');
  const [settingPoint, setSettingPoint] = useState<'A' | 'B'>('A');

  // Mobile multi-screen state
  const [mobileScreen, setMobileScreen] = useState<'setup' | 'results' | 'choose-on-map'>('setup');
  const [activeChoosePoint, setActiveChoosePoint] = useState<'A' | 'B'>('A');
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [showMobileMoreFilters, setShowMobileMoreFilters] = useState(false);

  // Properties / Projects kind filter state
  const [kindFilter, setKindFilter] = useState<'listing' | 'project'>('project');

  // Refs for autocomplete inputs (Split to prevent React ref-stealing between views)
  const desktopInputARef = useRef<HTMLInputElement>(null);
  const desktopInputBRef = useRef<HTMLInputElement>(null);
  const mobileInputARef = useRef<HTMLInputElement>(null);
  const mobileInputBRef = useRef<HTMLInputElement>(null);

  const [minutes, setMinutes] = useState<number>(30);
  const [mode, setMode] = useState<'balanced' | 'nearestA' | 'nearestB'>('balanced');
  const [filters, setFilters] = useState<Filters>({
    priceMin: '', priceMax: '', type: '', purpose: '', foreignerEligible: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pins, setPins] = useState<CommutePin[]>([]);
  const [polygons, setPolygons] = useState<{ polyA: number[][][] | null; polyB: number[][][] | null }>({
    polyA: null,
    polyB: null
  });
  const [selectedPin, setSelectedPin] = useState<CommutePin | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(20);
  }, [pins, kindFilter]);

  // Client-side kind & filter settings (Issue 1)
  const filteredPins = useMemo(() => {
    return pins.filter(p => {
      // 1. Kind filter
      if (kindFilter === 'project' && p.kind !== 'project') return false;
      if (kindFilter === 'listing' && p.kind !== 'listing') return false;

      // 2. Purpose filter
      if (filters.purpose && p.purpose !== filters.purpose) return false;

      // 3. Property Type filter
      if (filters.type && (p.kind !== 'listing' || p.type !== filters.type)) return false;

      // 4. Price range
      if (filters.priceMin && p.price < Number(filters.priceMin)) return false;
      if (filters.priceMax && p.price > Number(filters.priceMax)) return false;

      // 5. Foreigner Eligible
      if (filters.foreignerEligible && !p.foreignerEligible) return false;

      return true;
    });
  }, [pins, kindFilter, filters]);

  const desktopListings = useMemo(() => {
    return filteredPins.slice(0, visibleCount);
  }, [filteredPins, visibleCount]);

  const handleDesktopScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
      if (visibleCount < filteredPins.length) {
        setVisibleCount(prev => Math.min(prev + 20, filteredPins.length));
      }
    }
  }, [visibleCount, filteredPins.length]);

  const pageSize = 20;
  const totalPages = Math.ceil(filteredPins.length / pageSize);
  const mobileListings = filteredPins.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Init Google Places Autocomplete on the input fields once SDK is ready
  useEffect(() => {
    if (!mapsLoaded) return;
    if (typeof google === 'undefined' || !google.maps?.places) return;

    const opts: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'sa' },
      fields: ['geometry', 'formatted_address', 'name'],
    };

    const bindAutocomplete = (input: HTMLInputElement | null, target: 'A' | 'B') => {
      if (!input) return null;
      const ac = new google.maps.places.Autocomplete(input, opts);
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          if (target === 'A') {
            setPointA({ lat, lng });
            setPointALabel(place.name || place.formatted_address || '');
            if (map) { map.panTo({ lat, lng }); map.setZoom(13); }
          } else {
            setPointB({ lat, lng });
            setPointBLabel(place.name || place.formatted_address || '');
            if (map) { map.panTo({ lat, lng }); map.setZoom(13); }
          }
        }
      });
      return ac;
    };

    let acDesktopA = bindAutocomplete(desktopInputARef.current, 'A');
    let acDesktopB = bindAutocomplete(desktopInputBRef.current, 'B');
    let acMobileA = bindAutocomplete(mobileInputARef.current, 'A');
    let acMobileB = bindAutocomplete(mobileInputBRef.current, 'B');

    return () => {
      if (acDesktopA) google.maps.event.clearInstanceListeners(acDesktopA);
      if (acDesktopB) google.maps.event.clearInstanceListeners(acDesktopB);
      if (acMobileA) google.maps.event.clearInstanceListeners(acMobileA);
      if (acMobileB) google.maps.event.clearInstanceListeners(acMobileB);
    };
  }, [mapsLoaded, map, mobileScreen]);

  // ── Fetch drive time results ──
  const fetchCommuteData = useCallback(async () => {
    if (!pointA) return;

    setLoading(true);
    setError(null);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

    try {
      const res = await fetch(`${apiBase}/listings/drive-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pointA,
          pointB: pointB || undefined,
          minutes,
          mode,
          filters: {
            priceMin: filters.priceMin || undefined,
            priceMax: filters.priceMax || undefined,
            type: filters.type || undefined,
            purpose: filters.purpose || undefined,
            foreignerEligible: filters.foreignerEligible || undefined,
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        const sorted = (json.data || []).sort((a: CommutePin, b: CommutePin) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        setPins(sorted);
        setPolygons({
          polyA: json.polygons?.polyA || null,
          polyB: json.polygons?.polyB || null
        });
      } else {
        setError(json.message || 'Failed to fetch commute results');
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection failed. Please check your API key config.');
    } finally {
      setLoading(false);
    }
  }, [pointA, pointB, minutes, mode, filters]);

  // Trigger search on mount and filter changes
  useEffect(() => {
    fetchCommuteData();
  }, [pointA, pointB, minutes, mode, filters, fetchCommuteData]);

  // Reverse geocoding helper to translate map click coordinates into locations
  const reverseGeocode = useCallback((lat: number, lng: number, target: 'A' | 'B') => {
    if (typeof google === 'undefined' || !google.maps?.Geocoder) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address || '';
        if (target === 'A') {
          setPointALabel(address);
          if (desktopInputARef.current) desktopInputARef.current.value = address;
          if (mobileInputARef.current) mobileInputARef.current.value = address;
        } else {
          setPointBLabel(address);
          if (desktopInputBRef.current) desktopInputBRef.current.value = address;
          if (mobileInputBRef.current) mobileInputBRef.current.value = address;
        }
      } else {
        const coordsStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (target === 'A') {
          setPointALabel(coordsStr);
          if (desktopInputARef.current) desktopInputARef.current.value = coordsStr;
          if (mobileInputARef.current) mobileInputARef.current.value = coordsStr;
        } else {
          setPointBLabel(coordsStr);
          if (desktopInputBRef.current) desktopInputBRef.current.value = coordsStr;
          if (mobileInputBRef.current) mobileInputBRef.current.value = coordsStr;
        }
      }
    });
  }, []);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Convert GeoJSON coordinates to Google Maps path
  const polyAPath = useMemo(() => {
    if (!polygons.polyA || polygons.polyA.length === 0) return null;
    return polygons.polyA[0].map(coord => ({
      lng: coord[0],
      lat: coord[1]
    }));
  }, [polygons.polyA]);

  const polyBPath = useMemo(() => {
    if (!polygons.polyB || polygons.polyB.length === 0) return null;
    return polygons.polyB[0].map(coord => ({
      lng: coord[0],
      lat: coord[1]
    }));
  }, [polygons.polyB]);

  // Fly to clicked property
  const flyToPin = (pin: CommutePin) => {
    setSelectedPin(pin);
    if (map) {
      map.panTo({ lat: pin.lat, lng: pin.lng });
      map.setZoom(14);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
        <MapPin className="w-12 h-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Maps Load Error</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          {loadError.message || 'Check your Google Maps API key settings or network connection.'}
        </p>
      </div>
    );
  }

  if (!mapsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#064e4b] mb-3" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starting Maps SDK...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 animate-fade-in">
      {/* Scope standard Pac Autocomplete styles for premium design */}
      <style jsx global>{`
        .pac-container {
          border-radius: 16px !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
          font-family: inherit !important;
          padding: 6px 0 !important;
          margin-top: 6px !important;
          background-color: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(8px);
          z-index: 99999 !important;
        }
        .pac-item {
          padding: 10px 14px !important;
          font-size: 13px !important;
          color: #475569 !important;
          cursor: pointer;
          border-top: 1px solid #f1f5f9 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .pac-item:first-child {
          border-top: none !important;
        }
        .pac-item:hover {
          background-color: #f8fafc !important;
        }
        .pac-icon {
          margin-top: 0 !important;
        }
        .pac-item-query {
          font-size: 13px !important;
          color: #0f172a !important;
          font-weight: 700 !important;
        }
      `}</style>

      {/* ── DESKTOP VIEW ── */}
      <div className="hidden lg:flex flex-col h-full overflow-hidden">
        {/* Top Control Strip */}
        <div style={{ flexShrink: 0 }} className="w-full bg-white border-b border-slate-200 py-3 px-6 z-30 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Back Button */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/${locale}/map`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 shrink-0">
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </Link>
              <div className="shrink-0">
                <h1 className="font-black text-slate-900 text-sm uppercase tracking-wide leading-tight">Search by Commute</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Saudi Commute Proximity</p>
              </div>
            </div>

            {/* Controls Container */}
            <div className="flex-1 flex flex-wrap items-center gap-4 min-w-[300px]">
              {/* Point A */}
              <div className="flex-1 min-w-[220px] relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black pointer-events-none">A</div>
                <input
                  ref={desktopInputARef}
                  type="text"
                  placeholder="Search first point (e.g. Work)..."
                  defaultValue={pointALabel}
                  onChange={e => setPointALabel(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs font-semibold border border-emerald-250 bg-emerald-50/20 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-slate-400 text-slate-700"
                />
                {pointA && (
                  <button onClick={() => { setPointA(null); setPointALabel(''); if (desktopInputARef.current) desktopInputARef.current.value = ''; }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Point B */}
              <div className="flex-1 min-w-[220px] relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black pointer-events-none">B</div>
                <input
                  ref={desktopInputBRef}
                  type="text"
                  placeholder="Add second point (Optional)..."
                  defaultValue={pointBLabel}
                  onChange={e => setPointBLabel(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs font-semibold border border-blue-150 bg-blue-50/20 rounded-xl outline-none focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400 text-slate-700"
                />
                {pointB && (
                  <button onClick={() => { setPointB(null); setPointBLabel(''); if (desktopInputBRef.current) desktopInputBRef.current.value = ''; setPolygons(p => ({ ...p, polyB: null })); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Slider & Custom Minutes Input */}
              <div className="flex flex-col gap-0.5 min-w-[220px] flex-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-0.5">
                  <span className="uppercase tracking-wider">Max Drive Time</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={minutes}
                      onChange={e => setMinutes(Number(e.target.value))}
                      className="w-12 text-center py-0.5 border border-slate-250 rounded-md text-[10px] font-black text-[#064e4b] outline-none focus:border-[#064e4b]"
                    />
                    <span className="text-[#064e4b] font-black uppercase">mins</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={minutes}
                  onChange={e => setMinutes(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #064e4b 0%, #064e4b ${((minutes - 10) / (120 - 10)) * 100}%, #e2e8f0 ${((minutes - 10) / (120 - 10)) * 100}%, #e2e8f0 100%)`
                  }}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-[#064e4b]"
                />
              </div>

              {/* Mode Select */}
              <div className="min-w-[130px]">
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none text-slate-700 focus:border-emerald-500"
                >
                  <option value="balanced">Balanced</option>
                  <option value="nearestA">Nearest A</option>
                  {pointB && <option value="nearestB">Nearest B</option>}
                </select>
              </div>

              {/* Desktop Filters Popover (Issue 1) */}
              <div className="relative">
                <button
                  onClick={() => setShowDesktopFilters(prev => !prev)}
                  className={`px-3.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-black ${showDesktopFilters || Object.values(filters).some(Boolean)
                      ? 'bg-emerald-50 text-[#064e4b] border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-350'
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#064e4b]" />
                  <span>Filters</span>
                  {Object.values(filters).some(Boolean) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  )}
                </button>

                {showDesktopFilters && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDesktopFilters(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-3.5 animate-fade-in pointer-events-auto">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Advanced Filters</span>
                        <button
                          onClick={() => {
                            setFilters({ priceMin: '', priceMax: '', type: '', purpose: '', foreignerEligible: false });
                            setShowDesktopFilters(false);
                          }}
                          className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest"
                        >
                          Clear All
                        </button>
                      </div>

                      {/* Purpose Select */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Purpose</label>
                        <select
                          value={filters.purpose}
                          onChange={e => setFilters(prev => ({ ...prev, purpose: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none text-slate-700 focus:border-[#064e4b]"
                        >
                          <option value="">Buy / Rent (All)</option>
                          <option value="SALE">For Sale</option>
                          <option value="RENT">For Rent</option>
                        </select>
                      </div>

                      {/* Property Type */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Property Type</label>
                        <select
                          value={filters.type}
                          onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider outline-none text-slate-700 focus:border-[#064e4b]"
                        >
                          <option value="">All Types</option>
                          {Object.entries(TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>

                      {/* Price Range */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Price Range (SAR)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filters.priceMin}
                            onChange={e => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-700 focus:border-[#064e4b] placeholder:text-slate-350"
                          />
                          <span className="text-slate-300">to</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={filters.priceMax}
                            onChange={e => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-700 focus:border-[#064e4b] placeholder:text-slate-350"
                          />
                        </div>
                      </div>

                      {/* Foreigner Eligible checkbox */}
                      <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filters.foreignerEligible}
                          onChange={e => setFilters(prev => ({ ...prev, foreignerEligible: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-[#064e4b]"
                        />
                        <span className="text-xs font-bold text-slate-700">Foreigner Eligible Only</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Split View */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left List Sidebar */}
          <div className="w-[680px] shrink-0 flex flex-col border-r border-slate-250 bg-white h-full overflow-hidden">
            {!pointA ? (
              /* ONBOARDING GUIDE (takes full height of sidebar when no search has run) */
              <div className="relative p-8 flex-1 flex flex-col items-center text-center select-none justify-center bg-white h-full">
                {/* Pointer Arrow pointing to Location A Box */}
                <div className="absolute top-2 left-[290px] animate-pulse hidden md:block z-25">
                  <svg width="60" height="75" viewBox="0 0 60 75" fill="none" className="transform -rotate-6">
                    <path
                      d="M45 68 C32 50 10 32 10 10"
                      stroke="#064e4b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="6,6"
                    />
                    <path
                      d="M2 18 L10 5 L20 14"
                      stroke="#064e4b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute -left-12 -bottom-6 text-[10px] font-black uppercase tracking-wider text-white bg-[#064e4b] border border-[#064e4b] px-2.5 py-1 rounded-md shadow-md whitespace-nowrap">
                    {locale === 'ar' ? 'أدخل الموقع هنا' : 'Enter Location A here'}
                  </span>
                </div>

                <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mb-6 shadow-sm">
                  <Car className="w-8 h-8 text-primary-600 animate-float" />
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 mb-3 font-serif">
                  {locale === 'ar' ? 'ابحث عن مسكنك حسب وقت التنقل' : 'Live Near the Places that Matter to You'}
                </h3>

                <p className="text-xs font-bold text-slate-700 max-w-sm mb-10 leading-relaxed">
                  {locale === 'ar'
                    ? 'حدد موقع البداية ووقت القيادة المفضل لنعرض لك العقارات والمشاريع المتاحة ضمن نطاق تنقلك اليومي.'
                    : 'Define your daily commute parameters above to discover premium properties reachable within your exact travel budget.'}
                </p>

                <div className="w-full max-w-xs space-y-6 text-left">
                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {locale === 'ar' ? 'حدد موقع البداية' : 'Set Commute Points'}
                      </h4>
                      <p className="text-[10.5px] text-slate-600 font-bold mt-0.5 leading-normal">
                        {locale === 'ar' ? 'أدخل نقطة البداية (مكان عملك، مدرستك، أو موقع زيارتك).' : 'Enter Location A above, representing your office, school, or daily landmark.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-[#064e4b] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {locale === 'ar' ? 'اختر وقت القيادة الأقصى' : 'Select Max Commute Time'}
                      </h4>
                      <p className="text-[10.5px] text-slate-600 font-bold mt-0.5 leading-normal">
                        {locale === 'ar' ? 'حدد وقت تنقلك المفضل بالدقائق لحساب النطاق.' : 'Set your maximum driving time budget to define your travel radius.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-[#C5A059] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {locale === 'ar' ? 'تصفح الخيارات المطابقة' : 'Explore Matching Homes'}
                      </h4>
                      <p className="text-[10.5px] text-slate-600 font-bold mt-0.5 leading-normal">
                        {locale === 'ar' ? 'شاهد العقارات والمشاريع المتاحة وتصفح تفاصيل المخططات.' : 'Browse matching listings and layouts reachable within your parameters.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE SEARCH VIEW */
              <>
                {/* Sync instruction bar */}
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose shrink-0">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Right click on the map to set location Point A or Point B</span>
                  </div>
                </div>

                {/* Properties / Projects Tab Switcher (Desktop) */}
                <div className="px-5 py-2.5 bg-white border-b border-slate-150 flex gap-2 shrink-0">
                  {[['listing', 'Properties'], ['project', 'Projects']].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => {
                        setKindFilter(k as any);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${kindFilter === k
                          ? 'bg-[#064e4b] text-white border-[#064e4b] shadow-sm'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto" onScroll={handleDesktopScroll}>
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
                      <span className="text-xs font-bold uppercase tracking-wider">Generating drive time contours...</span>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 m-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-700 text-center uppercase tracking-wider leading-loose">
                      ⚠️ {error}
                    </div>
                  )}

                  {!loading && !error && filteredPins.length === 0 && (
                    <div className="text-center py-16 text-slate-400 px-4">
                      <Car className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs font-black uppercase tracking-wider">No properties reachable</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">
                        Try expanding drive time range or moving Point A / B closer to residential zones.
                      </p>
                    </div>
                  )}

                  {!loading && !error && filteredPins.length > 0 && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                      {desktopListings.map(pin => (
                        <PremiumCommuteCard
                          key={`${pin.kind}-${pin.id}`}
                          pin={pin}
                          selected={selectedPin?.id === pin.id}
                          onClick={() => {
                            const detailUrl = pin.kind === 'project'
                              ? `/${locale}/projects/${pin.id}`
                              : `/${locale}/listings/${pin.shortId || pin.id}`;
                            router.push(detailUrl);
                          }}
                          onMouseEnter={() => flyToPin(pin)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Map */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <GoogleMapWrapper
              pointA={pointA}
              pointB={pointB}
              setPointA={setPointA}
              setPointB={setPointB}
              reverseGeocode={reverseGeocode}
              polyAPath={polyAPath}
              polyBPath={polyBPath}
              pins={pins}
              selectedPin={selectedPin}
              setSelectedPin={setSelectedPin}
              onLoad={onLoad}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW ── */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden relative">

        {/* Screen 1: SETUP */}
        {mobileScreen === 'setup' && (
          <div className="flex-1 overflow-y-auto bg-white p-5 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#064e4b]" />
                <h2 className="font-black text-slate-900 text-sm uppercase tracking-wide">Drive Time Proximity</h2>
              </div>
              <Link href={`/${locale}/map`} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </Link>
            </div>

            {/* Point A */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Origin Location (Point A)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black pointer-events-none">A</div>
                <input
                  ref={mobileInputARef}
                  type="text"
                  placeholder="Search destination origin..."
                  defaultValue={pointALabel}
                  onChange={e => setPointALabel(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-emerald-50/5 transition-all text-slate-700"
                />
              </div>
              <button
                onClick={() => {
                  setActiveChoosePoint('A');
                  setMobileScreen('choose-on-map');
                }}
                className="flex items-center gap-1.5 self-start text-[10px] font-black text-[#064e4b] bg-emerald-50/70 border border-emerald-100 px-3 py-1.5 rounded-xl transition-colors mt-0.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                Choose on Map
              </button>
            </div>

            {/* Point B */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Second Destination (Point B - Optional)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black pointer-events-none">B</div>
                <input
                  ref={mobileInputBRef}
                  type="text"
                  placeholder="Search second point..."
                  defaultValue={pointBLabel}
                  onChange={e => setPointBLabel(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-blue-50/5 transition-all text-slate-700"
                />
              </div>
              <button
                onClick={() => {
                  setActiveChoosePoint('B');
                  setMobileScreen('choose-on-map');
                }}
                className="flex items-center gap-1.5 self-start text-[10px] font-black text-[#064e4b] bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-xl transition-colors mt-0.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                Choose on Map
              </button>
            </div>

            {/* Drive Time slider or buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Max Drive Time</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={minutes}
                    onChange={e => setMinutes(Number(e.target.value))}
                    className="w-12 text-center py-0.5 border border-slate-250 rounded-md text-[10px] font-black text-[#064e4b] outline-none focus:border-[#064e4b]"
                  />
                  <span className="text-[#064e4b] font-black">mins</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setMinutes(mins)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${minutes === mins
                        ? 'bg-[#064e4b] text-white border-[#064e4b]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#064e4b]'
                      }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Mode select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Calculated Proximity Priority</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider outline-none text-slate-700 focus:border-[#064e4b]"
              >
                <option value="balanced">Balanced Proximity</option>
                <option value="nearestA">Nearest to A</option>
                {pointB && <option value="nearestB">Nearest to B</option>}
              </select>
            </div>

            {/* Mobile More Filters (Scrollable on page - Issue 1) */}
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Search Filters</h3>

              {/* Purpose */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Purpose</label>
                <select
                  value={filters.purpose}
                  onChange={e => setFilters(prev => ({ ...prev, purpose: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 outline-none focus:border-[#064e4b]"
                >
                  <option value="">Buy / Rent (All)</option>
                  <option value="SALE">For Sale</option>
                  <option value="RENT">For Rent</option>
                </select>
              </div>

              {/* Property Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Property Type</label>
                <select
                  value={filters.type}
                  onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 outline-none focus:border-[#064e4b]"
                >
                  <option value="">All Types</option>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Price Range (SAR)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.priceMin}
                    onChange={e => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 outline-none focus:border-[#064e4b] placeholder:text-slate-350"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.priceMax}
                    onChange={e => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 outline-none focus:border-[#064e4b] placeholder:text-slate-350"
                  />
                </div>
              </div>

              {/* Foreigner Eligible checkbox */}
              <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.foreignerEligible}
                  onChange={e => setFilters(prev => ({ ...prev, foreignerEligible: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-[#064e4b]"
                />
                <span className="text-xs font-bold text-slate-700">Foreigner Eligible Only</span>
              </label>
            </div>

            {/* Find button */}
            <button
              onClick={() => {
                if (!pointA) {
                  setError('Origin location (Point A) is required.');
                  return;
                }
                fetchCommuteData();
                setMobileScreen('results');
              }}
              className="w-full bg-[#064e4b] hover:bg-[#043a37] text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all mt-auto"
            >
              Find Properties
            </button>
          </div>
        )}

        {/* Screen 2: CHOOSE ON MAP (Bayut Style - Issue 2 / 3) */}
        {mobileScreen === 'choose-on-map' && (
          <div className="flex-1 relative animate-fade-in w-full h-full bg-slate-50 flex flex-col">
            {/* Full-width High-Visibility Header Card (Issue 2) */}
            <div className="bg-white border-b border-slate-200 z-20 flex flex-col shadow-sm shrink-0">
              {/* Logo & Back button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <button
                  onClick={() => setMobileScreen('setup')}
                  className="p-1 hover:bg-slate-100 rounded-lg text-emerald-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#064e4b] stroke-[3]" />
                </button>
                <span className="font-black text-[#064e4b] text-sm tracking-wider uppercase">Tamleeq</span>
                <div className="w-5" />
              </div>
              {/* Instructions row */}
              <div className="px-5 py-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${activeChoosePoint === 'A' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                  {activeChoosePoint}
                </div>
                <div>
                  <h3 className="text-[13px] font-black text-slate-900 leading-tight">
                    Choose {activeChoosePoint === 'A' ? 'first' : 'second'} point of interest
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Drag the map to change location</p>
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={pointA || SAUDI_CENTER}
                zoom={13}
                onLoad={m => { chooseMapRef.current = m; }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: 'greedy'
                }}
              />

              {/* Premium downward teardrop pin pointer (Issue 3) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%-2px)] z-10 pointer-events-none drop-shadow-lg">
                <div className="flex flex-col items-center">
                  {/* Teardrop pin body */}
                  <div className={`relative flex items-center justify-center w-11 h-11 rounded-t-full rounded-bl-full rotate-45 border-2 border-white shadow-md ${activeChoosePoint === 'A' ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}>
                    {/* Counter-rotate internal badge to keep text upright */}
                    <div className="w-6.5 h-6.5 rounded-full bg-white flex items-center justify-center -rotate-45 shadow-sm">
                      <span className={`text-xs font-black ${activeChoosePoint === 'A' ? 'text-emerald-700' : 'text-blue-700'
                        }`}>
                        {activeChoosePoint}
                      </span>
                    </div>
                  </div>
                  {/* Shadow representation on map canvas */}
                  <div className="w-1.5 h-1 bg-black/45 rounded-full blur-[0.5px] mt-1" />
                </div>
              </div>
            </div>

            {/* Bottom confirm button */}
            <div className="absolute bottom-6 left-4 right-4 z-20">
              <button
                onClick={() => {
                  if (chooseMapRef.current) {
                    const center = chooseMapRef.current.getCenter();
                    if (center) {
                      const lat = center.lat();
                      const lng = center.lng();
                      if (activeChoosePoint === 'A') {
                        setPointA({ lat, lng });
                        reverseGeocode(lat, lng, 'A');
                      } else {
                        setPointB({ lat, lng });
                        reverseGeocode(lat, lng, 'B');
                      }
                      setMobileScreen('setup');
                    }
                  }
                }}
                className="w-full bg-[#064e4b] hover:bg-[#043a37] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Screen 3: RESULTS (with list and pagination - Aligned per user specifications) */}
        {mobileScreen === 'results' && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden animate-fade-in h-full">

            {/* Mobile top filter controls (Aligned per user specifications) */}
            <div className="bg-white border-b border-slate-200 py-3.5 px-4 flex flex-col gap-3.5 shrink-0 shadow-sm z-30">
              {/* Row 1: Return CTA on left, Filters CTA on right */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push(`/${locale}/map`)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#064e4b] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Regular Search</span>
                </button>
                <button
                  onClick={() => setMobileScreen('setup')}
                  className="flex items-center gap-1 bg-[#064e4b] hover:bg-[#043a37] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-sm transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Row 2: Distinct left-aligned page heading */}
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  Results on Commute
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">
                  Reachable within {minutes} mins
                </p>
              </div>

              {/* Row 3: Horizontal tab switchers (Properties / Projects) */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-150">
                {[['listing', 'Properties'], ['project', 'Projects']].map(([k, label]) => {
                  const isActive = kindFilter === k;
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setKindFilter(k as any);
                      }}
                      className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${isActive
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile commute results list */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#064e4b]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Generating drive time contours...</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-700 text-center uppercase tracking-wider leading-loose">
                  ⚠️ {error}
                </div>
              )}

              {!loading && !error && filteredPins.length === 0 && (
                <div className="text-center py-16 text-slate-400 px-4">
                  <Car className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-wider">No properties reachable</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">
                    Try expanding drive time range or moving Point A / B closer to residential zones.
                  </p>
                </div>
              )}

              {!loading && !error && filteredPins.length > 0 && (
                <>
                  {mobileListings.map(pin => (
                    <PremiumCommuteCard
                      key={`mobile-${pin.kind}-${pin.id}`}
                      pin={pin}
                      selected={selectedPin?.id === pin.id}
                      onClick={() => {
                        const detailUrl = pin.kind === 'project'
                          ? `/${locale}/projects/${pin.id}`
                          : `/${locale}/listings/${pin.shortId || pin.id}`;
                        router.push(detailUrl);
                      }}
                    />
                  ))}

                  {/* Mobile pagination controls */}
                  {totalPages > 1 && (
                    <div className="py-4 border-t border-slate-100 flex items-center justify-center gap-1.5 mt-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 rounded-xl transition-all"
                      >
                        «
                      </button>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 rounded-xl transition-all"
                      >
                        ‹
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && p - prevPage > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="text-slate-400 px-1">...</span>}
                              <button
                                onClick={() => setCurrentPage(p)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${currentPage === p
                                    ? 'bg-[#064e4b] text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 rounded-xl transition-all"
                      >
                        ›
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 rounded-xl transition-all"
                      >
                        »
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Outer Page Component (Fetches token state before starting inner component) ──

export default function DriveTimePage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  const [googleMapsKey, setGoogleMapsKey] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState<boolean>(true);

  // Fetch token config on mount
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setGoogleMapsKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
      setLoadingToken(false);
      return;
    }

    const fetchToken = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${apiBase}/listings/maps-config`);
        const json = await res.json();
        if (json.success && json.googleMapsKey) {
          setGoogleMapsKey(json.googleMapsKey);
        }
      } catch (err) {
        console.error('Failed to load Google Maps key dynamically', err);
      } finally {
        setLoadingToken(false);
      }
    };
    fetchToken();
  }, []);

  if (loadingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Map Configuration...</span>
        </div>
      </div>
    );
  }

  if (!googleMapsKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-md text-center p-8">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Google Maps Key Required</h2>
          <p className="text-slate-500 text-sm">
            Add <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">google_maps_public_key</code> to site settings in admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DriveTimeInner googleMapsKey={googleMapsKey} locale={locale} />
  );
}
