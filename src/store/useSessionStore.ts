import { create } from 'zustand';

interface SessionState {
  // User selections
  selectedVibe: string | null;
  selectedCraving: string | null;
  budget: string | null;
  distance: 'Near' | 'Distant';
  manualLocation: string | null;
  theme: 'light' | 'dark';
  
  // Geolocation data
  coordinates: { lat: number; lng: number } | null;
  
  // Results
  candidates: any[];
  aiResults: any[];
  weatherInfo: string | null;
  
  // Actions
  setVibe: (vibe: string | null) => void;
  setCraving: (craving: string | null) => void;
  setBudget: (budget: string | null) => void;
  setDistance: (distance: 'Near' | 'Distant') => void;
  setManualLocation: (location: string | null) => void;
  setCoordinates: (lat: number, lng: number) => void;
  setCandidates: (candidates: any[]) => void;
  setAiResults: (results: any[]) => void;
  setWeatherInfo: (info: string | null) => void;
  toggleTheme: () => void;
  
  // Reset for aggressive garbage collection
  reset: () => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Optional: detect system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
};

const initialState = {
  selectedVibe: null,
  selectedCraving: null,
  budget: null,
  distance: 'Near' as const,
  manualLocation: null,
  coordinates: null,
  candidates: [],
  aiResults: [],
  weatherInfo: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  theme: getInitialTheme(),
  
  setVibe: (vibe) => set({ selectedVibe: vibe }),
  setCraving: (craving) => set({ selectedCraving: craving }),
  setBudget: (budget) => set({ budget }),
  setDistance: (distance) => set({ distance }),
  setManualLocation: (location) => set({ manualLocation: location }),
  setCoordinates: (lat, lng) => set({ coordinates: { lat, lng } }),
  setCandidates: (candidates) => set({ candidates }),
  setAiResults: (results) => set({ aiResults: results }),
  setWeatherInfo: (weatherInfo) => set({ weatherInfo }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
    }
    return { theme: nextTheme };
  }),
  
  reset: () => set((state) => ({ ...initialState, theme: state.theme })),
}));
