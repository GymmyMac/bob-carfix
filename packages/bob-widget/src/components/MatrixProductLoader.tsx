import React, { useRef, useEffect, useState, useCallback } from "react";
import { useThemeSettings, type MatrixTheme } from "../hooks/useThemeSettings";
import { useSparkDeals, useSparkDealsSettings, getSparkDealWords, type SparkDeal } from "../hooks/useSparkDeals";
import { SparkDealBanner } from "./SparkDealBanner";

export type LoaderPhase = 'hidden' | 'researching' | 'loading' | 'success';

interface MatrixProductLoaderProps {
  phase: LoaderPhase;
  message?: string;
  onComplete?: () => void;
  onSparkDealClick?: (deal: SparkDeal) => void;
}

// Character pools for matrix rain
const AUTOMOTIVE_WORDS = [
  'CARFIX', 'BRAKES', 'PADS', 'ROTORS', 'FILTER', 'OIL', 'SPARK', 'PLUGS',
  'ENGINE', 'PARTS', 'BELT', 'PUMP', 'VALVE', 'SENSOR', 'CLUTCH', 'AXLE'
];

const SYMBOLS = ['*', ':', '=', '>', '<', '+', '-', '|', '•', '○', '●'];

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  isSparkDeal: boolean;
  opacity: number;
  size: number;
}

