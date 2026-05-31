import { useEffect, useState } from 'react';
import { useSessionStore } from '../../store/useSessionStore';
import { useNavigate } from 'react-router-dom';
import { MapPin, RefreshCcw, Sparkles, CloudSun } from 'lucide-react';

function RestaurantImage({ src, alt, index }: { src: string | null; alt: string; index: number }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return <span className="text-5xl" role="img" aria-label="Restaurant placeholder">🍽️</span>;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 bg-[#f7ebe8] dark:bg-[#2d3748] animate-pulse flex items-center justify-center">
          <span className="text-3xl text-[#1a1513] dark:text-[#F8FAFC] font-bold opacity-30">🍽️</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`object-cover w-full h-full transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        loading={index === 0 ? "eager" : "lazy"}
      />
    </div>
  );
}

export default function ResultsPage() {
  const aiResults = useSessionStore((s) => s.aiResults);
  const selectedVibe = useSessionStore((s) => s.selectedVibe);
  const weatherInfo = useSessionStore((s) => s.weatherInfo);
  const reset = useSessionStore((s) => s.reset);
  const candidates = useSessionStore((s) => s.candidates);
  const navigate = useNavigate();

  useEffect(() => {
    if (!aiResults || aiResults.length === 0) {
      navigate('/', { replace: true });
    }
  }, [aiResults, navigate]);

  const handleStartOver = () => {
    reset();
    navigate('/');
  };

  if (!aiResults || aiResults.length === 0) return null;

  return (
    <div className="flex flex-col h-full w-full relative pb-24 min-h-[100dvh] bg-transparent">
      <div className="flex-1 px-4 pt-2">
        <header className="mt-6 mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1513] dark:text-[#F8FAFC] tracking-tight">
              Your Vibe Match
            </h1>
            <p className="text-[#ff5416] font-semibold text-sm">
              {selectedVibe}
            </p>
          </div>
          
          {weatherInfo && weatherInfo !== 'Unknown' && weatherInfo !== 'Unknown (Error fetching weather)' && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748b] dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                <CloudSun className="w-3.5 h-3.5" />
                <span>{weatherInfo}</span>
              </div>
            </div>
          )}
        </header>

        <div className="flex flex-col gap-6" role="list" aria-label="Restaurant recommendations">
          {aiResults.map((result: any, index: number) => {
            const candidate = candidates?.find((c: any) => c.id === result.id);
            const photoReference = candidate?.photoReference;
            const imageUrl = photoReference
              ? `/api/photo?photoReference=${encodeURIComponent(photoReference)}`
              : null;

            return (
              <article 
                key={`${result.id || 'res'}-${index}`}
                role="listitem"
                className="bg-[#FFFFFF] dark:bg-[#1E293B] rounded-3xl p-4 border-2 border-[#1a1513] dark:border-[#F8FAFC] shadow-[4px_4px_0px_0px_#1a1513] dark:shadow-[4px_4px_0px_0px_#ff5416] flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Image area */}
                <div className="w-full h-48 bg-[#f7ebe8] dark:bg-[#2d3748] rounded-2xl border-2 border-[#1a1513] dark:border-[#F8FAFC] flex items-center justify-center relative overflow-hidden" aria-hidden="true">
                  <RestaurantImage 
                    src={imageUrl} 
                    alt={result.name} 
                    index={index} 
                  />
                  {index === 0 && (
                    <div className="absolute top-3 right-3 bg-[#ff5416] text-[#FFFFFF] text-xs font-bold px-3 py-1 rounded-full border-2 border-[#1a1513] dark:border-[#F8FAFC] shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-[2px_2px_0px_0px_#ff5416] z-10">
                      TOP MATCH
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <h2 className="text-xl font-bold text-[#1a1513] dark:text-[#F8FAFC] leading-tight mb-2">
                    {result.name}
                  </h2>
                  
                  {/* Tags & Distance */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.distance && result.distance !== 'N/A' && (
                      <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#1E293B] text-[#1a1513] dark:text-[#F8FAFC] text-xs font-bold px-2 py-1 border-2 border-[#1a1513] dark:border-[#F8FAFC] rounded-full">
                        <MapPin className="w-3 h-3 text-[#ff5416]" aria-hidden="true" />
                        {result.distance}
                      </div>
                    )}
                    {result.tags?.map((tag: string, i: number) => (
                      <div key={i} className="bg-[#FFFFFF] dark:bg-[#1E293B] text-[#1a1513] dark:text-[#F8FAFC] text-xs font-bold px-2 py-1 border-2 border-[#1a1513] dark:border-[#F8FAFC] rounded-full uppercase tracking-wider">
                        {tag}
                      </div>
                    ))}
                  </div>

                  {/* Gemini Reasoning Callout */}
                  <div className="bg-[#FFFFFF] dark:bg-[#1E293B] p-3 rounded-xl border-2 border-[#1a1513] dark:border-[#F8FAFC] relative mt-2 mb-2">
                    <div className="absolute -top-3 -left-2 bg-[#ff5416] rounded-full p-1 border-2 border-[#1a1513] dark:border-[#F8FAFC]" aria-hidden="true">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <p className={`text-sm font-medium leading-relaxed ml-2 ${result.ai_reasoning?.includes('⚠️') || result.ai_reasoning?.toLowerCase().includes('unavailable') ? 'text-orange-600 dark:text-orange-400' : 'text-[#1a1513] dark:text-gray-200'}`}>
                      {result.ai_reasoning}
                    </p>
                  </div>

                  {/* Actionable User Routing */}
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(result.name)}&destination_place_id=${result.id}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-[#1a1513] dark:bg-[#ff5416] text-[#FFFFFF] rounded-xl font-bold text-sm shadow-[3px_3px_0px_0px_#ff5416] dark:shadow-[3px_3px_0px_0px_#F8FAFC] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_#ff5416] dark:hover:shadow-[1px_1px_0px_0px_#F8FAFC] transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    Get Directions
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-[480px] mx-auto bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-[#0B1325] dark:via-[#0B1325] dark:to-transparent pt-12 pb-6 z-50">
        <button
          onClick={handleStartOver}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#FFFFFF] dark:bg-[#1E293B] rounded-full font-bold text-lg border-2 border-[#1a1513] dark:border-[#F8FAFC] text-[#1a1513] dark:text-[#F8FAFC] shadow-[4px_4px_0px_0px_#1a1513] dark:shadow-[4px_4px_0px_0px_#ff5416] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_#1a1513] dark:hover:shadow-[2px_2px_0px_0px_#ff5416] transition-all focus:outline-2 focus:outline-offset-2 focus:outline-[#ff5416]"
        >
          <RefreshCcw className="w-5 h-5" aria-hidden="true" />
          Start Over
        </button>
      </div>
    </div>
  );
}
