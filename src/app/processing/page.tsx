import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { useSessionStore } from '../../store/useSessionStore';
import { useNavigate } from 'react-router-dom';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const coordinates = useSessionStore((s) => s.coordinates);
  const manualLocation = useSessionStore((s) => s.manualLocation);
  const { startPipeline, cancelPipeline, currentStep, error } = useOrchestrator();

  useEffect(() => {
    // Guard: bounce back if no location context exists
    if (!coordinates && !manualLocation) {
      navigate('/', { replace: true });
      return;
    }

    startPipeline();

    // Cleanup: abort in-flight fetches if the user navigates away
    return () => {
      cancelPipeline();
    };
  }, [coordinates, manualLocation, navigate, startPipeline, cancelPipeline]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B1325]" role="status" aria-live="polite">
      <div className="absolute inset-0 bg-[#ff5416] opacity-5 z-0" aria-hidden="true" />
      
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Animated Bubbly Container */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, -2, 2, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-32 h-32 bg-[#FFFFFF] dark:bg-[#1E293B] rounded-full border-4 border-[#1a1513] dark:border-[#F8FAFC] shadow-[8px_8px_0px_0px_#1a1513] dark:shadow-[8px_8px_0px_0px_#ff5416] flex items-center justify-center mb-12"
          aria-hidden="true"
        >
          <motion.div
             animate={{ rotate: 360 }}
             transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
             className="text-5xl"
          >
            🍳
          </motion.div>
        </motion.div>

        {/* Text Sequence with Framer Motion */}
        <div className="h-20 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold text-[#1a1513] dark:text-[#F8FAFC] text-center px-4"
            >
              {error ? "Oops! Something went wrong." : currentStep}
            </motion.h2>
          </AnimatePresence>
        </div>

        {error && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-[#64748b] dark:text-gray-400 text-center px-6">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-[#1a1513] dark:bg-[#ff5416] text-[#FFFFFF] px-6 py-3 rounded-full font-bold shadow-[4px_4px_0px_0px_#ff5416] dark:shadow-[4px_4px_0px_0px_#F8FAFC] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_#ff5416] dark:hover:shadow-[2px_2px_0px_0px_#F8FAFC] transition-all focus:outline-2 focus:outline-offset-2 focus:outline-[#ff5416]"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
