/**
 * parseGoogleMapsUrl
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts lat/lng from any Google Maps URL that a broker might paste.
 *
 * Supported patterns (in priority order):
 *   1. !3d{lat}!4d{lng}   — actual pin location encoded in the URL data block
 *   2. @{lat},{lng}        — viewport centre from /@ path segment
 *   3. ?q={lat},{lng}      — direct coordinate query param
 *   4. embed?pb= decode    — lat/lng embedded inside the proto-base64 `pb` param
 *   5. iframe HTML src=""  — if broker pasted full <iframe> HTML instead of URL
 *
 * Returns null for:
 *   - Short URLs (maps.app.goo.gl) — these need a server-side redirect follow
 *   - Named place URLs with no coordinates (rare, means broker pasted wrong thing)
 *
 * Saudi Arabia coordinate sanity check:
 *   lat: 16.0  – 32.2
 *   lng: 36.5  – 55.7
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  /** 'high' = actual pin (!3d!4d), 'low' = viewport centre or query coord */
  confidence: 'high' | 'low';
  /** Which pattern matched — useful for debugging / logging */
  source: 'pin_3d4d' | 'viewport_at' | 'query_q' | 'embed_pb' | 'iframe_src';
}

// Saudi Arabia bounding box (with generous padding for expats near borders)
const SAUDI_BOUNDS = {
  latMin: 15.0,
  latMax: 33.0,
  lngMin: 34.0,
  lngMax: 57.0,
};

function isWithinSaudiArabia(lat: number, lng: number): boolean {
  return (
    lat >= SAUDI_BOUNDS.latMin &&
    lat <= SAUDI_BOUNDS.latMax &&
    lng >= SAUDI_BOUNDS.lngMin &&
    lng <= SAUDI_BOUNDS.lngMax
  );
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Main export — parse any Google Maps input and return coordinates.
 * Returns null if no coordinates could be extracted.
 */
export function parseGoogleMapsUrl(input: string): ParsedCoordinates | null {
  if (!input || typeof input !== 'string') return null;

  const raw = input.trim();

  // ── Pattern 5: Extract URL from <iframe> HTML first ──────────────────────
  // Broker may paste: <iframe src="https://www.google.com/maps/embed?pb=..." ...>
  let url = raw;
  if (raw.startsWith('<')) {
    const srcMatch = raw.match(/src="([^"]+)"/);
    if (!srcMatch) return null;
    url = srcMatch[1];
  }

  // ── Pattern 1: !3d{lat}!4d{lng} — highest accuracy ───────────────────────
  // Example: ...!3d24.8043234!4d46.6073023...
  const pinMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return {
        lat,
        lng,
        confidence: 'high',
        source: 'pin_3d4d',
      };
    }
  }

  // ── Pattern 2: @{lat},{lng},{zoom} — viewport centre ─────────────────────
  // Example: /@24.8043234,46.6073023,17z
  const viewportMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (viewportMatch) {
    const lat = parseFloat(viewportMatch[1]);
    const lng = parseFloat(viewportMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return {
        lat,
        lng,
        confidence: 'low',
        source: 'viewport_at',
      };
    }
  }

  // ── Pattern 3: ?q={lat},{lng} or q={lat}+{lng} ───────────────────────────
  // Example: https://maps.google.com/?q=24.8043234,46.6073023
  try {
    const urlObj = new URL(url);
    const q = urlObj.searchParams.get('q');
    if (q) {
      // Handles both "24.80,46.60" and "24.80+46.60"
      const coordMatch = q.match(/^(-?\d+\.?\d*)[,+](-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (isValidLatLng(lat, lng)) {
          return {
            lat,
            lng,
            confidence: 'low',
            source: 'query_q',
          };
        }
      }
    }

    // ── Pattern 4: Embed URL with pb= parameter ─────────────────────────────
    // The `pb` parameter is a complex proto-encoded string that often contains
    // !2d{lng}!3d{lat} within it, OR the coordinates appear as the 1st and 2nd
    // float values in the pb string.
    const pb = urlObj.searchParams.get('pb');
    if (pb) {
      // Try !2d (lng) and !3d (lat) encoding within pb
      const pbPinMatch = pb.match(/!3d(-?\d+\.?\d*)/) ;
      const pbLngMatch = pb.match(/!2d(-?\d+\.?\d*)/);
      if (pbPinMatch && pbLngMatch) {
        const lat = parseFloat(pbPinMatch[1]);
        const lng = parseFloat(pbLngMatch[1]);
        if (isValidLatLng(lat, lng)) {
          return {
            lat,
            lng,
            confidence: 'high',
            source: 'embed_pb',
          };
        }
      }
    }
  } catch {
    // URL parse failed — continue to next pattern (might be non-standard URL)
  }

  // ── Degree-Minute-Second format in path ───────────────────────────────────
  // Example: /maps/place/21°30'16.0"N+39°13'37.8"E/
  const dmsMatch = url.match(
    /(\d+)°(\d+)'([\d.]+)"([NS])\+(\d+)°(\d+)'([\d.]+)"([EW])/
  );
  if (dmsMatch) {
    const latDeg = parseInt(dmsMatch[1]);
    const latMin = parseInt(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4];
    const lngDeg = parseInt(dmsMatch[5]);
    const lngMin = parseInt(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngDir = dmsMatch[8];

    let lat = latDeg + latMin / 60 + latSec / 3600;
    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (latDir === 'S') lat = -lat;
    if (lngDir === 'W') lng = -lng;

    if (isValidLatLng(lat, lng)) {
      return {
        lat,
        lng,
        confidence: 'high',
        source: 'pin_3d4d', // DMS is always a pin
      };
    }
  }

  return null;
}

/**
 * Convenience wrapper — returns just { lat, lng } or null.
 * Useful when you don't need confidence/source metadata.
 */
export function extractLatLng(
  input: string | null | undefined
): { lat: number; lng: number } | null {
  if (!input) return null;
  const result = parseGoogleMapsUrl(input);
  if (!result) return null;
  return { lat: result.lat, lng: result.lng };
}

/**
 * isShortUrl — detect maps.app.goo.gl style links that need server-side expansion.
 * These cannot be parsed client-side without an HTTP redirect follow.
 */
export function isShortGoogleMapsUrl(input: string): boolean {
  return /maps\.app\.goo\.gl/.test(input) || /goo\.gl\/maps/.test(input);
}
