import { useState, useCallback } from 'react';

interface GeolocationState {
  coordinates: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    if (!navigator.geolocation) {
      setState({
        coordinates: null,
        error: 'Geolocation is not supported by your browser.',
        loading: false,
      });
      return;
    }

    let resolved = false;

    // Safety timeout: force loading to stop after 6 seconds if callbacks never fire
    const safetyTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setState({
          coordinates: null,
          error: 'Location request timed out. Please enter location manually.',
          loading: false,
        });
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimeout);
          setState({
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            error: null,
            loading: false,
          });
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimeout);
          setState({
            coordinates: null,
            error: error.message || 'Location permission denied or timed out.',
            loading: false,
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // Strict 5-second timeout as per plan
        maximumAge: 0,
      }
    );
  }, []);

  return { ...state, requestLocation };
}
