'use client';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

const SESSION_KEY_STORAGE = 'sre_view_session_key';

/**
 * Returns a stable session key for anonymous view de-duplication.
 * Stored in localStorage so it persists across page refreshes within the same browser.
 */
function getOrCreateSessionKey(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY_STORAGE);
    if (existing) return existing;
    const newKey = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY_STORAGE, newKey);
    return newKey;
  } catch {
    // localStorage not available (SSR or incognito with storage disabled)
    return `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * usePropertyView
 *
 * Fires a tracked, de-duplicated view event after a 3-second dwell time.
 * - Works for logged-in users (JWT sent automatically by api client).
 * - Works for anonymous users via a stable localStorage session key.
 * - Fire-and-forget: errors are silently swallowed to never affect UX.
 *
 * @param propertyId  - The UUID of the listing or project
 * @param propertyType - 'listing' or 'project'
 */
export function usePropertyView(
  propertyId: string | null | undefined,
  propertyType: 'listing' | 'project'
) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Guard: only run once per mount, and only when propertyId is ready
    if (!propertyId || hasTracked.current) return;

    const sessionKey = getOrCreateSessionKey();

    // 3-second dwell time before recording view (filters accidental navigation & bots)
    const timer = setTimeout(() => {
      hasTracked.current = true;
      api.trackPropertyView({
        propertyType,
        propertyId,
        sessionKey,
        source: 'web',
      }).catch(() => {
        // Silent fail - view tracking must never break the page
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [propertyId, propertyType]);
}

/**
 * getViewSessionKey
 *
 * Exported utility so the auth flow can call it to link pre-login views
 * to the user after a successful login.
 */
export function getViewSessionKey(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY_STORAGE);
  } catch {
    return null;
  }
}
