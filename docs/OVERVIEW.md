# System Overview

## Target Module: `src/hooks/useOrchestrator.ts`

### Purpose
The `useOrchestrator` hook acts as the central asynchronous nervous system for the "YumYumGo" application. It orchestrates the 3-stage pipeline (utilizing Resilient Parallel Fetching) connecting the client-side state with the backend Vercel Serverless Functions (`/api/weather`, `/api/places`, `/api/gemini`) to fetch, transform, and curate the final restaurant recommendations based on ephemeral session state.

### Key Functions & State Changes
- `startPipeline`: The primary async callback that triggers the pipeline. It updates the local `currentStep` string state to provide real-time feedback to the UI (e.g., "Scouting local spots & skies...").
- **Zustand Interfacing**: Reads `store.coordinates`, `store.manualLocation`, and `store.selectedVibe`. Mutates global state via `store.setCandidates()` and `store.setAiResults()`.
- **Navigation**: Uses `react-router-dom`'s `useNavigate` to push the user to `/results` upon successful completion.

### Data Contracts
1. **Weather Payload:** POSTs `{ lat, lng }` to `/api/weather`. Expects `{ weather: string }`.
2. **Places Payload:** POSTs `{ query }` (if manual) OR `{ lat, lng }` to `/api/places`. Expects `{ places: any[] }`.
3. **Gemini Payload:** POSTs `{ vibe, locationInfo, timeInfo, weatherInfo, candidates }` to `/api/gemini`. Expects an array of strictly formatted restaurant JSON objects.

### Expected Business Logic & Failure States
- **Parallel Fetching & Graceful Weather Degradation:** The `/api/weather` and `/api/places` endpoints are fetched concurrently via `Promise.all`. The Weather fetch utilizes an isolated `.catch()` so if it fails or times out, it gracefully resolves to 'Unknown', allowing the critical Places API fetch to continue uninterrupted.
- **Strict Places Validation:** If `/api/places` fails or returns no places, it throws an error ("Failed to find restaurants nearby."), halting the pipeline and updating the `error` state.
- **Location Requirement:** Throws an error immediately if neither coordinates nor a manual location is available in the store.
- **Timeout Handling:** A 9000ms `AbortController` enforces a strict timeout on the pipeline to prevent Vercel 10s Hobby tier 504 errors. If the timeout triggers, the request is aborted gracefully.
- **Gemini Failover Cascade & Graceful Degradation:** If the primary LLM (`gemini-2.0-flash`) hits a rate limit or fails, it cascades to `gemini-2.5-pro` and then `gemini-2.0-flash-lite`. If all LLMs fail, the pipeline falls back to returning the raw top-rated Google Places API data.
- **Global Error Handling:** Any unhandled rejection in the async chain is caught by the top-level `catch`, which updates the local `error` state string for the UI to display, preventing a total app crash.
