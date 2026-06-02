import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { useNavigate } from 'react-router-dom';

const generateFallbackResults = (candidates: any[]) => {
  const getScore = (c: any) => {
    const rating = c.rating || 0;
    const count = c.userRatingCount || 0;
    return rating * Math.log10(count + 1); // Log scale ensures popularity scales gracefully
  };

  const sortedCandidates = [...candidates].sort((a, b) => getScore(b) - getScore(a));
  return sortedCandidates.slice(0, 3).map(c => ({
    id: c.id,
    name: c.displayName?.text || c.name || 'Unknown Restaurant',
    distance: useSessionStore.getState().distance || 'Near',
    tags: c.types ? c.types.slice(0, 2).map((t: string) => t.replace(/_/g, ' ')) : ['restaurant'],
    ai_reasoning: '⚠️ AI reasoning is currently unavailable due to high traffic. Showing top-rated local options instead.',
  }));
};

export function useOrchestrator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelPipeline = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startPipeline = useCallback(async () => {
    // Cancel any in-flight pipeline before starting a new one
    cancelPipeline();
    const controller = new AbortController();
    let isTimeout = false;
    const timeoutId = setTimeout(() => {
      isTimeout = true;
      controller.abort();
    }, 9000);
    abortControllerRef.current = controller;
    const { signal } = controller;

    try {
      console.log('[Orchestrator] Starting search pipeline...');
      setError(null);

      // Snapshot the store values once at the start to avoid stale closure issues
      const { coordinates, manualLocation, selectedCraving, budget, distance } = useSessionStore.getState();
      console.log('[Orchestrator] Selections loaded:', { coordinates, manualLocation, selectedCraving, budget, distance });
      
      // Combine UI loading states
      setCurrentStep('Scouting local spots & skies...');
      const timeInfo = new Date().toLocaleString();

      // Prepare payload for Weather
      const weatherPayload: Record<string, any> = {};
      if (coordinates) {
        weatherPayload.lat = coordinates.lat;
        weatherPayload.lng = coordinates.lng;
      } else if (manualLocation) {
        weatherPayload.query = manualLocation;
      }

      // Prepare payload for Places
      const placesPayload: Record<string, any> = {
        distance: distance || 'Near',
        craving: selectedCraving === 'Surprise me' ? undefined : selectedCraving
      };
      
      if (manualLocation) {
        placesPayload.query = manualLocation;
      } else if (coordinates) {
        placesPayload.lat = coordinates.lat;
        placesPayload.lng = coordinates.lng;
      } else {
        throw new Error('No location provided.');
      }

      // Resilient Parallel Fetching: Weather (Non-critical)
      let weatherPromise = Promise.resolve('Unknown');
      if (weatherPayload.lat || weatherPayload.query) {
        console.log('[Orchestrator] Fetching weather with payload:', weatherPayload);
        weatherPromise = fetch('/api/weather', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weatherPayload),
          signal,
        })
          .then(res => res.json())
          .then(data => {
            if (data.weather) {
              console.log('[Orchestrator] Weather fetched:', data.weather);
              return data.weather;
            }
            return 'Unknown';
          })
          .catch(err => {
            if (err.name === 'AbortError') throw err;
            console.warn('[Orchestrator] Weather fetch failed, proceeding without it:', err);
            return 'Unknown';
          });
      }

      // Resilient Parallel Fetching: Places (Critical Path)
      console.log('[Orchestrator] Querying places API with payload:', placesPayload);
      const placesPromise = fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placesPayload),
        signal,
      }).then(async (placesRes) => {
        console.log('[Orchestrator] Places API status:', placesRes.status);
        if (!placesRes.ok) {
          const errBody = await placesRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Places API responded with ${placesRes.status}`);
        }
        const placesData = await placesRes.json();
        if (placesData.places && placesData.places.length > 0) {
          console.log('[Orchestrator] Candidates found:', placesData.places.length);
          return placesData.places;
        } else {
          throw new Error('Failed to find restaurants nearby.');
        }
      });

      // Execute both simultaneously
      const [weatherInfo, candidates] = await Promise.all([weatherPromise, placesPromise]);

      if (signal.aborted) return;
      
      // Update global state with the results safely
      useSessionStore.getState().setWeatherInfo(weatherInfo);
      useSessionStore.getState().setCandidates(candidates);

      // Stage 4: Gemini Intelligence
      if (signal.aborted) return;
      setCurrentStep('Consulting AI...');
      
      const geminiPayload = {
        vibe: selectedCraving || 'Surprise me',
        budget: budget || 'Any budget',
        distance: distance || 'Near',
        locationInfo: manualLocation || `Lat: ${coordinates?.lat}, Lng: ${coordinates?.lng}`,
        timeInfo,
        weatherInfo,
        candidates,
      };
      console.log('[Orchestrator] Querying Gemini API with payload:', geminiPayload);

      const geminiRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
        signal,
      });

      console.log('[Orchestrator] Gemini API status:', geminiRes.status);
      if (!geminiRes.ok) {
        const errBody = await geminiRes.json().catch(() => ({}));
        throw new Error(errBody.error || `Gemini API responded with ${geminiRes.status}`);
      }

      const aiResults = await geminiRes.json();
      console.log('[Orchestrator] Gemini recommendations parsed:', aiResults);
      useSessionStore.getState().setAiResults(aiResults);
      
      // Finished, navigate to results
      if (signal.aborted) return;
      setCurrentStep('Ready!');
      console.log('[Orchestrator] Success! Navigating to /results in 500ms...');
      setTimeout(() => {
        if (!signal.aborted) {
          navigate('/results');
        }
      }, 500);

    } catch (err: any) {
      if (err.name === 'AbortError' && !isTimeout) {
        console.log('[Orchestrator] Pipeline aborted intentionally (e.g. component unmount).');
        return;
      }
      console.error('[Orchestrator] Pipeline crashed or timed out:', err);

      const storedCandidates = useSessionStore.getState().candidates;
      if (storedCandidates && storedCandidates.length > 0) {
        console.log('[Orchestrator] Applying graceful degradation fallback...');
        const top3 = generateFallbackResults(storedCandidates);
        
        useSessionStore.getState().setAiResults(top3);
        navigate('/results');
        return;
      }

      setError(err.message || (isTimeout ? 'The server is taking too long to respond. Please try again.' : 'An error occurred during processing.'));
    } finally {
      clearTimeout(timeoutId);
    }
  }, [cancelPipeline, navigate]);

  return { startPipeline, cancelPipeline, currentStep, error };
}
