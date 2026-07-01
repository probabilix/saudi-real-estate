'use client';

/**
 * Map View Page — /[locale]/map
 * Bayut-style split map search.
 *
 * Left panel: Beautiful 2-column grid of Premium property cards.
 * Right panel: Google Map with custom teal/amber spatial clustering at low zoom,
 * and clean dot pins at high zoom. Click shows InfoWindow popup.
 *
 * Switcher: Includes 'Search by Commute Time' button in the top filter strip.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, OverlayView, InfoWindow } from '@react-google-maps/api';
import Link from 'next/link';
import { MapPin, X, Home, Loader2, Building2, ArrowLeft, AlertTriangle, Car, ShieldCheck, Building, Warehouse, Tent, Landmark } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const LIBRARIES: ('places')[] = ['places'];
const SAUDI_CENTER  = { lat: 23.8859, lng: 45.0792 };
const SAUDI_ZOOM    = 6;
const MAP_CONTAINER = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  gestureHandling: 'greedy',
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
};

// ── Types ────────────────────────────────────────────────────────────────────
interface ListingPin { id: string; shortId?: string; lat: number; lng: number; price: number; type: string; purpose: string; bedrooms?: number; city: string; district?: string; enTitle?: string; arTitle: string; thumb?: string; isFeatured?: boolean; foreignerEligible?: boolean; muslimOnly?: boolean; kind: 'listing'; }
interface ProjectPin  { id: string; nameEn?: string; nameAr: string; lat: number; lng: number; city: string; district?: string; thumb?: string; isFeatured?: boolean; completionStatus?: string; foreignerEligible?: boolean; muslimOnly?: boolean; kind: 'project'; }
type MapPinType = ListingPin | ProjectPin;
interface ClusterPoint { lat: number; lng: number; count: number; hasFeatured: boolean; pins: MapPinType[]; kind: 'cluster'; id: string; }
type MapItem = MapPinType | ClusterPoint;
interface Filters { priceMin: string; priceMax: string; type: string; purpose: string; beds: string; foreignerEligible: boolean; }

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(p: number) {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000)     return `${Math.round(p / 1_000)}K`;
  return p.toLocaleString();
}
const TYPE_LABELS: Record<string, string> = { APARTMENT: 'Apartment', VILLA: 'Villa', FLOOR: 'Floor', RESIDENTIAL_BUILDING: 'Building', OFFICE: 'Office', WAREHOUSE: 'Warehouse', TOWNHOUSE: 'Townhouse', DUPLEX: 'Duplex', REST_HOUSE: 'Rest House', CHALET: 'Chalet', ROOM: 'Room', RESIDENTIAL_LAND: 'Land' };

// ── Clustering ───────────────────────────────────────────────────────────────
function latLngToMercator(lat: number, lng: number, zoom: number) {
  const scale = Math.pow(2, zoom) * 256;
  const siny  = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}
function clusterPins(pins: MapPinType[], zoom: number): MapItem[] {
  if (zoom >= 14) return pins;
  const r = zoom >= 12 ? 40 : zoom >= 10 ? 65 : zoom >= 8 ? 100 : 140;
  const done = new Set<string>();
  const out: MapItem[] = [];
  for (const pin of pins) {
    if (done.has(pin.id)) continue;
    const pt = latLngToMercator(pin.lat, pin.lng, zoom);
    const group: MapPinType[] = [pin];
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
      out.push({ kind: 'cluster', id: `c-${pin.id}`, lat: avgLat, lng: avgLng, count: group.length, hasFeatured: group.some(p => p.isFeatured), pins: group });
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

function getPinIcon(pin: MapPinType) {
  if (pin.kind === 'project') {
    return Building2;
  }
  const l = pin as ListingPin;
  switch (l.type) {
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
function DotPin({ pin, selected, locale, onClick }: { pin: MapPinType; selected: boolean; locale: string; onClick: (e: React.MouseEvent) => void }) {
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

  const Icon = getPinIcon(pin);
  const l = pin as ListingPin;

  return (
    <div 
      onClick={onClick} 
      style={{ 
        transform: 'translate(-50%, -100%)', // Anchor bottom center
        cursor: 'pointer', 
        userSelect: 'none',
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
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
            {isP ? (locale === 'ar' ? 'مشروع' : 'Project') : formatPrice(l.price)}
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

// ── Premium Property Card (2-column layout compatible) ──────────────────────
function PremiumCard({ pin, selected, onClick }: { pin: MapPinType; selected: boolean; onClick: () => void }) {
  const isP = pin.kind === 'project';
  const p   = pin as ProjectPin;
  const l   = pin as ListingPin;
  const title = isP ? (p.nameEn || p.nameAr) : (l.enTitle || l.arTitle);

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-3xl border overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
        selected
          ? 'border-[#064e4b] ring-4 ring-[#064e4b]/5 shadow-lg'
          : 'border-slate-100 hover:border-slate-200/80 hover:shadow-md'
      }`}
    >
      {/* Image Container */}
      <div className="relative h-40 overflow-hidden bg-slate-50">
        {pin.thumb ? (
          <img
            src={pin.thumb}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
            {isP ? <Building2 className="w-8 h-8" /> : <Home className="w-8 h-8" />}
          </div>
        )}

        {/* Feature / Verified Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {pin.isFeatured && (
            <span className="bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
              ★ Featured
            </span>
          )}
        </div>

        {/* Purpose Badge (Buy/Rent) */}
        {!isP && (
          <div className="absolute top-3 right-3">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg shadow-sm ${
              l.purpose === 'SALE' ? 'bg-[#064e4b] text-white' : 'bg-amber-500 text-white'
            }`}>
              {l.purpose === 'SALE' ? 'Buy' : 'Rent'}
            </span>
          </div>
        )}
      </div>

      {/* Info / Content Area */}
      <div className="p-4">
        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isP ? (
            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
              Project
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
              {TYPE_LABELS[l.type] || l.type}
            </span>
          )}
          {pin.foreignerEligible && (
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              pin.muslimOnly 
                ? 'bg-orange-50 text-orange-700 border-orange-100' 
                : 'bg-purple-50 text-purple-700 border-purple-100'
            }`}>
              {pin.muslimOnly ? '🕌 Muslims Only' : '🌍 Foreigner Ok'}
            </span>
          )}
        </div>

        {/* Price or completion status */}
        <div className="flex items-baseline justify-between gap-1 mb-1">
          {isP ? (
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">
              {p.completionStatus?.replace(/_/g, ' ') || 'Off Plan'}
            </span>
          ) : (
            <span className="text-sm font-black text-slate-900">
              SAR {formatPrice(l.price)}
              {l.purpose === 'RENT' && <span className="text-[10px] text-slate-400 font-normal">/yr</span>}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xs font-extrabold text-slate-800 truncate leading-snug group-hover:text-[#064e4b] transition-colors">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mt-1 text-slate-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#064e4b]/70" />
          <span className="text-[10px] font-semibold truncate">
            {pin.district ? `${pin.district}, ` : ''}{pin.city}
          </span>
        </div>

        {/* Specs footer for listings */}
        {!isP && (l.bedrooms || l.type) && (
          <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100 text-slate-500 text-[10px]">
            {l.bedrooms && (
              <span className="font-bold">{l.bedrooms} Beds</span>
            )}
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span className="font-medium truncate">{TYPE_LABELS[l.type] || l.type}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inner map (stable — only rendered after apiKey is known) ─────────────────
interface InnerProps {
  apiKey: string; locale: string;
  onPinsUpdate: (pins: MapPinType[]) => void;
  selectedPin: MapPinType | null;
  onPinSelect: (pin: MapPinType | null) => void;
  externalFilters: Filters;
}

function GoogleMapInner({ apiKey, locale, onPinsUpdate, selectedPin, onPinSelect, externalFilters }: InnerProps) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries: LIBRARIES, id: 'tamleq-maps-sdk' });
  const mapRef   = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom]       = useState(SAUDI_ZOOM);
  const [rawPins, setRawPins] = useState<MapPinType[]>([]);
  const [items, setItems]     = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const filtersRef = useRef(externalFilters);

  useEffect(() => { filtersRef.current = externalFilters; }, [externalFilters]);
  useEffect(() => { setItems(clusterPins(rawPins, zoom)); }, [rawPins, zoom]);

  const fetchPins = useCallback(async (map: google.maps.Map, f: Filters) => {
    const b  = map.getBounds(); if (!b) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const params = new URLSearchParams({ 
      north: String(ne.lat()), 
      south: String(sw.lat()), 
      east: String(ne.lng()), 
      west: String(sw.lng()), 
      ...(f.priceMin && { price_min: f.priceMin }), 
      ...(f.priceMax && { price_max: f.priceMax }), 
      ...(f.type && { type: f.type }), 
      ...(f.purpose && { purpose: f.purpose }), 
      ...(f.beds && { beds: f.beds }),
      ...(f.foreignerEligible && { foreignerEligible: 'true' })
    });
    try {
      setLoading(true);
      const r = await fetch(`${base}/listings/map?${params}`);
      const j = await r.json();
      if (j.success) {
        const combined: MapPinType[] = [
          ...j.data.projects.filter((p: any) => typeof p.lat === 'number' && typeof p.lng === 'number'),
          ...j.data.listings.filter((l: any) => typeof l.lat === 'number' && typeof l.lng === 'number'),
        ];
        combined.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        setRawPins(combined);
        onPinsUpdate(combined);
      }
    } catch (e) { console.error('[Map] fetch:', e); }
    finally { setLoading(false); }
  }, [onPinsUpdate]);

  const handleIdle = useCallback(() => {
    if (!mapRef.current) return;
    setZoom(mapRef.current.getZoom() ?? SAUDI_ZOOM);
    fetchPins(mapRef.current, filtersRef.current);
  }, [fetchPins]);

  useEffect(() => { if (mapRef.current) fetchPins(mapRef.current, externalFilters); }, [externalFilters, fetchPins]);

  if (loadError) return <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center"><AlertTriangle className="w-10 h-10 text-rose-400" /><p className="font-black text-slate-700">Map failed to load</p><p className="text-slate-400 text-sm max-w-xs">{loadError.message}</p></div>;
  if (!isLoaded)  return <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" /><span className="text-xs font-bold uppercase text-slate-400">Loading Google Maps...</span></div>;

  const selectedProject = selectedPin?.kind === 'project' ? selectedPin as ProjectPin : null;
  const selectedListing = selectedPin?.kind === 'listing' ? selectedPin as ListingPin : null;
  const detailUrl = selectedPin
    ? (selectedPin.kind === 'project'
        ? `/${locale}/projects/${selectedPin.id}`
        : `/${locale}/listings/${(selectedPin as ListingPin).shortId || selectedPin.id}`)
    : '';

  return (
    <>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER}
        center={SAUDI_CENTER}
        zoom={SAUDI_ZOOM}
        options={MAP_OPTIONS}
        onLoad={m => { mapRef.current = m; }}
        onIdle={handleIdle}
        onClick={() => onPinSelect(null)}
      >
        {/* Cluster badges */}
        {items.filter(i => i.kind === 'cluster').map(i => {
          const c = i as ClusterPoint;
          return (
            <OverlayView key={c.id} position={{ lat: c.lat, lng: c.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
              <ClusterBadge item={c} onClick={() => {
                if (mapRef.current) { mapRef.current.setZoom((mapRef.current.getZoom() ?? 8) + 3); mapRef.current.panTo({ lat: c.lat, lng: c.lng }); }
              }} />
            </OverlayView>
          );
        })}

        {/* Individual dot pins */}
        {items.filter(i => i.kind !== 'cluster').map(i => {
          const pin = i as MapPinType;
          return (
            <OverlayView key={`${pin.kind}-${pin.id}`} position={{ lat: pin.lat, lng: pin.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={() => ({ x: 0, y: 0 })}>
              <DotPin pin={pin} selected={selectedPin?.id === pin.id} locale={locale} onClick={e => { e.stopPropagation?.(); onPinSelect(pin); }} />
            </OverlayView>
          );
        })}

        {/* InfoWindow popup on selected pin */}
        {selectedPin && (
          <InfoWindow position={{ lat: selectedPin.lat, lng: selectedPin.lng }} onCloseClick={() => onPinSelect(null)}>
            <div style={{ width: 200, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
              {/* Thumbnail */}
              {selectedPin.thumb
                ? <img src={selectedPin.thumb} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10, display: 'block', marginBottom: 8 }} />
                : <div style={{ width: '100%', height: 70, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: '#cbd5e1' }}>📍</div>
              }
              {/* Badge */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, padding: '2px 7px', borderRadius: 6, background: selectedPin.kind === 'project' ? '#eff6ff' : '#ecfdf5', color: selectedPin.kind === 'project' ? '#1d4ed8' : '#059669' }}>
                  {selectedPin.kind === 'project' ? 'Project' : (TYPE_LABELS[(selectedPin as ListingPin).type] || 'Listing')}
                </span>
                {selectedPin.foreignerEligible && (
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, padding: '2px 7px', borderRadius: 6, background: selectedPin.muslimOnly ? '#fff7ed' : '#f5f3ff', color: selectedPin.muslimOnly ? '#c2410c' : '#6d28d9' }}>
                    {selectedPin.muslimOnly ? '🕌 Muslim Only' : '🌍 Foreigner Ok'}
                  </span>
                )}
              </div>
              {/* Title */}
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedProject ? (selectedProject.nameEn || selectedProject.nameAr) : (selectedListing?.enTitle || selectedListing?.arTitle)}
              </p>
              {/* Location */}
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b' }}>
                {selectedPin.district ? `${selectedPin.district}, ` : ''}{selectedPin.city}
              </p>
              {/* Price / status */}
              {selectedProject
                ? <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{selectedProject.completionStatus?.replace(/_/g,' ') || 'Off Plan'}</p>
                : selectedListing?.price
                  ? <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 900, color: '#064e4b' }}>SAR {formatPrice(selectedListing.price)}</p>
                  : null
              }
              {/* CTA */}
              <a href={detailUrl} style={{ display: 'block', textAlign: 'center', background: '#064e4b', color: 'white', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 800, textDecoration: 'none', letterSpacing: 0.5 }}>
                View Details →
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm font-bold text-slate-700 z-10 pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin text-[#064e4b]" />
          Updating...
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MapViewPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [keyLoading, setKeyLoading]       = useState(true);
  const [keyError, setKeyError]           = useState('');

  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (env) { setGoogleMapsKey(env); setKeyLoading(false); return; }
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    fetch(`${base}/listings/maps-config`)
      .then(r => r.json())
      .then(j => { if (j.success && j.googleMapsKey) setGoogleMapsKey(j.googleMapsKey); else setKeyError('Add Google Maps key in Admin → Site Settings.'); })
      .catch(() => setKeyError('Could not reach server for map config.'))
      .finally(() => setKeyLoading(false));
  }, []);

  const [allPins, setAllPins]         = useState<MapPinType[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [filters, setFilters]         = useState<Filters>({ priceMin: '', priceMax: '', type: '', purpose: '', beds: '', foreignerEligible: false });
  const setF = (k: keyof Filters, v: string | boolean) => setFilters(f => ({ ...f, [k]: v }));
  const clearF = () => setFilters({ priceMin: '', priceMax: '', type: '', purpose: '', beds: '', foreignerEligible: false });

  const sorted = [...allPins].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  return (
    /* Outer div fills 100% of the fixed container set by NavWrapper */
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Filter Strip ──────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }} className="w-full bg-white border-b border-slate-200 py-3 px-4 flex flex-wrap items-center gap-2.5 z-30 shadow-sm">
        <Link href={`/${locale}`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 shrink-0">
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </Link>
        <h1 className="font-black text-slate-900 text-sm tracking-wide shrink-0">Map Search</h1>

        {/* Switcher to Drive Time Commute page */}
        <Link href={`/${locale}/drive-time`} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-[#064e4b] hover:bg-emerald-100/80 rounded-xl text-xs font-black transition-all border border-emerald-150 shrink-0 shadow-sm">
          <Car className="w-3.5 h-3.5 text-emerald-700" />
          Search by Commute Time
        </Link>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[['', 'All'], ['SALE', 'Buy'], ['RENT', 'Rent']].map(([k, l]) => (
            <button key={k} onClick={() => setF('purpose', k)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filters.purpose === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={filters.type} onChange={e => setF('type', e.target.value)} className="border border-slate-200 bg-slate-50 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none">
          <option value="">All Property Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.beds} onChange={e => setF('beds', e.target.value)} className="border border-slate-200 bg-slate-50 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none">
          <option value="">Bedrooms (Any)</option>
          {['1','2','3','4','5'].map(b => <option key={b} value={b}>{b}+ Beds</option>)}
        </select>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-[10px] font-black text-slate-400 uppercase">SAR</span>
          <input type="number" placeholder="Min" value={filters.priceMin} onChange={e => setF('priceMin', e.target.value)} className="w-20 bg-transparent text-xs font-bold outline-none text-slate-700 placeholder:text-slate-300" />
          <span className="text-slate-300">|</span>
          <input type="number" placeholder="Max" value={filters.priceMax} onChange={e => setF('priceMax', e.target.value)} className="w-20 bg-transparent text-xs font-bold outline-none text-slate-700 placeholder:text-slate-300" />
        </div>
        <button
          onClick={() => setF('foreignerEligible', !filters.foreignerEligible)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border shrink-0 ${
            filters.foreignerEligible
              ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-350'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${filters.foreignerEligible ? 'text-purple-600' : 'text-slate-400'}`} />
          Foreigner Eligible
        </button>
        {Object.values(filters).some(Boolean) && (
          <button onClick={clearF} className="flex items-center gap-1.5 text-xs font-bold text-rose-500 pl-2 border-l border-slate-200"><X className="w-3.5 h-3.5" /> Clear</button>
        )}
        <div className="flex-1" />
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
          {allPins.length} {allPins.length !== 1 ? 'properties' : 'property'} in view
        </div>
      </div>

      {/* ── Split panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left list - beautiful 2-column grid container */}
        <div className="w-full lg:w-[680px] shrink-0 border-r border-slate-250 bg-white overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
              <MapPin className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-semibold">No properties in this area</p>
              <p className="text-slate-300 text-xs mt-1">Pan or zoom out to explore</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sorted.map(pin => (
                <PremiumCard key={`${pin.kind}-${pin.id}`} pin={pin} selected={selectedPin?.id === pin.id} onClick={() => { setSelectedPin(pin); }} />
              ))}
            </div>
          )}
        </div>

        {/* Right map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {keyLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-8 h-8 animate-spin text-[#064e4b]" />
              <span className="text-xs font-bold uppercase text-slate-400">Loading map config...</span>
            </div>
          ) : keyError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-50">
              <MapPin className="w-12 h-12 text-slate-300" />
              <p className="font-black text-slate-700 text-lg">API Key Required</p>
              <p className="text-slate-400 text-sm max-w-xs">{keyError}</p>
            </div>
          ) : (
            <GoogleMapInner apiKey={googleMapsKey} locale={locale} onPinsUpdate={setAllPins} selectedPin={selectedPin} onPinSelect={setSelectedPin} externalFilters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