export const MatrixProductLoader: React.FC<MatrixProductLoaderProps> = ({
  phase,
  message,
  onComplete,
  onSparkDealClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dropsRef = useRef<RainDrop[]>([]);
  const phaseStartTimeRef = useRef<number>(0);
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [dealsShownCount, setDealsShownCount] = useState(0);

  // Theme and deals data
  const { data: theme } = useThemeSettings();
  const { data: settings } = useSparkDealsSettings();
  const { data: deals } = useSparkDeals(phase !== 'hidden' && settings?.enabled);

  const activeTheme = theme || {
    primaryHex: '#0066CC',
    secondaryHex: '#7DD3FC',
    successHex: '#FF9500',
    backgroundHex: '#111827',
    sparkDealHex: '#FF9500',
    backgroundMode: 'dark' as const,
  };

  const activeSettings = settings || {
    enabled: true,
    inRain: true,
    rainFrequency: 0.15,
    primingEnabled: true,
    bannerEnabled: true,
    delayMs: 2000,
    scrollSpeed: 5000,
    maxPerSession: 3,
    minResearchTime: 1500,
  };

  // Get spark deal words for rain
  const sparkDealWords = deals && activeSettings.inRain 
    ? getSparkDealWords(deals) 
    : [];

  // Get random character with spark deal probability
  const getRandomChar = useCallback((): { char: string; isSparkDeal: boolean } => {
    // Check if we should show a spark deal word
    if (sparkDealWords.length > 0 && Math.random() < activeSettings.rainFrequency) {
      const word = sparkDealWords[Math.floor(Math.random() * sparkDealWords.length)];
      return { char: word, isSparkDeal: true };
    }
    
    // Regular automotive words or symbols
    if (Math.random() < 0.7) {
      const word = AUTOMOTIVE_WORDS[Math.floor(Math.random() * AUTOMOTIVE_WORDS.length)];
      return { char: word, isSparkDeal: false };
    }
    
    return { 
      char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], 
      isSparkDeal: false 
    };
  }, [sparkDealWords, activeSettings.rainFrequency]);

  // Get color based on phase and drop type
  const getDropColor = useCallback((drop: RainDrop, phaseProgress: number): string => {
    if (drop.isSparkDeal) {
      return activeTheme.sparkDealHex; // Gold for spark deals
    }

    // Phase-based color transition
    if (phase === 'success') {
      return activeTheme.successHex; // Gold flash on success
    } else if (phase === 'loading') {
      // Blend from primary to secondary
      const blend = Math.min(1, phaseProgress / 2);
      return blend > 0.5 ? activeTheme.secondaryHex : activeTheme.primaryHex;
    }
    
    return activeTheme.primaryHex; // Dark blue default
  }, [phase, activeTheme]);

  // Initialize drops
  const initDrops = useCallback((width: number, height: number) => {
    const drops: RainDrop[] = [];
    const columns = Math.floor(width / 30);

    for (let i = 0; i < columns; i++) {
      const { char, isSparkDeal } = getRandomChar();
      drops.push({
        x: i * 30 + 15,
        y: Math.random() * height,
        speed: 2 + Math.random() * 4,
        char,
        isSparkDeal,
        opacity: 0.3 + Math.random() * 0.7,
        size: isSparkDeal ? 14 : 10 + Math.random() * 4,
      });
    }

    dropsRef.current = drops;
  }, [getRandomChar]);

  // Animation loop
  useEffect(() => {
    if (phase === 'hidden') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initDrops(canvas.offsetWidth, canvas.offsetHeight);
    };

    resizeCanvas();
    phaseStartTimeRef.current = Date.now();

    const animate = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const elapsedMs = Date.now() - phaseStartTimeRef.current;
      const phaseProgress = elapsedMs / 1000;

      // Clear canvas for transparent overlay (Bob shows through)
      ctx.clearRect(0, 0, width, height);

      // Draw each drop
      dropsRef.current.forEach((drop, index) => {
        const color = getDropColor(drop, phaseProgress);
        
        ctx.font = `bold ${drop.size}px monospace`;
        ctx.fillStyle = color;
        ctx.globalAlpha = drop.opacity;
        
        // Draw the character/word
        ctx.fillText(drop.char, drop.x, drop.y);
        
        // Move drop down
        drop.y += drop.speed;
        
        // Reset when off screen
        if (drop.y > height + 20) {
          const { char, isSparkDeal } = getRandomChar();
          drop.y = -20;
          drop.char = char;
          drop.isSparkDeal = isSparkDeal;
          drop.speed = 2 + Math.random() * 4;
          drop.opacity = 0.3 + Math.random() * 0.7;
          drop.size = isSparkDeal ? 14 : 10 + Math.random() * 4;
        }
      });

      ctx.globalAlpha = 1;

      // Success phase: flash effect
      if (phase === 'success') {
        const flashIntensity = Math.max(0, 1 - phaseProgress * 2);
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(255, 149, 0, ${flashIntensity * 0.3})`;
          ctx.fillRect(0, 0, width, height);
        }
        
        // Complete after flash
        if (phaseProgress > 0.5 && onComplete) {
          onComplete();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [phase, activeTheme, getRandomChar, getDropColor, initDrops, onComplete]);

  // Handle banner timing
  useEffect(() => {
    if (phase === 'hidden' || !deals || deals.length === 0 || !activeSettings.bannerEnabled) {
      setShowBanner(false);
      return;
    }

    if (dealsShownCount >= activeSettings.maxPerSession) {
      return; // Max deals reached for session
    }

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, activeSettings.delayMs);

    return () => clearTimeout(timer);
  }, [phase, deals, activeSettings, dealsShownCount]);

  // Handle deal change in banner
  const handleDealChange = useCallback((index: number) => {
    setCurrentDealIndex(index);
    setDealsShownCount(prev => prev + 1);
  }, []);

  // Handle deal click
  const handleDealClick = useCallback((deal: SparkDeal) => {
    console.log('[MatrixLoader] Spark deal clicked:', deal.product_name);
    onSparkDealClick?.(deal);
  }, [onSparkDealClick]);

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{ background: 'transparent' }}
    >
      {/* Matrix Rain Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.9 }}
      />

      {/* Loading Message */}
      {message && (
        <div 
          className="relative z-10 px-6 py-3 rounded-xl backdrop-blur-sm"
          style={{
            background: activeTheme.backgroundMode === 'dark' 
              ? 'rgba(0, 0, 0, 0.5)' 
              : 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <p 
            className="text-lg font-semibold animate-pulse"
            style={{ color: activeTheme.primaryHex }}
          >
            {message}
          </p>
        </div>
      )}

      {/* Spark Deal Banner */}
      {showBanner && deals && deals.length > 0 && (
        <SparkDealBanner
          deals={deals.slice(0, activeSettings.maxPerSession)}
          currentDealIndex={currentDealIndex}
          onDealChange={handleDealChange}
          onDealClick={handleDealClick}
          scrollSpeed={activeSettings.scrollSpeed}
          theme={activeTheme}
        />
      )}
    </div>
  );
};

export default MatrixProductLoader;
