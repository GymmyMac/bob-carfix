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
  /** Optional product/brand names for subliminal messaging */
  subliminalBrands?: string[];
}

// Abstract characters for continuous rain - NOT readable words
const RAIN_CHARS = [
  // Symbols
  '*', ':', '=', '>', '<', '+', '-', '|', '•', '○', '●', '◆', '◇',
  // Digits
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Letters (single, abstract)
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'X', 'Z',
  // Special
  '#', '@', '$', '%', '&', '~', '^', '/', '\\', '[', ']', '{', '}'
];

// Character fragments that hint at automotive terms without being readable
const CHAR_FRAGMENTS = [
  'BR', 'KE', 'OI', 'FI', 'LT', 'SP', 'RK', 'EN', 'GN', 'PT', 'CL', 'UT', 'AX',
  'WH', 'EL', 'TI', 'RE', 'PA', 'DS', 'RO', 'TR', 'BT', 'HP', 'CV', 'XL'
];

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  isSubliminal: boolean;
  opacity: number;
  size: number;
  glowIntensity: number;
  changeCounter: number;
}

export const MatrixProductLoader: React.FC<MatrixProductLoaderProps> = ({
  phase,
  message,
  onComplete,
  onSparkDealClick,
  subliminalBrands = [],
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

  // CARFIX brand colors matching backdrop
  const activeTheme = theme || {
    primaryHex: '#0066CC',      // CARFIX Blue
    secondaryHex: '#004999',    // Darker blue
    successHex: '#FF9500',      // CARFIX Orange
    backgroundHex: '#111827',
    sparkDealHex: '#FF9500',    // Orange for subliminal
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

  // Combine spark deal words with any provided subliminal brands
  const sparkDealWords = deals && activeSettings.inRain 
    ? [...getSparkDealWords(deals), ...subliminalBrands]
    : subliminalBrands;

  // SUBLIMINAL_PROBABILITY - Only ~8% of drops are readable brand names
  const SUBLIMINAL_PROBABILITY = 0.08;

  /**
   * Get random character - mostly abstract, rarely subliminal brand words.
   * This creates continuous motion with occasional readable content.
   */
  const getRandomChar = useCallback((): { char: string; isSubliminal: boolean } => {
    // Rare subliminal brand/product message (readable)
    if (sparkDealWords.length > 0 && Math.random() < SUBLIMINAL_PROBABILITY) {
      const word = sparkDealWords[Math.floor(Math.random() * sparkDealWords.length)];
      return { char: word, isSubliminal: true };
    }
    
    // Occasional character fragments (semi-readable hints)
    if (Math.random() < 0.15) {
      const fragment = CHAR_FRAGMENTS[Math.floor(Math.random() * CHAR_FRAGMENTS.length)];
      return { char: fragment, isSubliminal: false };
    }
    
    // Default: single abstract character (continuous motion, not readable)
    return { 
      char: RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)], 
      isSubliminal: false 
    };
  }, [sparkDealWords]);

  /**
   * Get color based on drop type and phase.
   * Uses CARFIX brand colors that match the backdrop.
   */
  const getDropColor = useCallback((drop: RainDrop, phaseProgress: number): string => {
    // Subliminal drops get special orange/gold color with glow
    if (drop.isSubliminal) {
      return activeTheme.sparkDealHex;
    }

    // Phase-based color transitions
    if (phase === 'success') {
      return activeTheme.successHex; // Orange flash on success
    }
    
    // Normal rain: vary between primary and secondary blue
    const blend = Math.sin(phaseProgress * 2 + drop.x * 0.01) * 0.5 + 0.5;
    return blend > 0.5 ? activeTheme.primaryHex : activeTheme.secondaryHex;
  }, [phase, activeTheme]);

  /**
   * Initialize rain drops with random positions and characters.
   */
  const initDrops = useCallback((width: number, height: number) => {
    const drops: RainDrop[] = [];
    const columns = Math.floor(width / 25); // Slightly denser columns

    for (let i = 0; i < columns; i++) {
      const { char, isSubliminal } = getRandomChar();
      drops.push({
        x: i * 25 + 12,
        y: Math.random() * height,
        speed: 1.5 + Math.random() * 3.5,
        char,
        isSubliminal,
        opacity: 0.2 + Math.random() * 0.6,
        size: isSubliminal ? 13 : 9 + Math.random() * 3,
        glowIntensity: isSubliminal ? 0.6 : 0,
        changeCounter: Math.floor(Math.random() * 30), // When to change character
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

      // Clear canvas (transparent overlay)
      ctx.clearRect(0, 0, width, height);

      // Draw each drop
      dropsRef.current.forEach((drop) => {
        const color = getDropColor(drop, phaseProgress);
        
        // Set font and style
        ctx.font = `bold ${drop.size}px monospace`;
        ctx.fillStyle = color;
        ctx.globalAlpha = drop.opacity;
        
        // Add glow effect for subliminal drops
        if (drop.isSubliminal && drop.glowIntensity > 0) {
          ctx.shadowColor = activeTheme.sparkDealHex;
          ctx.shadowBlur = 8 * drop.glowIntensity;
        } else {
          ctx.shadowBlur = 0;
        }
        
        // Draw the character
        ctx.fillText(drop.char, drop.x, drop.y);
        
        // Move drop down
        drop.y += drop.speed;
        
        // Change character periodically for continuous motion
        drop.changeCounter++;
        if (drop.changeCounter > 20 + Math.random() * 40) {
          const { char, isSubliminal } = getRandomChar();
          drop.char = char;
          drop.isSubliminal = isSubliminal;
          drop.size = isSubliminal ? 13 : 9 + Math.random() * 3;
          drop.glowIntensity = isSubliminal ? 0.6 : 0;
          drop.changeCounter = 0;
        }
        
        // Reset when off screen
        if (drop.y > height + 20) {
          const { char, isSubliminal } = getRandomChar();
          drop.y = -20;
          drop.char = char;
          drop.isSubliminal = isSubliminal;
          drop.speed = 1.5 + Math.random() * 3.5;
          drop.opacity = 0.2 + Math.random() * 0.6;
          drop.size = isSubliminal ? 13 : 9 + Math.random() * 3;
          drop.glowIntensity = isSubliminal ? 0.6 : 0;
          drop.changeCounter = 0;
        }
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Success phase: flash effect
      if (phase === 'success') {
        const flashIntensity = Math.max(0, 1 - phaseProgress * 2);
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(255, 149, 0, ${flashIntensity * 0.3})`;
          ctx.fillRect(0, 0, width, height);
        }
        
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
      return;
    }

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, activeSettings.delayMs);

    return () => clearTimeout(timer);
  }, [phase, deals, activeSettings, dealsShownCount]);

  const handleDealChange = useCallback((index: number) => {
    setCurrentDealIndex(index);
    setDealsShownCount(prev => prev + 1);
  }, []);

  const handleDealClick = useCallback((deal: SparkDeal) => {
    console.log('[MatrixLoader] Spark deal clicked:', deal.product_name);
    onSparkDealClick?.(deal);
  }, [onSparkDealClick]);

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{ background: 'transparent' }}
    >
      {/* Matrix Rain Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.85 }}
      />

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
