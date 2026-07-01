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
import {
  MapPin, SlidersHorizontal, ChevronDown, Filter, Loader2,
  Building2, Home, ArrowLeft, Car, ArrowRight, Settings, Info, Search, X
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
  const siny  = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
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

// ── Clean dot pin (no label — click shows popup) ─────────────────────────────
function DotPin({ pin, selected, onClick }: { pin: CommutePin; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  const isProject = pin.kind === 'project';
  const isFeatured = pin.isFeatured;
  const bg = selected ? '#064e4b' : isProject ? '#1e40af' : (isFeatured ? '#f59e0b' : '#0d9488');
  const ring = selected ? '0 0 0 3px rgba(6,78,75,0.35)' : 'none';

  return (
    <div onClick={onClick} style={{ transform: 'translate(-50%,-50%)', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: bg,
        border: '3px solid white',
        boxShadow: `0 2px 6px rgba(0,0,0,0.25), ${ring}`,
        transition: 'all 0.15s',
        transform: selected ? 'scale(1.5)' : 'scale(1)',
      }} />
    </div>
  );
}

// ── Google Map Wrapper ──

interface MapWrapperProps {
  pointA: { lat: number; lng: number } | null;
  pointB: { lat: number; lng: number } | null;
  polyAPath: { lat: number; lng: number }[] | null;
  polyBPath: { lat: number; lng: number }[] | null;
  pins: CommutePin[];
  selectedPin: CommutePin | null;
  setSelectedPin: (pin: CommutePin | null) => void;
  onLoad: (mapInstance: google.maps.Map) => void;
  handleMapClick: (e: google.maps.MapMouseEvent) => void;
  locale: string;
}

function GoogleMapWrapper({
  pointA,
  pointB,
  polyAPath,
  polyBPath,
  pins,
  selectedPin,
  setSelectedPin,
  onLoad,
  handleMapClick,
  locale
}: MapWrapperProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);
  const [items, setItems] = useState<MapItem[]>([]);

  useEffect(() => {
    setItems(clusterCommutePins(pins, zoom));
  }, [pins, zoom]);

  const handleIdle = useCallback(() => {
    if (mapRef.current) {
      setZoom(mapRef.current.getZoom() ?? 12);
    }
  }, []);

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
      onClick={() => setSelectedPin(null)}
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
      {/* Point A Marker */}
      {pointA && (
        <MarkerF
          position={{ lat: pointA.lat, lng: pointA.lng }}
          label={{ text: 'A', color: 'white', fontWeight: 'black' }}
        />
      )}

      {/* Point B Marker */}
      {pointB && (
        <MarkerF
          position={{ lat: pointB.lat, lng: pointB.lng }}
          label={{ text: 'B', color: 'white', fontWeight: 'black' }}
        />
      )}

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
        const pin = i as CommutePin;
        return (
          <OverlayView key={`${pin.kind}-${pin.id}`} position={{ lat: pin.lat, lng: pin.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={() => ({ x: 0, y: 0 })}>
            <DotPin pin={pin} selected={selectedPin?.id === pin.id} onClick={e => { e.stopPropagation?.(); setSelectedPin(pin); }} />
          </OverlayView>
        );
      })}

      {/* InfoWindow popup */}
      {selectedPin && (
        <InfoWindow position={{ lat: selectedPin.lat, lng: selectedPin.lng }} onCloseClick={() => setSelectedPin(null)}>
          <div className="bg-white overflow-hidden w-[200px] font-sans">
            {selectedPin.thumb ? (
              <img src={selectedPin.thumb} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
            ) : (
              <div className="w-full h-20 bg-slate-100 flex items-center justify-center rounded-lg text-slate-300 mb-2">
                <Home className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg mb-1 ${
                selectedPin.kind === 'project' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
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
  onClick: () => void;
}

function PremiumCommuteCard({ pin, selected, onClick }: PremiumCardProps) {
  const isP = pin.kind === 'project';
  const title = isP ? (pin.nameEn || pin.nameAr) : (pin.enTitle || pin.arTitle);

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
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {pin.isFeatured && (
            <span className="bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
              ★ Featured
            </span>
          )}
          {isP ? (
            <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
              Project
            </span>
          ) : (
            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
              {TYPE_LABELS[pin.type] || pin.type}
            </span>
          )}
        </div>

        {/* Purpose Badge (Buy/Rent) */}
        {!isP && (
          <div className="absolute top-3 right-3">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg shadow-sm ${
              pin.purpose === 'SALE' ? 'bg-[#064e4b] text-white' : 'bg-amber-500 text-white'
            }`}>
              {pin.purpose === 'SALE' ? 'Buy' : 'Rent'}
            </span>
          </div>
        )}
      </div>

      {/* Info / Content Area */}
      <div className="p-4">
        {/* Price or completion status */}
        <div className="flex items-baseline justify-between gap-1 mb-1">
          {isP ? (
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">
              {pin.completionStatus?.replace(/_/g, ' ') || 'Off Plan'}
            </span>
          ) : (
            <span className="text-sm font-black text-slate-900">
              SAR {formatPrice(pin.price)}
              {pin.purpose === 'RENT' && <span className="text-[10px] text-slate-400 font-normal">/yr</span>}
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

        {/* Commute Badge Grid Footer */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100">
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-lg">
            <Car className="w-3 h-3 text-emerald-600" />
            <span>{pin.driveTimeA}m to A</span>
          </span>
          {pin.driveTimeB && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded-lg">
              <Car className="w-3 h-3 text-blue-600" />
              <span>{pin.driveTimeB}m to B</span>
            </span>
          )}
        </div>
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
  // Load Maps SDK dynamically inside child component
  const { isLoaded: mapsLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    id: 'tamleq-maps-sdk',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [pointA, setPointA] = useState<{ lat: number; lng: number } | null>({ lat: 24.7136, lng: 46.6753 });
  const [pointB, setPointB] = useState<{ lat: number; lng: number } | null>(null);
  const [pointALabel, setPointALabel] = useState<string>('Riyadh City Center');
  const [pointBLabel, setPointBLabel] = useState<string>('');
  const [settingPoint, setSettingPoint] = useState<'A' | 'B'>('A');

  // Refs for autocomplete inputs
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const acARef    = useRef<google.maps.places.Autocomplete | null>(null);
  const acBRef    = useRef<google.maps.places.Autocomplete | null>(null);

  const [minutes, setMinutes] = useState<number>(30);
  const [mode, setMode] = useState<'balanced' | 'nearestA' | 'nearestB'>('balanced');
  const [filters, setFilters] = useState<Filters>({
    priceMin: '', priceMax: '', type: '', purpose: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pins, setPins] = useState<CommutePin[]>([]);
  const [polygons, setPolygons] = useState<{ polyA: number[][][] | null; polyB: number[][][] | null }>({
    polyA: null,
    polyB: null
  });
  const [selectedPin, setSelectedPin] = useState<CommutePin | null>(null);

  // Init Google Places Autocomplete on the input fields once SDK is ready
  useEffect(() => {
    if (!mapsLoaded) return;
    if (typeof google === 'undefined' || !google.maps?.places) return;

    const opts: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: 'sa' },
      fields: ['geometry', 'formatted_address', 'name'],
    };

    if (inputARef.current && !acARef.current) {
      acARef.current = new google.maps.places.Autocomplete(inputARef.current, opts);
      acARef.current.addListener('place_changed', () => {
        const place = acARef.current!.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setPointA({ lat, lng });
          setPointALabel(place.name || place.formatted_address || '');
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(13);
          }
        }
      });
    }

    if (inputBRef.current && !acBRef.current) {
      acBRef.current = new google.maps.places.Autocomplete(inputBRef.current, opts);
      acBRef.current.addListener('place_changed', () => {
        const place = acBRef.current!.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setPointB({ lat, lng });
          setPointBLabel(place.name || place.formatted_address || '');
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(13);
          }
        }
      });
    }
  }, [mapsLoaded, map]);

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
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        // Sort featured first
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

  // Reverse geocoding helper to translate map click coordinates into human-readable locations
  const reverseGeocode = useCallback((lat: number, lng: number, target: 'A' | 'B') => {
    if (typeof google === 'undefined' || !google.maps?.Geocoder) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address || '';
        if (target === 'A') {
          setPointALabel(address);
          if (inputARef.current) inputARef.current.value = address;
        } else {
          setPointBLabel(address);
          if (inputBRef.current) inputBRef.current.value = address;
        }
      } else {
        const coordsStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (target === 'A') {
          setPointALabel(coordsStr);
          if (inputARef.current) inputARef.current.value = coordsStr;
        } else {
          setPointBLabel(coordsStr);
          if (inputBRef.current) inputBRef.current.value = coordsStr;
        }
      }
    });
  }, []);

  // Handle map click to drop pins
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat && lng) {
      if (settingPoint === 'A') {
        setPointA({ lat, lng });
        reverseGeocode(lat, lng, 'A');
      } else {
        setPointB({ lat, lng });
        reverseGeocode(lat, lng, 'B');
      }
    }
  }, [settingPoint, reverseGeocode]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Convert GeoJSON polygon coordinates [lng, lat] to Google Maps `{ lat, lng }` path
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
    <div className="flex h-full overflow-hidden bg-slate-50">
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

      {/* ── Left Control & Results Sidebar ── */}
      <div className="w-full lg:w-[680px] shrink-0 flex flex-col border-r border-slate-200 bg-white">
        {/* Commute setup headers */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/map`} className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="font-black text-slate-900 text-sm uppercase tracking-wider">Search by Commute Time</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Saudi Commute MVP</p>
            </div>
          </div>

          {/* Commute controls */}
          <div className="space-y-3">
            {/* Point A search box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">A</div>
                First Point of Interest
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputARef}
                  type="text"
                  placeholder="Search area, landmark, address..."
                  defaultValue={pointALabel}
                  onChange={e => setPointALabel(e.target.value)}
                  onFocus={() => setSettingPoint('A')}
                  className="w-full pl-9 pr-8 py-2.5 text-xs font-semibold border border-emerald-200 bg-emerald-50/50 rounded-xl outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {pointA && (
                  <button onClick={() => { setPointA(null); setPointALabel(''); if (inputARef.current) inputARef.current.value = ''; }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
              {pointA && (
                <p className="text-[9px] text-emerald-600 font-bold pl-1">📍 {pointA.lat.toFixed(4)}, {pointA.lng.toFixed(4)}</p>
              )}
            </div>

            {/* Point B search box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">B</div>
                Second Point (Optional)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={inputBRef}
                  type="text"
                  placeholder="Add a second commute point..."
                  defaultValue={pointBLabel}
                  onChange={e => setPointBLabel(e.target.value)}
                  onFocus={() => setSettingPoint('B')}
                  className="w-full pl-9 pr-8 py-2.5 text-xs font-semibold border border-blue-100 bg-blue-50/30 rounded-xl outline-none focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {pointB && (
                  <button onClick={() => { setPointB(null); setPointBLabel(''); if (inputBRef.current) inputBRef.current.value = ''; setPolygons(p => ({ ...p, polyB: null })); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
              {pointB && (
                <p className="text-[9px] text-blue-600 font-bold pl-1">📍 {pointB.lat.toFixed(4)}, {pointB.lng.toFixed(4)}</p>
              )}
            </div>

            {/* Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Maximum Drive Time</span>
                <span className="text-[#064e4b] font-black">{minutes} minutes</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={minutes}
                onChange={e => setMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#064e4b]"
              />
            </div>

            {/* Sort mode & filters trigger */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider outline-none text-slate-700 focus:border-emerald-500"
              >
                <option value="balanced">Balanced Proximity</option>
                <option value="nearestA">Nearest to Point A</option>
                {pointB && <option value="nearestB">Nearest to Point B</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Sync instructions */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Click on the map to place/adjust commute pins</span>
        </div>

        {/* Property cards listing - 2-column grid format */}
        <div className="flex-1 overflow-y-auto">
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

          {!loading && !error && pins.length === 0 && (
            <div className="text-center py-16 text-slate-400 px-4">
              <Car className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-wider">No properties reachable</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">
                Try expanding drive time range or moving Point A / B closer to residential zones.
              </p>
            </div>
          )}

          {!loading && !error && pins.length > 0 && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pins.map(pin => (
                <PremiumCommuteCard
                  key={`${pin.kind}-${pin.id}`}
                  pin={pin}
                  selected={selectedPin?.id === pin.id}
                  onClick={() => flyToPin(pin)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Google Map ── */}
      <div className="flex-1 relative">
        <GoogleMapWrapper
          pointA={pointA}
          pointB={pointB}
          polyAPath={polyAPath}
          polyBPath={polyBPath}
          pins={pins}
          selectedPin={selectedPin}
          setSelectedPin={setSelectedPin}
          onLoad={onLoad}
          handleMapClick={handleMapClick}
          locale={locale}
        />
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
