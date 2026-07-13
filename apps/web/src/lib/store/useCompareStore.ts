import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api';

interface CompareStore {
  comparedListings: string[]; // UUID strings
  comparedProjects: string[]; // UUID strings
  loggedSets: string[]; // Track logged sets per tab session, e.g. "listing:A,B"
  addListing: (id: string) => void;
  removeListing: (id: string) => void;
  addProject: (id: string) => void;
  removeProject: (id: string) => void;
  clearAllListings: () => void;
  clearAllProjects: () => void;
  syncLoggedComparison: (type: 'listings' | 'projects') => void;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      comparedListings: [],
      comparedProjects: [],
      loggedSets: [],

      addListing: (id) => {
        const { comparedListings } = get();
        if (comparedListings.includes(id)) return;
        if (comparedListings.length >= 4) return;
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(20);
        }
        set({ comparedListings: [...comparedListings, id] });
      },

      removeListing: (id) => {
        const { comparedListings } = get();
        set({ comparedListings: comparedListings.filter((x) => x !== id) });
      },

      addProject: (id) => {
        const { comparedProjects } = get();
        if (comparedProjects.includes(id)) return;
        if (comparedProjects.length >= 4) return;
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(20);
        }
        set({ comparedProjects: [...comparedProjects, id] });
      },

      removeProject: (id) => {
        const { comparedProjects } = get();
        set({ comparedProjects: comparedProjects.filter((x) => x !== id) });
      },

      clearAllListings: () => set({ comparedListings: [] }),
      clearAllProjects: () => set({ comparedProjects: [] }),

      syncLoggedComparison: async (type) => {
        const { comparedListings, comparedProjects, loggedSets } = get();
        const ids = type === 'listings' ? comparedListings : comparedProjects;
        
        // Log relations only when we have at least 2 items compared
        if (ids.length < 2) return;

        // Create a unique key for this combination
        const sortedIdsKey = `${type}:${[...ids].sort().join(',')}`;
        if (loggedSets.includes(sortedIdsKey)) return;

        try {
          if (type === 'listings') {
            await api.logListingsComparison(ids);
          } else {
            await api.logProjectsComparison(ids);
          }
          // Record that this combination has been logged in this session
          set({ loggedSets: [...loggedSets, sortedIdsKey] });
        } catch (e) {
          console.error('[CompareStore] Failed to log comparison set', e);
        }
      },
    }),
    {
      name: 'saudi-re-compare-store',
      // Only persist selected lists, exclude loggedSets (tab session only)
      partialize: (state) => ({
        comparedListings: state.comparedListings,
        comparedProjects: state.comparedProjects,
      }),
    }
  )
);
