import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { useSessionStore } from '../../store/useSessionStore';
import { ArrowLeft, RefreshCw, Sparkles, Navigation, Settings2, X, Plus } from 'lucide-react';

const DEFAULT_WHEEL_OPTIONS = [
  { 
    name: 'Nasi Lemak', 
    description: 'Fragrant coconut rice served with spicy sambal, crunchy anchovies, peanuts, and a boiled egg. A Malaysian national treasure!',
    emoji: '🍛',
    color: '#FF6B6B' // Coral Red
  },
  { 
    name: 'Roti Canai', 
    description: 'Crispy, flaky flatbread stretched and cooked on a flat grill, served with aromatic dhal curry or sambal.',
    emoji: '🫓',
    color: '#4DABF7' // Light Blue
  },
  { 
    name: 'Char Kway Teow', 
    description: 'Stir-fried flat rice noodles with prawns, cockles, chives, and bean sprouts, packed with smokey wok hei.',
    emoji: '🥢',
    color: '#51CF66' // Teal Green
  },
  { 
    name: 'Chicken Rice', 
    description: 'Succulent poached or roasted chicken served over fragrant rice cooked in rich chicken stock, with garlic chilli sauce.',
    emoji: '🍚',
    color: '#FCC419' // Yellow
  },
  { 
    name: 'Satay', 
    description: 'Grilled skewers of marinated meat, caramelized over charcoal fire and served with a thick, chunky peanut sauce.',
    emoji: '🍢',
    color: '#FF922B' // Orange
  },
  { 
    name: 'Laksa', 
    description: 'A comforting bowl of noodles in either a spicy coconut curry gravy or a tangy, sour tamarind fish broth.',
    emoji: '🍜',
    color: '#845EF7' // Purple
  },
  { 
    name: 'Ramly Burger', 
    description: 'A legendary Malaysian street burger wrapped in a paper-thin egg omelette and drenched in local sauces.',
    emoji: '🍔',
    color: '#F06595' // Pink
  },
  { 
    name: 'Banana Leaf Rice', 
    description: 'Rice served on a banana leaf alongside an assortment of vegetables, curried meats, pickles, and crispy papadom.',
    emoji: '🍃',
    color: '#339AF0' // Blue
  }
];

const EXTRA_COLORS = ['#FF6B6B', '#4DABF7', '#51CF66', '#FCC419', '#FF922B', '#845EF7', '#F06595', '#339AF0', '#20C997', '#FFD43B'];
const EMOJIS = ['🍽️', '🔥', '🤤', '🌶️', '😋', '🥣', '🥢', '🍕', '🌮'];

