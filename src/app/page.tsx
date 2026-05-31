import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSessionStore } from '../store/useSessionStore';
import { MapPin, Navigation, Utensils, Banknote, Map, Search, UtensilsCrossed, Sun, Moon } from 'lucide-react';

const CRAVINGS = ['Chinese', 'Malay', 'Western', 'Vegan', 'Halal'];
const BUDGETS = ['$', '$$', '$$$'];
const DISTANCES = ['Near', 'Distant'] as const;

export default function LandingPage() {
  const navigate = useNavigate();
  const setCoordinates = useSessionStore((s) => s.setCoordinates);
  
  // Typing animation for header
  const words = ['Makan mana?', 'Makan bila?', 'Makan apa?'];
  const [currentText, setCurrentText] = useState('Makan mana?');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const fullWord = words[wordIndex];
      const commonPrefix = "Makan ";

      if (!isDeleting) {
        // Typing suffix
        setCurrentText(fullWord.substring(0, currentText.length + 1));
        setTypingSpeed(120);

        if (currentText === fullWord) {
          // Pause at complete word
          setTypingSpeed(2500);
          setIsDeleting(true);
        }
      } else {
        // Deleting suffix only (do not delete "Makan ")
        if (currentText.length > commonPrefix.length) {
          setCurrentText(fullWord.substring(0, currentText.length - 1));
          setTypingSpeed(60);
        } else {
          setIsDeleting(false);
          const nextIndex = (wordIndex + 1) % words.length;
          setWordIndex(nextIndex);
          setTypingSpeed(200);
        }
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex, typingSpeed]);
  const setVibe = useSessionStore((s) => s.setVibe);
  const setCraving = useSessionStore((s) => s.setCraving);
  const setBudget = useSessionStore((s) => s.setBudget);
  const setDistance = useSessionStore((s) => s.setDistance);
  const setManualLocation = useSessionStore((s) => s.setManualLocation);
  
  const selectedCraving = useSessionStore((s) => s.selectedCraving);
  const budget = useSessionStore((s) => s.budget);
  const distance = useSessionStore((s) => s.distance);
  const storeCoords = useSessionStore((s) => s.coordinates);
  const storeManualLocation = useSessionStore((s) => s.manualLocation);
  const theme = useSessionStore((s) => s.theme);
  const toggleTheme = useSessionStore((s) => s.toggleTheme);
  
  const { coordinates, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  
  const [manualInput, setManualInput] = useState(storeManualLocation || '');
  const hasRequestedGeo = useRef(false);

  // Auto-request location exactly once on mount
  useEffect(() => {
    if (!storeCoords && !storeManualLocation && !hasRequestedGeo.current) {
      hasRequestedGeo.current = true;
      requestLocation();
    }
  }, [storeCoords, storeManualLocation, requestLocation]);

  // Sync geolocation result to store
  useEffect(() => {
    if (coordinates) {
      if (!storeCoords || storeCoords.lat !== coordinates.lat || storeCoords.lng !== coordinates.lng) {
        setCoordinates(coordinates.lat, coordinates.lng);
      }
    } else {
      // Clear store coords if geolocation fails or is disabled and user has no manual input
      if (!manualInput.trim() && storeCoords) {
        useSessionStore.setState({ coordinates: null });
      }
    }
  }, [coordinates, storeCoords, setCoordinates, manualInput]);

  const handleStart = () => {
    if (manualInput.trim()) {
      setManualLocation(manualInput.trim());
      // Explicitly ensure coordinates are null if user typed manual query
      useSessionStore.setState({ coordinates: null });
    } else {
      setManualLocation(null);
    }
    
    // Fallbacks if not selected
    if (!selectedCraving) {
      setVibe('Surprise me');
      setCraving('Surprise me');
    }

    navigate('/processing');
  };

  const handleCravingSelect = (craving: string) => {
    if (selectedCraving === craving) {
      // Toggle off
      setCraving(null);
      setVibe(null);
    } else {
      setCraving(craving);
      setVibe(craving); // keep vibe in sync for backward compatibility
    }
  };

  const handleBudgetSelect = (b: string) => {
    if (budget === b) {
      setBudget(null);
    } else {
      setBudget(b);
    }
  };

  const isReadyToStart = (storeCoords !== null || manualInput.trim().length > 2) && !geoLoading;

  return (
    <div className="flex flex-col h-full w-full relative pb-12 bg-transparent min-h-[100dvh]">
      {/* Top Navigation Bar */}
      <header className="w-full flex items-center justify-between py-4 px-6 bg-transparent transition-colors relative">
        <UtensilsCrossed className="w-6 h-6 text-[#ff5416]" />
        <span className="text-xl font-black text-[#A84A2A] dark:text-[#ff5416] tracking-tight absolute left-1/2 -translate-x-1/2">YumYumGo</span>
        <button 
          onClick={toggleTheme} 
          type="button"
          aria-label="Toggle theme" 
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer text-[#ff5416]"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-[#ff5416]" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col pt-10 px-6">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-[38px] font-extrabold text-[#0B1325] dark:text-[#F8FAFC] tracking-tight leading-[1.1] mb-1">
            Laparlah.<br/>
            <span className="text-[#ff5416] inline-flex items-center justify-center">
              {currentText}
              <span className="inline-block w-[3px] h-[0.9em] bg-[#ff5416] ml-1 align-middle caret-blink" aria-hidden="true" />
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Let AI decide your next meal.</p>
        </header>

        {/* White Form Card Wrapper */}
        <div className="bg-[#FFFFFF] dark:bg-[#1E293B] rounded-[32px] p-6 border border-gray-100 dark:border-gray-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col gap-6">
          
          {/* Where are you? */}
          <section aria-label="Location selection">
            <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#ff5416]" aria-hidden="true" />
              Where are you?
            </h2>
            <div className="relative group">
              <input 
                id="location-input"
                type="text"
                aria-label="Enter your location"
                placeholder="e.g. Universiti Malaya, Kuala Lumpur..."
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    // Clear store coordinates if user starts typing manually
                    useSessionStore.setState({ coordinates: null });
                  }
                }}
                className="w-full pl-4 pr-12 py-3 bg-[#FFFFFF] dark:bg-[#1E293B] text-gray-900 dark:text-[#F8FAFC] rounded-2xl border border-gray-200 dark:border-gray-700 outline-none focus:border-[#ff5416] transition-all font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal text-sm"
              />
              
              <button 
                onClick={() => {
                  setManualInput('');
                  setManualLocation(null);
                  useSessionStore.setState({ coordinates: null });
                  requestLocation();
                }}
                type="button"
                title="Detect my location"
                aria-label="Auto-detect location"
                className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none"
              >
                <Navigation className={`w-4 h-4 transition-colors ${storeCoords ? 'text-green-500' : geoLoading ? 'text-gray-400 animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:text-[#ff5416] dark:hover:text-[#ff5416]'}`} aria-hidden="true" />
              </button>
            </div>
            {geoError && !manualInput && (
              <p className="mt-2 text-xs text-red-500 font-medium px-1" role="alert">Location disabled. Please enter an area.</p>
            )}
          </section>

          {/* What are you craving? */}
          <section aria-label="Craving selection">
            <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2.5">
              <Utensils className="w-3.5 h-3.5 text-[#ff5416]" aria-hidden="true" />
              What are you craving?
            </h2>
            
            <div className="relative mb-3 group">
              <input 
                id="craving-input"
                type="text"
                aria-label="Enter what you are craving"
                placeholder="Maybe pizza, spaghetti, or supper perhaps?"
                value={selectedCraving || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCraving(val || null);
                  setVibe(val || null);
                }}
                className="w-full pl-4 pr-12 py-3 bg-[#FFFFFF] dark:bg-[#1E293B] text-gray-900 dark:text-[#F8FAFC] rounded-2xl border border-gray-200 dark:border-gray-700 outline-none focus:border-[#ff5416] transition-all font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal text-sm"
              />
              
              {selectedCraving && (
                <button 
                  onClick={() => {
                    setCraving(null);
                    setVibe(null);
                  }}
                  type="button"
                  title="Clear craving"
                  aria-label="Clear craving"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none"
                >
                  <UtensilsCrossed className="w-4 h-4 text-gray-400 hover:text-[#ff5416] transition-colors" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex overflow-x-auto gap-2 vibe-carousel pb-1 -mx-6 px-6">
              {CRAVINGS.map((craving) => {
                const isSelected = selectedCraving === craving;
                return (
                  <button
                    key={craving}
                    onClick={() => handleCravingSelect(craving)}
                    type="button"
                    className={`
                      px-4 py-2 rounded-full text-xs font-semibold transition-all border cursor-pointer shrink-0
                      ${isSelected 
                        ? 'border-[#ff5416] text-[#ff5416] bg-[#FFFFFF] dark:bg-[#1E293B] shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-[#FFFFFF] dark:bg-[#1E293B] hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    {craving}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Budget & Distance side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Budget Level */}
            <section aria-label="Budget selection">
              <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2.5">
                <Banknote className="w-3.5 h-3.5 text-[#ff5416]" aria-hidden="true" />
                Budget Level
              </h2>
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {BUDGETS.map((b) => {
                  const isSelected = budget === b;
                  return (
                    <button
                      key={b}
                      onClick={() => handleBudgetSelect(b)}
                      type="button"
                      className={`
                        px-3 py-2 rounded-full text-xs font-semibold transition-all border min-w-[36px] text-center cursor-pointer
                        ${isSelected 
                          ? 'border-[#ff5416] text-[#ff5416] bg-[#FFFFFF] dark:bg-[#1E293B] shadow-sm' 
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-[#FFFFFF] dark:bg-[#1E293B] hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Travel Distance */}
            <section aria-label="Distance selection">
              <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-2.5">
                <Map className="w-3.5 h-3.5 text-[#ff5416]" aria-hidden="true" />
                Travel Distance
              </h2>
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {DISTANCES.map((d) => {
                  const isSelected = distance === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDistance(d)}
                      type="button"
                      className={`
                        px-3.5 py-2 rounded-full text-xs font-semibold transition-all border cursor-pointer
                        ${isSelected 
                          ? 'border-[#ff5416] text-[#ff5416] bg-[#FFFFFF] dark:bg-[#1E293B] shadow-sm' 
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-[#FFFFFF] dark:bg-[#1E293B] hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Cari Makan Action */}
          <button
            onClick={handleStart}
            disabled={!isReadyToStart}
            type="button"
            className={`
              w-full py-3.5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2
              ${isReadyToStart
                ? 'bg-[#0B1325] dark:bg-[#ff5416] text-[#FFFFFF] hover:bg-black dark:hover:bg-[#e0450f]'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed shadow-none'
              }
            `}
          >
            <Search className="w-4 h-4 text-[#FFFFFF]" aria-hidden="true" />
            {isReadyToStart ? "Cari Makan" : geoLoading ? "Locating..." : "Cari Makan"}
          </button>

          {/* Roulette Hyperlink */}
          <div className="text-center">
            <Link 
              to="/roulette" 
              className="text-xs font-bold text-[#ff5416] hover:underline flex items-center justify-center gap-1 transition-all"
            >
              I'm Feeling Luckly Today
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
