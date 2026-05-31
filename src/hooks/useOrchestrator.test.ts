import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrchestrator } from './useOrchestrator';
import { useSessionStore } from '../store/useSessionStore';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('useOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ORCH-001: Happy Path - Orchestrates stages with GPS coordinates', async () => {
    // Setup store with coordinates
    useSessionStore.setState({ coordinates: { lat: 3.14, lng: 101.68 } });

    // Mock API Responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/weather') return Promise.resolve({ json: () => Promise.resolve({ weather: 'Sunny' }) });
      if (url === '/api/places') return Promise.resolve({ json: () => Promise.resolve({ places: [{ id: '1', name: 'Mamak' }] }) });
      if (url === '/api/gemini') return Promise.resolve({ json: () => Promise.resolve([{ id: '1', name: 'Mamak' }]) });
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      await result.current.startPipeline();
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    
    // Check state updates
    const state = useSessionStore.getState();
    expect(state.candidates.length).toBe(1);
    expect(state.aiResults.length).toBe(1);
    
    // Check navigation (after 500ms timeout)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/results');
    expect(result.current.error).toBeNull();
  });

  it('ORCH-003: Negative - Weather API fails (Graceful Degradation)', async () => {
    useSessionStore.setState({ coordinates: { lat: 3.14, lng: 101.68 } });
    
    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/weather') return Promise.reject(new Error('Weather Error'));
      if (url === '/api/places') return Promise.resolve({ json: () => Promise.resolve({ places: [{ id: '1', name: 'Mamak' }] }) });
      if (url === '/api/gemini') return Promise.resolve({ json: () => Promise.resolve([]) });
    });

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      await result.current.startPipeline();
    });

    expect(warnSpy).toHaveBeenCalledWith('Weather fetch failed, proceeding without it.');
    expect(result.current.error).toBeNull(); // Still succeeds
    
    warnSpy.mockRestore();
  });

  it('ORCH-004: Negative - Places API fails', async () => {
    useSessionStore.setState({ manualLocation: 'Kuala Lumpur' });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/places') return Promise.resolve({ json: () => Promise.resolve({ places: null }) }); // Simulating empty response
    });

    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      await result.current.startPipeline();
    });

    expect(result.current.error).toBe('Failed to find restaurants nearby.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ORCH-006: Boundary - No location provided', async () => {
    // Store is empty (reset state)
    
    const { result } = renderHook(() => useOrchestrator());

    await act(async () => {
      await result.current.startPipeline();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.error).toBe('No location provided.');
  });
});