export default function RoulettePage() {
  const navigate = useNavigate();
  const setCraving = useSessionStore((s) => s.setCraving);
  const setVibe = useSessionStore((s) => s.setVibe);
  
  const [wheelOptions, setWheelOptions] = useState(DEFAULT_WHEEL_OPTIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedFood, setSelectedFood] = useState<typeof DEFAULT_WHEEL_OPTIONS[0] | null>(null);
  const controls = useAnimation();
  const timeoutsRef = useRef<number[]>([]);

  const degreePerSlice = 360 / Math.max(1, wheelOptions.length);

  const playClickSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Ignored if AudioContext is blocked
    }
  };

  const handleSpin = async () => {
    if (isSpinning || wheelOptions.length === 0) return;
    
    // Clear any dangling sound timeouts
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    setIsSpinning(true);
    setSelectedFood(null);

    // Pick a random target index
    const targetIndex = Math.floor(Math.random() * wheelOptions.length);
    
    // Math to align the center of target slice with the 12 o'clock pointer:
    // Slices go clockwise starting from 12 o'clock (Nasi Lemak is 0).
    const fullSpins = 5;
    const targetRotation = (fullSpins * 360) + 360 - (targetIndex * degreePerSlice) - (degreePerSlice / 2);
    
    const duration = 4; // seconds

    // Schedule tick sound effects that slow down over time
    const totalTicks = fullSpins * wheelOptions.length + targetIndex + 1;
    for (let i = 1; i <= totalTicks; i++) {
      const progress = i / totalTicks;
      // Using easeOutCubic: progress = 1 - (1 - t)^3 => t = 1 - (1 - progress)^(1/3)
      const t = 1 - Math.pow(1 - progress, 1 / 3);
      const delayMs = t * duration * 1000;
      
      const timeoutId = window.setTimeout(() => {
        playClickSound();
      }, delayMs);
      
      timeoutsRef.current.push(timeoutId);
    }

    // Reset rotation first
    await controls.set({ rotate: 0 });

    // Animate the spin
    await controls.start({
      rotate: targetRotation,
      transition: {
        duration,
        ease: [0.1, 0.8, 0.1, 1] // Custom ease out cubic curve
      }
    });

    setIsSpinning(false);
    setSelectedFood(wheelOptions[targetIndex]);
  };

  const handleSelectFood = () => {
    if (!selectedFood) return;
    setCraving(selectedFood.name);
    setVibe(selectedFood.name);
    navigate('/processing');
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (wheelOptions.length <= 1) return;
    setWheelOptions(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAddOption = () => {
    if (!newItemName.trim() || wheelOptions.length >= 20) return;
    
    const newColor = EXTRA_COLORS[Math.floor(Math.random() * EXTRA_COLORS.length)];
    const newEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    
    setWheelOptions(prev => [...prev, {
      name: newItemName.trim(),
      description: 'A custom craving added directly by you!',
      emoji: newEmoji,
      color: newColor
    }]);
    setNewItemName('');
  };

  return (
    <div className="flex flex-col items-center justify-start h-full w-full min-h-[100dvh] bg-transparent pb-16 px-4">
      
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between py-4 mb-4">
        <Link to="/" className="p-2 bg-[#FFFFFF] dark:bg-[#1E293B] rounded-full border-2 border-[#1a1513] dark:border-[#F8FAFC] shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-[2px_2px_0px_0px_#ff5416] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1a1513] dark:hover:shadow-[1px_1px_0px_0px_#ff5416] transition-all">
          <ArrowLeft className="w-5 h-5 text-[#1a1513] dark:text-[#F8FAFC]" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1513] dark:text-[#F8FAFC]">Food Roulette</h1>
        <div className="w-9 h-9" /> {/* Spacer */}
      </div>

      <div className="w-full flex flex-col items-center max-w-[400px] px-2">
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8 font-medium">
          Can't decide what to eat? Spin the wheel and let fate make the call!
        </p>

        {/* Wheel Container */}
        <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
          {/* Outer Ring Shadow Container */}
          <div className="absolute inset-0 bg-[#1a1513] dark:bg-[#ff5416] rounded-full translate-y-2 translate-x-1 -z-10" />

          {/* Pointer/Arrow at top */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[2px_2px_0px_rgba(26,21,19,1)] dark:drop-shadow-[2px_2px_0px_rgba(255,84,22,1)]">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#ff5416]" />
            <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 left-1/2 -translate-x-1/2" />
          </div>

          {/* Rotating Wheel wrapper */}
          <motion.div
            animate={controls}
            className="w-full h-full rounded-full border-4 border-[#1a1513] dark:border-[#F8FAFC] bg-[#FFFFFF] dark:bg-[#1E293B] overflow-hidden relative"
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {wheelOptions.map((food, i) => {
                const angle = i * degreePerSlice;
                const theta = (degreePerSlice * Math.PI) / 180;
                const arcFlag = degreePerSlice > 180 ? 1 : 0;
                const endX = 100 + 100 * Math.sin(theta);
                const endY = 100 - 100 * Math.cos(theta);
                
                const pathData = wheelOptions.length === 1
                  ? "M 100 0 A 100 100 0 1 1 99.9 0 Z M 100 100 Z"
                  : `M 100 100 L 100 0 A 100 100 0 ${arcFlag} 1 ${endX} ${endY} Z`;

                return (
                  <g key={`${food.name}-${i}`} transform={`rotate(${angle}, 100, 100)`}>
                    {/* Dynamic slice path */}
                    <path
                      d={pathData}
                      fill={food.color}
                      stroke="#1a1513"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
              
              {/* Decorative inner circles */}
              <circle cx="100" cy="100" r="24" fill="#1a1513" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="10" fill="#FFFFFF" />
            </svg>
          </motion.div>
        </div>

        {/* Spin Action */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || wheelOptions.length === 0}
          className={`
            px-8 py-3.5 rounded-full font-bold text-base border-2 border-[#1a1513] dark:border-[#F8FAFC] shadow-[4px_4px_0px_0px_#1a1513] dark:shadow-[4px_4px_0px_0px_#ff5416] transition-all flex items-center gap-2 cursor-pointer
            ${isSpinning 
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-[2px_2px_0px_0px_#ff5416] translate-x-[2px] translate-y-[2px]' 
              : 'bg-[#ff5416] text-[#FFFFFF] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_#1a1513] dark:hover:shadow-[2px_2px_0px_0px_#ff5416]'
            }
          `}
        >
          <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning ? 'Spinning...' : 'SPIN THE WHEEL'}
        </button>

        {/* Edit Options Toggle */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="mt-6 flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          {isEditing ? 'Hide Edit Options' : 'Edit Wheel Options'}
        </button>

        {/* Edit Panel */}
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-sm font-bold text-[#1a1513] dark:text-[#F8FAFC] mb-3">Wheel Slices</h3>
            
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              {wheelOptions.map((opt, i) => (
                <div key={`${opt.name}-${i}`} className="flex items-center justify-between bg-[#FFFFFF] rounded-xl px-3 py-2 border-2 border-[#1a1513] dark:border-transparent shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-none">
                  <span className="text-sm font-bold text-[#1a1513] flex items-center gap-2">
                    <span>{opt.emoji}</span>
                    <span className="truncate max-w-[180px]">{opt.name}</span>
                  </span>
                  <button 
                    onClick={() => handleRemoveOption(i)}
                    disabled={wheelOptions.length <= 1}
                    className="p-1 rounded-full text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove option"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Add New Input */}
            <div className="flex gap-2 items-center mt-4">
              <input 
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                placeholder="E.g. Sushi, Pizza..."
                className="flex-1 bg-[#FFFFFF] border-2 border-[#1a1513] dark:border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold text-[#1a1513] placeholder:text-gray-400 focus:outline-none focus:border-[#ff5416] shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-none"
                maxLength={25}
              />
              <button
                onClick={handleAddOption}
                disabled={!newItemName.trim() || wheelOptions.length >= 20}
                className="bg-[#FFFFFF] text-[#ff5416] border-2 border-[#1a1513] dark:border-transparent p-2.5 rounded-xl hover:bg-[#ff5416] hover:text-[#FFFFFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_#1a1513] dark:shadow-none"
                aria-label="Add option"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {wheelOptions.length >= 20 && (
              <p className="text-xs text-red-500 mt-2 font-bold px-1">Maximum 20 slices reached.</p>
            )}
          </motion.div>
        )}

        {/* Result Card */}
        {selectedFood && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 w-full bg-[#FFFFFF] dark:bg-[#1E293B] rounded-3xl p-5 border-2 border-[#1a1513] dark:border-[#F8FAFC] shadow-[4px_4px_0px_0px_#1a1513] dark:shadow-[4px_4px_0px_0px_#ff5416] relative overflow-hidden"
          >
            {/* Vibe Sparkle Tag */}
            <div className="absolute top-4 right-4 bg-[#ff5416] text-white p-1 rounded-full border border-[#1a1513] dark:border-[#F8FAFC]" aria-hidden="true">
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Food Title */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl" role="img" aria-label={selectedFood.name}>
                {selectedFood.emoji}
              </span>
              <div>
                <span className="text-xs font-bold text-[#ff5416] tracking-wider uppercase">Your Destiny</span>
                <h3 className="text-xl font-extrabold text-[#1a1513] dark:text-[#F8FAFC] leading-none mt-0.5">
                  {selectedFood.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5 mt-3">
              {selectedFood.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleSelectFood}
                className="w-full py-3 bg-[#0B1325] dark:bg-[#ff5416] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-[#e0450f] transition-all cursor-pointer border border-[#1a1513] dark:border-[#F8FAFC]"
              >
                <Navigation className="w-4 h-4 rotate-45" />
                Find Restaurants for this!
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
