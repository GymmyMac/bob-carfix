# Bob v3.0 - One-Click Rebuild Instructions

> **Master Reference Document for Lovable AI**
> 
> This document serves as the single source of truth for implementing the Bob v3.0 rebuild.
> Work through each phase sequentially. Complete and verify each phase before proceeding.

---

## Table of Contents

1. [Vision & Architecture](#vision--architecture)
2. [Pre-requisites Checklist](#pre-requisites-checklist)
3. [Phase 1: Animation System Rebuild](#phase-1-animation-system-rebuild-critical)
4. [Phase 2: Swipeable Bob Overlay](#phase-2-swipeable-bob-overlay)
5. [Phase 3: Matrix Rain Product Loader](#phase-3-matrix-rain-product-loader)
6. [Phase 4: Full-Width Translucent Product Tiles](#phase-4-full-width-translucent-product-tiles)
7. [Phase 5: LLM Provider Abstraction](#phase-5-llm-provider-abstraction)
8. [Phase 6: Host API Database Migration](#phase-6-host-api-database-migration)
9. [Phase 7: Multi-Tenant Admin Dashboard](#phase-7-multi-tenant-admin-dashboard)
10. [Phase 8: State Management Consolidation](#phase-8-state-management-consolidation)
11. [Final Testing Checklist](#final-testing-checklist)
12. [Rollback Procedures](#rollback-procedures)

---

## Vision & Architecture

### Vision Statement
Transform Bob from a CARFIX-specific chatbot into a **white-label, resellable AI shopping assistant** ("Theatre of the Parts Shop") deployable on any automotive website with minimal configuration.

### Architecture Diagram
```
                    +---------------------------+
                    |    Bob Admin Dashboard    |
                    |  (Multi-tenant capable)   |
                    +---------------------------+
                              |
          +-------------------+-------------------+
          |                   |                   |
    +-----------+       +-----------+       +-----------+
    |  CARFIX   |       |  Host B   |       |  Host C   |
    |  (Primary)|       |  (Future) |       |  (Future) |
    +-----------+       +-----------+       +-----------+
          |                   |                   |
    +---------------------------------------------+
    |           @gymmymac/bob-widget              |
    |  (Single npm package, all hosts use this)   |
    +---------------------------------------------+
          |
    +---------------------------------------------+
    |           Bob Edge Functions                |
    |  - bob-chat (LLM agnostic)                  |
    |  - bob-tts                                  |
    |  - bob-analytics                            |
    +---------------------------------------------+
          |
    +---------------------------------------------+
    |           Bob Database (Supabase)           |
    |  - Animations, Prompts, Settings per tenant |
    |  - API URLs (migrated from hardcode)        |
    +---------------------------------------------+
```

### Key Behaviours
- **Products ALWAYS render full-width** (behind Bob)
- **Bob floats as overlay** (z-50) - can be swiped off-screen
- **Bob auto-returns** when TTS starts speaking
- **Matrix rain loader** creates theatrical anticipation
- **LLM provider** configurable via database
- **Host API URLs** stored in database, not hardcoded

---

## Pre-requisites Checklist

Before starting any phase, verify:

- [ ] Lovable Cloud enabled on project
- [ ] Supabase connection active
- [ ] Existing secrets configured:
  - `CARFIX_PARTNER_API_KEY`
  - `CARFIX_SERVICE_ROLE_KEY`
  - `XAI_API_KEY`
  - `LOVABLE_API_KEY`
  - `GOOGLE_CLOUD_TTS_API_KEY`
- [ ] Widget package exists at `packages/bob-widget/`
- [ ] Edge functions exist at `supabase/functions/bob-chat/`

---

## PHASE 1: Animation System Rebuild (CRITICAL)

### Problem Statement
Current `useBobAnimation.ts` uses `setInterval` which stacks on re-renders, causing animation speed to accelerate over time. After 10+ interactions, Bob's mouth moves impossibly fast.

### Root Cause
```typescript
// PROBLEMATIC PATTERN (current)
useEffect(() => {
  animationIntervalRef.current = setInterval(() => { ... }, speed);
  return () => clearInterval(...);
}, [animationState, alternateImages, isSpeaking]); // <-- isSpeaking causes restarts
```

Every time `isSpeaking` toggles, a new interval starts. Old intervals may not properly clear.

### Solution: Single RequestAnimationFrame Loop

### File: `packages/bob-widget/src/hooks/useBobAnimation.ts`

### Complete Replacement Code

```typescript
import { useState, useEffect, useRef, useMemo } from "react";
import { useBobAnimationData } from "./useBobAnimationData";

export type AnimationState = string;

interface UseBobAnimationOptions {
  isSpeaking?: boolean;
}

export const useBobAnimation = (options: UseBobAnimationOptions = {}) => {
  const { isSpeaking = false } = options;
  
  const [animationState, setAnimationState] = useState<AnimationState>("");
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  // Use refs to avoid re-render triggers
  const frameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef(isSpeaking);
  
  // Keep isSpeaking ref updated without causing re-renders
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Use centralized cached data
  const { data, isLoading } = useBobAnimationData();

  // Derive state-specific data from cached results
  const { imageUrlsMap, alternateImages, offsetsMap, scalesMap, availableStates } = useMemo(() => {
    if (!data) {
      return { 
        imageUrlsMap: {}, 
        alternateImages: {}, 
        offsetsMap: {},
        scalesMap: {},
        availableStates: [] 
      };
    }

    const newImageMap: Record<string, any> = {};
    const newAlternates: Record<string, string[]> = {};
    const newOffsetsMap: Record<string, number[]> = {};
    const newScalesMap: Record<string, number[]> = {};
    const stateKeys = data.states.map(s => s.state_key);

    stateKeys.forEach((key) => {
      const stateConfigs = data.configs
        .filter((config) => config.animation_state === key);
      
      const stateImages = stateConfigs.map((config) => config.image_url);
      const stateOffsets = stateConfigs.map((config) => config.vertical_offset || 0);
      const stateScales = stateConfigs.map((config) => config.scale || 100);

      if (stateImages.length > 0) {
        const stateInfo = data.states.find(s => s.state_key === key);
        newImageMap[key] = {
          url: stateImages[0],
          animation_speed: stateInfo?.animation_speed || 400,
          pause_duration: stateInfo?.pause_duration || 0,
          loop_count: stateInfo?.loop_count || 0,
        };
        newAlternates[key] = stateImages;
        newOffsetsMap[key] = stateOffsets;
        newScalesMap[key] = stateScales;
      }
    });

    return {
      imageUrlsMap: newImageMap,
      alternateImages: newAlternates,
      offsetsMap: newOffsetsMap,
      scalesMap: newScalesMap,
      availableStates: stateKeys,
    };
  }, [data]);

  // Initialize animation state from database
  useEffect(() => {
    if (availableStates.length > 0 && !animationState) {
      setAnimationState(availableStates[0]);
    }
  }, [availableStates, animationState]);

  // CRITICAL: Single RAF-based animation loop
  // Only depends on animationState - NOT isSpeaking
  useEffect(() => {
    const alternates = alternateImages[animationState];
    
    // Cancel any existing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    
    // Reset to first frame
    setSequenceIndex(0);
    lastFrameTimeRef.current = 0;
    
    // If no alternates or single image, no animation needed
    if (!alternates || alternates.length <= 1) {
      return;
    }
    
    const stateInfo = imageUrlsMap[animationState];
    const frameSpeed = stateInfo?.animation_speed || talkSpeed || 400;
    const loopCount = stateInfo?.loop_count || 0;
    const pauseDuration = stateInfo?.pause_duration || 0;
    const isTalkState = animationState.toLowerCase().includes('talk');
    
    let currentLoop = 0;
    let isPaused = false;
    let currentFrame = 0;
    
    const animate = (timestamp: number) => {
      if (isPaused) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      if (elapsed >= frameSpeed) {
        currentFrame = (currentFrame + 1) % alternates.length;
        setSequenceIndex(currentFrame);
        lastFrameTimeRef.current = timestamp;
        
        // Check if completed a loop
        if (currentFrame === 0) {
          currentLoop++;
          
          // If speaking and in talk state, ignore loop_count - keep animating
          if (isTalkState && isSpeakingRef.current) {
            // Continue looping while speaking
          } else if (loopCount > 0 && currentLoop >= loopCount) {
            // Loop count reached - pause or stop
            if (pauseDuration > 0) {
              isPaused = true;
              setTimeout(() => {
                currentLoop = 0;
                isPaused = false;
              }, pauseDuration);
            } else {
              // Stop animation
              return;
            }
          }
        }
      }
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    frameRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    };
  }, [animationState, alternateImages, imageUrlsMap, talkSpeed]); // NO isSpeaking here!

  const getCurrentImage = () => {
    const alternates = alternateImages[animationState];
    
    if (!alternates || alternates.length === 0) {
      const fallbackState = availableStates.find((s) => alternateImages[s]?.length > 0);
      if (fallbackState) {
        return alternateImages[fallbackState][0];
      }
      return "";
    }
    
    return alternates[sequenceIndex] || alternates[0];
  };

  const getCurrentOffset = () => {
    const offsets = offsetsMap[animationState];
    
    if (!offsets || offsets.length === 0) {
      const fallbackState = availableStates.find((s) => offsetsMap[s]?.length > 0);
      if (fallbackState) {
        return offsetsMap[fallbackState][0];
      }
      return 0;
    }
    
    return offsets[sequenceIndex] || offsets[0];
  };

  const getCurrentScale = () => {
    const scales = scalesMap[animationState];
    
    if (!scales || scales.length === 0) {
      const fallbackState = availableStates.find((s) => scalesMap[s]?.length > 0);
      if (fallbackState) {
        return scalesMap[fallbackState][0];
      }
      return 100;
    }
    
    return scales[sequenceIndex] || scales[0];
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    getCurrentOffset,
    getCurrentScale,
    imageUrls: imageUrlsMap,
    availableStates,
    setTalkSpeed,
    manualMode,
    setManualMode,
    isLoading,
  };
};
```

### Key Changes Made
1. ✅ Replaced `setInterval` with `requestAnimationFrame`
2. ✅ Removed `isSpeaking` from useEffect dependencies
3. ✅ Store `isSpeaking` in a ref to read current value without re-renders
4. ✅ Single cleanup function with `cancelAnimationFrame`
5. ✅ Frame timing uses `timestamp` parameter from RAF

### Verification Checklist
- [ ] Animation speed stays consistent after 10+ interactions
- [ ] Animation speed stays consistent after 30+ seconds
- [ ] No console warnings about interval cleanup
- [ ] isSpeaking changes do NOT restart animation loop
- [ ] Talk state continues looping while speaking
- [ ] Talk state respects loop_count when NOT speaking

---

## PHASE 2: Swipeable Bob Overlay

### Concept
- Products **ALWAYS** render full-width (no conditional width based on Bob visibility)
- Bob floats on top as an **overlay** (z-50)
- User can **swipe Bob left** to hide him
- A "BOB" tab remains on screen edge to bring him back
- Bob **auto-reappears** when TTS starts speaking

### New File: `packages/bob-widget/src/components/SwipeableBob.tsx`

```typescript
import React, { useState, useRef, useEffect } from "react";

interface SwipeableBobProps {
  children: React.ReactNode;
  isSpeaking?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export const SwipeableBob: React.FC<SwipeableBobProps> = ({
  children,
  isSpeaking = false,
  onVisibilityChange
}) => {
  const [bobHidden, setBobHidden] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    startX.current = e.touches[0].clientX;
    startOffset.current = swipeOffset;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    const deltaX = e.touches[0].clientX - startX.current;
    // Only allow swipe left (negative delta)
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX + startOffset.current, -window.innerWidth));
    } else if (startOffset.current < 0) {
      // Allow dragging back if already swiped
      setSwipeOffset(Math.min(0, deltaX + startOffset.current));
    }
  };

  const handleTouchEnd = () => {
    if (isAnimating) return;
    
    // If swiped more than 40% of screen width, hide Bob
    if (swipeOffset < -window.innerWidth * 0.4) {
      setIsAnimating(true);
      setSwipeOffset(-window.innerWidth);
      setBobHidden(true);
      onVisibilityChange?.(false);
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      // Snap back
      setIsAnimating(true);
      setSwipeOffset(0);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Auto-reappear when speaking
  useEffect(() => {
    if (isSpeaking && bobHidden) {
      setIsAnimating(true);
      setBobHidden(false);
      setSwipeOffset(0);
      onVisibilityChange?.(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isSpeaking, bobHidden, onVisibilityChange]);

  // Bring Bob back when tab is clicked
  const handleBringBack = () => {
    setIsAnimating(true);
    setBobHidden(false);
    setSwipeOffset(0);
    onVisibilityChange?.(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <>
      {/* Bob character - OVERLAY on top of products */}
      <div 
        className={`fixed bottom-0 left-0 z-50 ${isAnimating ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          pointerEvents: bobHidden ? 'none' : 'auto'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Swipe indicator - subtle hint */}
        {!bobHidden && swipeOffset === 0 && (
          <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 opacity-30">
            <div className="w-1 h-12 bg-white/50 rounded-full" />
          </div>
        )}
      </div>

      {/* "BOB" tab when hidden */}
      {bobHidden && (
        <button
          onClick={handleBringBack}
          className="fixed left-0 bottom-1/3 z-40 bg-blue-600 text-white 
                     px-2 py-4 rounded-r-lg shadow-lg hover:bg-blue-700 
                     transition-colors active:bg-blue-800"
          style={{ writingMode: 'vertical-rl' }}
          aria-label="Bring Bob back"
        >
          <span className="font-bold text-sm tracking-wider">BOB</span>
        </button>
      )}
    </>
  );
};

export default SwipeableBob;
```

### File: `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx`

### Integration Changes

Update the layout to use SwipeableBob and render products at full width:

```typescript
// Add import at top
import { SwipeableBob } from "../SwipeableBob";

// In the component, replace the Bob character rendering with:

// Products are now ALWAYS full width - no conditional sizing
// Bob overlays on top

return (
  <div 
    className="fixed inset-0 overflow-hidden"
    style={{
      height: '100dvh',
      touchAction: 'manipulation'
    }}
  >
    {/* Background */}
    {/* ... existing backdrop code ... */}

    {/* Product Column - ALWAYS FULL WIDTH */}
    <MobileProductColumn
      products={products}
      servicePackages={servicePackages}
      highlightedPartType={highlightedPartType}
      highlightedProduct={highlightedProduct}
      onProductClick={onProductClick}
      onPackageSelect={onPackageSelect}
      isResearching={isResearching}
      visible={showProductColumn}
      counterHeightPercent={counterHeightPercent}
      hasVehicle={!!vehicle}
      fullWidth={true}  // NEW PROP - always full width
    />

    {/* Bob Character - OVERLAY, SWIPEABLE */}
    <SwipeableBob isSpeaking={isSpeaking}>
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={finalBobScale}
        position="left"  // Always left positioned
        verticalOffset={bobOffset}
      />
    </SwipeableBob>

    {/* Vehicle Context Bar */}
    {/* ... existing vehicle bar code ... */}

    {/* Chat Drawer */}
    <MobileChatDrawer ... />
  </div>
);
```

### Verification Checklist
- [ ] Products display at full viewport width
- [ ] Bob character overlays products (visible on top)
- [ ] Swipe Bob left - he slides off screen with spring animation
- [ ] "BOB" vertical tab visible on left edge when hidden
- [ ] Tap "BOB" tab - Bob slides back in
- [ ] Bob automatically returns when TTS starts speaking
- [ ] Products remain visible and interactive when Bob hidden
- [ ] Swipe gesture only works on Bob, not the whole screen

---

## PHASE 3: Matrix Rain Product Loader

### Concept
Replace basic loading toasts/spinners with theatrical "matrix rain" effect using automotive-themed characters. Creates anticipation and delight.

### New File: `packages/bob-widget/src/components/MatrixProductLoader.tsx`

```typescript
import React, { useRef, useEffect, useState } from "react";

interface MatrixProductLoaderProps {
  phase: 'researching' | 'loading' | 'success' | 'hidden';
  message?: string;
  onComplete?: () => void;
}

const CHAR_SETS = {
  automotive: 'CARFIX BRAKES PADS OIL FILTER ROTORS SPARK PLUGS',
  symbols: '* : = > < + -',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
};

export const MatrixProductLoader: React.FC<MatrixProductLoaderProps> = ({
  phase,
  message = "Bob's checking the shelves...",
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [opacity, setOpacity] = useState(0);
  
  // Fade in/out based on phase
  useEffect(() => {
    if (phase === 'hidden') {
      setOpacity(0);
    } else {
      setOpacity(1);
    }
  }, [phase]);
  
  // Matrix rain animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === 'hidden') return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = new Array(columns).fill(0);
    const chars = Object.values(CHAR_SETS).join('').split('').filter(c => c !== ' ');

    // Color based on phase
    const getColor = () => {
      switch (phase) {
        case 'success': return '#22c55e'; // Green
        case 'loading': return '#60a5fa'; // Lighter blue
        default: return '#3b82f6'; // Blue
      }
    };
    
    const draw = () => {
      // Semi-transparent black for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw characters
      ctx.fillStyle = getColor();
      ctx.font = `${fontSize}px monospace`;
      
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        ctx.fillText(char, x, y * fontSize);
        
        // Reset drop to top with random probability
        if (y * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] = y + 1;
        }
      });
      
      // Slow down for 'loading' phase
      const speed = phase === 'loading' ? 80 : 50;
      
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(draw);
      }, speed);
    };
    
    animationRef.current = requestAnimationFrame(draw);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);
  
  // Trigger onComplete after success animation
  useEffect(() => {
    if (phase === 'success' && onComplete) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);
  
  if (phase === 'hidden') return null;
  
  const phaseMessages: Record<string, string> = {
    researching: "Bob's checking the shelves...",
    loading: "Found some options...",
    success: "Here's what I found!"
  };
  
  return (
    <div 
      className="relative w-full h-48 rounded-2xl overflow-hidden transition-opacity duration-300"
      style={{ opacity, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.4 }}
      />
      
      {/* Center message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="bg-black/40 backdrop-blur-sm px-6 py-3 rounded-xl">
          <p className={`text-lg font-bold text-white ${phase === 'researching' ? 'animate-pulse' : ''}`}>
            {message || phaseMessages[phase]}
          </p>
        </div>
        
        {phase === 'researching' && (
          <div className="mt-4 flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrixProductLoader;
```

### Integration into MobileProductColumn

Update `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`:

```typescript
// Add import
import { MatrixProductLoader } from "../MatrixProductLoader";

// In the component, replace the loading state with:

{/* Matrix Loading Animation */}
{showLoading && (
  <MatrixProductLoader
    phase={isResearching ? 'researching' : 'loading'}
    message={isResearching ? "Bob's checking the shelves..." : "Found some options..."}
  />
)}

// When transitioning to products, briefly show 'success' phase
```

### Verification Checklist
- [ ] Matrix rain animation displays during research
- [ ] Characters fall in blue color during 'researching'
- [ ] Message text visible and pulsing
- [ ] Animation slows during 'loading' phase
- [ ] Green flash on 'success' phase
- [ ] Smooth fade transition to product cards
- [ ] Animation doesn't cause performance issues
- [ ] Canvas properly cleans up on unmount

---

## PHASE 4: Full-Width Translucent Product Tiles

### Design Specification
- Full viewport width (edge to edge)
- Translucent white background with backdrop blur
- Layout: Image left (96x96), details middle, "Add" button right
- Premium feel with subtle shadows and hover effects

### New File: `packages/bob-widget/src/components/ProductTile.tsx`

```typescript
import React from "react";
import type { Product } from "../types";

interface ProductTileProps {
  product: Product;
  isSpotlighted?: boolean;
  onSelect?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export const ProductTile: React.FC<ProductTileProps> = ({
  product,
  isSpotlighted = false,
  onSelect,
  onAddToCart
}) => {
  return (
    <div 
      className={`
        flex items-center gap-4 p-4 w-full rounded-2xl cursor-pointer
        backdrop-blur-md bg-white/80 border transition-all duration-300
        hover:bg-white/95 hover:shadow-xl hover:-translate-y-0.5
        active:scale-[0.99] active:bg-white/90
        ${isSpotlighted 
          ? 'border-blue-400 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20' 
          : 'border-white/50 shadow-lg'
        }
      `}
      onClick={() => onSelect?.(product)}
    >
      {/* Spotlight badge */}
      {isSpotlighted && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 
                         text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-md">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Bob's Pick
          </span>
        </div>
      )}
      
      {/* Left: Product Image (96x96) */}
      <div className="w-24 h-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Middle: Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-xs sm:text-sm text-gray-600 truncate">
            {product.brand}
          </p>
        )}
        <p className="text-lg font-bold text-blue-600 mt-1">
          {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
        </p>
      </div>
      
      {/* Right: Action Button */}
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          onAddToCart?.(product); 
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium 
                   hover:bg-blue-700 active:bg-blue-800 transition-colors
                   text-sm whitespace-nowrap"
      >
        Add
      </button>
    </div>
  );
};

export default ProductTile;
```

### Update MobileProductColumn to use ProductTile

In the mobile card rendering section, replace the existing card with:

```typescript
import { ProductTile } from "../ProductTile";

// In the product mapping:
{products.map((product) => (
  <ProductTile
    key={product.id}
    product={product}
    isSpotlighted={highlightedProduct && productMatchesSpotlight(product, highlightedProduct)}
    onSelect={onProductClick}
    onAddToCart={onAddToCart}
  />
))}
```

### Verification Checklist
- [ ] Tiles span full width of product column
- [ ] Backdrop blur visible (glassmorphism effect)
- [ ] Image displays on left at 96x96
- [ ] Product name, brand, price visible in middle
- [ ] "Add" button on right, functional
- [ ] Spotlight badge shows on highlighted products
- [ ] Hover effects work smoothly
- [ ] Tap/click triggers onSelect callback
- [ ] Add button triggers onAddToCart callback

---

## PHASE 5: LLM Provider Abstraction

### Goal
Enable easy switching between Lovable AI, OpenAI direct, Anthropic, or custom endpoints via database configuration - no code changes required.

### Database Migration

Run this SQL migration to create the LLM configuration table:

```sql
-- Create bob_tenants table first (needed for foreign key)
CREATE TABLE IF NOT EXISTS public.bob_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  domain TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view tenants" ON public.bob_tenants FOR SELECT USING (true);
CREATE POLICY "Admins can insert tenants" ON public.bob_tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update tenants" ON public.bob_tenants FOR UPDATE USING (true);
CREATE POLICY "Admins can delete tenants" ON public.bob_tenants FOR DELETE USING (true);

-- Create bob_llm_config table
CREATE TABLE IF NOT EXISTS public.bob_llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.bob_tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable',
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  api_key_secret_name TEXT,
  endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_llm_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view LLM config" ON public.bob_llm_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert LLM config" ON public.bob_llm_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update LLM config" ON public.bob_llm_config FOR UPDATE USING (true);
CREATE POLICY "Admins can delete LLM config" ON public.bob_llm_config FOR DELETE USING (true);

-- Insert CARFIX tenant
INSERT INTO public.bob_tenants (name, code, domain) 
VALUES ('CARFIX', 'carfix', 'carfix.co.nz')
ON CONFLICT (code) DO NOTHING;

-- Insert default Lovable AI config for CARFIX
INSERT INTO public.bob_llm_config (tenant_id, provider, model, is_active)
SELECT id, 'lovable', 'google/gemini-2.5-flash', true
FROM public.bob_tenants WHERE code = 'carfix';
```

### Edge Function Update: `supabase/functions/bob-chat/index.ts`

Add these types and functions near the top (after existing interfaces):

```typescript
// ============= LLM PROVIDER ABSTRACTION =============
interface LLMConfig {
  provider: 'lovable' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey: string;
  endpoint: string;
}

const LLM_ENDPOINTS = {
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

async function getLLMConfig(tenantCode: string = 'carfix'): Promise<LLMConfig> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('Using default Lovable AI config (no Supabase credentials)');
    return {
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      apiKey: Deno.env.get('LOVABLE_API_KEY') || '',
      endpoint: LLM_ENDPOINTS.lovable,
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get tenant ID
    const { data: tenant } = await supabase
      .from('bob_tenants')
      .select('id')
      .eq('code', tenantCode)
      .single();
    
    if (!tenant) {
      console.log(`Tenant ${tenantCode} not found, using default config`);
      return {
        provider: 'lovable',
        model: 'google/gemini-2.5-flash',
        apiKey: Deno.env.get('LOVABLE_API_KEY') || '',
        endpoint: LLM_ENDPOINTS.lovable,
      };
    }
    
    // Get active LLM config for tenant
    const { data: config } = await supabase
      .from('bob_llm_config')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single();
    
    if (!config) {
      console.log('No LLM config found, using default');
      return {
        provider: 'lovable',
        model: 'google/gemini-2.5-flash',
        apiKey: Deno.env.get('LOVABLE_API_KEY') || '',
        endpoint: LLM_ENDPOINTS.lovable,
      };
    }
    
    // Get API key from secret if specified
    let apiKey = '';
    if (config.provider === 'lovable') {
      apiKey = Deno.env.get('LOVABLE_API_KEY') || '';
    } else if (config.api_key_secret_name) {
      apiKey = Deno.env.get(config.api_key_secret_name) || '';
    }
    
    // Determine endpoint
    const endpoint = config.endpoint || LLM_ENDPOINTS[config.provider as keyof typeof LLM_ENDPOINTS] || LLM_ENDPOINTS.lovable;
    
    console.log(`Using LLM config: provider=${config.provider}, model=${config.model}`);
    
    return {
      provider: config.provider,
      model: config.model,
      apiKey,
      endpoint,
    };
  } catch (error) {
    console.error('Error fetching LLM config:', error);
    return {
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      apiKey: Deno.env.get('LOVABLE_API_KEY') || '',
      endpoint: LLM_ENDPOINTS.lovable,
    };
  }
}
```

Then update the main chat handler to use this config:

```typescript
// In the serve handler, get LLM config:
const llmConfig = await getLLMConfig(hostConfig?.partnerCode || 'carfix');

// Update the fetch call to use llmConfig:
const response = await fetch(llmConfig.endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${llmConfig.apiKey}`,
  },
  body: JSON.stringify({
    model: llmConfig.model,
    messages: messages,
    tools: tools,
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  }),
});
```

### Verification Checklist
- [ ] `bob_tenants` table exists with CARFIX entry
- [ ] `bob_llm_config` table exists with default Lovable AI config
- [ ] Chat continues to work after changes (no regression)
- [ ] Console logs show "Using LLM config: provider=lovable"
- [ ] Config can be changed via database (test with UPDATE query)

---

## PHASE 6: Host API Database Migration

### Goal
Remove ALL hardcoded CARFIX API URLs from edge functions. Store them in database for multi-tenant support. Pre-populate with existing CARFIX configuration.

### Current Hardcoded URLs to Remove

In `supabase/functions/bob-chat/index.ts`:
```typescript
// REMOVE THIS - Lines ~485-489
const DEFAULT_API_CONFIG = {
  baseUrl: "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1",
  getApiKey: () => Deno.env.get("CARFIX_SERVICE_ROLE_KEY") || "",
  partnerCode: "CARFIX",
};
```

### Database Migration

```sql
-- Create bob_api_config table
CREATE TABLE IF NOT EXISTS public.bob_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.bob_tenants(id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_secret_name TEXT,
  custom_headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bob_api_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view API config" ON public.bob_api_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert API config" ON public.bob_api_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update API config" ON public.bob_api_config FOR UPDATE USING (true);
CREATE POLICY "Admins can delete API config" ON public.bob_api_config FOR DELETE USING (true);

-- Pre-populate with existing CARFIX URLs
INSERT INTO public.bob_api_config (tenant_id, endpoint_type, base_url, api_key_secret_name)
SELECT 
  id as tenant_id,
  endpoint_type,
  base_url,
  'CARFIX_SERVICE_ROLE_KEY' as api_key_secret_name
FROM public.bob_tenants, 
(VALUES 
  ('base', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1'),
  ('retrieve_vehicle', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-vehicle-info'),
  ('retrieve_parts', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-parts'),
  ('service_packages', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/service-packages'),
  ('search_products', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/search-products'),
  ('add_to_cart', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/add-to-cart'),
  ('get_cart', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/get-cart'),
  ('create_checkout', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/create-checkout'),
  ('customer_context', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/customer-context'),
  ('product_details', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/product-details'),
  ('check_fitment', 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/check-fitment')
) AS endpoints(endpoint_type, base_url)
WHERE bob_tenants.code = 'carfix';
```

### Edge Function Update: `supabase/functions/bob-chat/index.ts`

Add API config fetching function:

```typescript
// ============= HOST API ABSTRACTION =============
interface ApiEndpointConfig {
  url: string;
  apiKey: string;
  headers: Record<string, string>;
}

// Cache for API configs (per request, not global)
const apiConfigCache: Map<string, ApiEndpointConfig> = new Map();

async function getApiEndpoint(tenantCode: string, endpointType: string): Promise<ApiEndpointConfig> {
  const cacheKey = `${tenantCode}:${endpointType}`;
  
  if (apiConfigCache.has(cacheKey)) {
    return apiConfigCache.get(cacheKey)!;
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for API config');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get tenant
  const { data: tenant } = await supabase
    .from('bob_tenants')
    .select('id')
    .eq('code', tenantCode)
    .single();
  
  if (!tenant) {
    throw new Error(`Tenant ${tenantCode} not found`);
  }
  
  // Get endpoint config
  const { data: config, error } = await supabase
    .from('bob_api_config')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('endpoint_type', endpointType)
    .eq('is_active', true)
    .single();
  
  if (error || !config) {
    throw new Error(`No API config for ${endpointType} on tenant ${tenantCode}`);
  }
  
  // Get API key from secret
  const apiKey = config.api_key_secret_name 
    ? Deno.env.get(config.api_key_secret_name) || ''
    : '';
  
  const result: ApiEndpointConfig = {
    url: config.base_url,
    apiKey,
    headers: config.custom_headers || {},
  };
  
  apiConfigCache.set(cacheKey, result);
  return result;
}

// Helper to get base URL for a tenant
async function getApiBaseUrl(tenantCode: string): Promise<string> {
  const config = await getApiEndpoint(tenantCode, 'base');
  return config.url;
}
```

Update tool functions to use the new config:

```typescript
async function lookupVehicle(args: Record<string, unknown>, tenantCode: string): Promise<unknown> {
  console.log('Looking up vehicle with args:', JSON.stringify(args));
  
  try {
    const config = await getApiEndpoint(tenantCode, 'retrieve_vehicle');
    
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: JSON.stringify(args)
    });
    
    // ... rest of function
  } catch (error) {
    console.error('Vehicle lookup error:', error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Similar updates for:
// - retrieveParts()
// - retrieveServicePackages()
// - searchProducts()
// - addToCart()
// - getCart()
// - createCheckout()
// - getCustomerContext()
// - getProductDetails()
// - checkVehicleFitment()
```

### Remove Hardcoded Default

Delete or comment out the `DEFAULT_API_CONFIG` constant:

```typescript
// REMOVED - Now fetched from database
// const DEFAULT_API_CONFIG = { ... };
```

### Verification Checklist
- [ ] `bob_api_config` table exists
- [ ] CARFIX endpoints pre-populated (11 entries)
- [ ] No hardcoded URLs remain in bob-chat/index.ts
- [ ] Vehicle lookup works
- [ ] Parts retrieval works
- [ ] Service packages work
- [ ] Cart operations work
- [ ] Console shows "Using API config for [endpoint_type]"

---

## PHASE 7: Multi-Tenant Admin Dashboard

### New Admin Tab: "Tenants"

Add a new tab to the admin panel to manage tenants and their configurations.

### New File: `src/components/TenantManager.tsx`

```typescript
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Settings, Globe, Key } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
}

interface ApiEndpoint {
  id: string;
  endpoint_type: string;
  base_url: string;
  api_key_secret_name: string | null;
  is_active: boolean;
}

interface LLMConfig {
  id: string;
  provider: string;
  model: string;
  is_active: boolean;
}

export const TenantManager: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      const { data, error } = await supabase
        .from('bob_tenants')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        toast.error('Failed to load tenants');
        console.error(error);
      } else {
        setTenants(data || []);
      }
      setLoading(false);
    };
    
    fetchTenants();
  }, []);

  // Fetch tenant details when selected
  useEffect(() => {
    if (!selectedTenant) {
      setEndpoints([]);
      setLlmConfig(null);
      return;
    }

    const fetchTenantDetails = async () => {
      // Fetch API endpoints
      const { data: endpointData } = await supabase
        .from('bob_api_config')
        .select('*')
        .eq('tenant_id', selectedTenant.id)
        .order('endpoint_type');
      
      setEndpoints(endpointData || []);

      // Fetch LLM config
      const { data: llmData } = await supabase
        .from('bob_llm_config')
        .select('*')
        .eq('tenant_id', selectedTenant.id)
        .eq('is_active', true)
        .single();
      
      setLlmConfig(llmData);
    };

    fetchTenantDetails();
  }, [selectedTenant]);

  const handleToggleTenantActive = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('bob_tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id);
    
    if (error) {
      toast.error('Failed to update tenant');
    } else {
      setTenants(prev => prev.map(t => 
        t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success(`Tenant ${!tenant.is_active ? 'activated' : 'deactivated'}`);
    }
  };

  if (loading) {
    return <div className="p-6">Loading tenants...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tenants List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Tenant Management
              </CardTitle>
              <CardDescription>
                Manage Bob deployments across different host sites
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Tenant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>LLM Provider</TableHead>
                <TableHead>API Endpoints</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(tenant => (
                <TableRow 
                  key={tenant.id}
                  className={selectedTenant?.id === tenant.id ? 'bg-muted/50' : ''}
                >
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {tenant.code}
                    </code>
                  </TableCell>
                  <TableCell>{tenant.domain || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {selectedTenant?.id === tenant.id && llmConfig 
                        ? llmConfig.provider 
                        : 'lovable'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {selectedTenant?.id === tenant.id 
                      ? `${endpoints.length} configured`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedTenant(
                          selectedTenant?.id === tenant.id ? null : tenant
                        )}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={tenant.is_active}
                        onCheckedChange={() => handleToggleTenantActive(tenant)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected Tenant Configuration */}
      {selectedTenant && (
        <>
          {/* LLM Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedTenant.name} - LLM Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {llmConfig ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <p className="font-medium">{llmConfig.provider}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <p className="font-medium">{llmConfig.model}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={llmConfig.is_active ? 'default' : 'secondary'}>
                      {llmConfig.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No LLM configuration found</p>
              )}
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5" />
                {selectedTenant.name} - API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint Type</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>API Key Secret</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map(endpoint => (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {endpoint.endpoint_type}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {endpoint.base_url}
                      </TableCell>
                      <TableCell>
                        {endpoint.api_key_secret_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.is_active ? 'default' : 'secondary'}>
                          {endpoint.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TenantManager;
```

### Update Admin.tsx

Add the Tenants tab:

```typescript
// Add import
import { TenantManager } from "@/components/TenantManager";
import { Globe } from "lucide-react";

// Add to TabsList (inside the grid):
<TabsTrigger value="tenants" className="gap-2">
  <Globe className="w-4 h-4" />
  Tenants
</TabsTrigger>

// Add TabsContent:
<TabsContent value="tenants" className="space-y-6 mt-6">
  <TenantManager />
</TabsContent>
```

### Verification Checklist
- [ ] "Tenants" tab visible in admin panel
- [ ] CARFIX tenant displayed in table
- [ ] Clicking Settings shows tenant configuration
- [ ] LLM configuration section displays
- [ ] API endpoints table displays all 11 endpoints
- [ ] Toggle switch updates tenant active status

---

## PHASE 8: State Management Consolidation

### Goal
Single source of truth - use widget package hooks only. Remove duplicate hooks from `src/hooks/`.

### Files to DELETE

These files in `src/hooks/` are duplicates of widget package implementations:

1. `src/hooks/useBobChat.ts` - Use `packages/bob-widget/src/hooks/useBobChat.ts`
2. `src/hooks/useBobAnimation.ts` - Use widget version (updated in Phase 1)
3. `src/hooks/useBobStateTransitions.ts` - Use widget version
4. `src/hooks/useBobAnimationData.ts` - Use widget version
5. `src/hooks/useBobBackdrop.ts` - Use widget version

### Files to UPDATE

**`src/pages/Index.tsx`**

Update imports to use widget package:

```typescript
// BEFORE
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobChat, HighlightedProduct } from "@/hooks/useBobChat";
import { useBobStateTransitions } from "@/hooks/useBobStateTransitions";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";

// AFTER
import { 
  useBobAnimation, 
  useBobChat, 
  useBobStateTransitions,
  useBobBackdrop,
  type HighlightedProduct 
} from "@bob-widget";

// Or if widget not aliased:
import { 
  useBobAnimation, 
  useBobChat, 
  useBobStateTransitions,
  useBobBackdrop 
} from "packages/bob-widget/src";
import type { HighlightedProduct } from "packages/bob-widget/src/types";
```

**`src/pages/Admin.tsx`**

Update imports similarly:

```typescript
// BEFORE
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";

// AFTER
import { useBobAnimation, useBobBackdrop } from "@bob-widget";
```

### Export from Widget Package

Ensure `packages/bob-widget/src/index.ts` exports all hooks:

```typescript
// Hooks
export { useBobAnimation } from "./hooks/useBobAnimation";
export { useBobChat } from "./hooks/useBobChat";
export { useBobStateTransitions } from "./hooks/useBobStateTransitions";
export { useBobBackdrop } from "./hooks/useBobBackdrop";
export { useBobAnimationData } from "./hooks/useBobAnimationData";

// Types
export type { HighlightedProduct } from "./types/message";
export type { AnimationState } from "./hooks/useBobAnimation";
```

### Keep These Files (Not Duplicates)

- `src/hooks/useBobAnimationConfig.ts` - Admin-specific, uses different data
- `src/hooks/useServicePackages.ts` - Unique functionality
- `src/hooks/useSessionHandoff.ts` - Unique functionality
- `src/hooks/useSpeechRecognition.ts` - May be duplicated in widget, check
- `src/hooks/useSpeechSynthesis.ts` - May be duplicated in widget, check
- `src/hooks/use-mobile.tsx` - Shadcn utility
- `src/hooks/use-toast.ts` - Shadcn utility

### Verification Checklist
- [ ] Delete 5 duplicate hook files from `src/hooks/`
- [ ] Update Index.tsx imports
- [ ] Update Admin.tsx imports  
- [ ] Widget package exports all required hooks
- [ ] No TypeScript errors after changes
- [ ] Chat functionality works
- [ ] Animation works
- [ ] Backdrop loads
- [ ] State transitions work

---

## Final Testing Checklist

After completing all phases, verify end-to-end functionality:

### Animation System
- [ ] Animation speed consistent after 10+ chat interactions
- [ ] Animation speed consistent after 60+ seconds
- [ ] State transitions work (page_load → awaiting_input → processing → streaming → complete)
- [ ] Talk state loops while speaking, stops when not speaking
- [ ] No console warnings about interval cleanup

### Products & Shelf
- [ ] Matrix loader shows during "researching" phase
- [ ] Products display correctly after found
- [ ] Full-width translucent tiles render properly
- [ ] Add to cart button works
- [ ] Product spotlight (Bob's Pick) displays correctly
- [ ] Part type highlighting scrolls to correct section

### Bob Overlay Behaviour
- [ ] Bob displays as overlay on products
- [ ] Swipe Bob left - slides off screen with animation
- [ ] "BOB" vertical tab visible on left edge when hidden
- [ ] Tap tab - Bob slides back in
- [ ] Bob auto-returns when TTS starts speaking
- [ ] Products remain visible and interactive when Bob hidden

### Service Packages
- [ ] Service packages display before individual parts
- [ ] Package cards render correctly
- [ ] Package selection opens detail dialog

### Admin Panel
- [ ] Controls tab works
- [ ] Prompts tab works
- [ ] Settings tab works
- [ ] Gallery tab works
- [ ] Backdrop tab works
- [ ] Tenants tab works (new)
- [ ] CARFIX tenant visible with correct configuration

### Multi-Tenant System
- [ ] `bob_tenants` table has CARFIX entry
- [ ] `bob_llm_config` table has Lovable AI default
- [ ] `bob_api_config` table has 11 CARFIX endpoints
- [ ] No hardcoded URLs in edge functions
- [ ] Chat works end-to-end (no regressions)

### Speech
- [ ] TTS speaks Bob's responses (when not muted)
- [ ] Speech recognition captures user input
- [ ] Mute toggle works

---

## Rollback Procedures

### General Rollback Steps
1. Revert to previous git commit
2. Redeploy edge functions: `supabase functions deploy bob-chat`
3. Database changes require manual SQL rollback (see below)

### Phase-Specific Rollbacks

**Phase 1 (Animation)**: Revert `packages/bob-widget/src/hooks/useBobAnimation.ts`

**Phase 2 (Swipeable Bob)**: Delete `SwipeableBob.tsx`, revert `MobileBobLayout.tsx`

**Phase 3 (Matrix Loader)**: Delete `MatrixProductLoader.tsx`, revert loader in `MobileProductColumn.tsx`

**Phase 4 (Product Tiles)**: Delete `ProductTile.tsx`, revert product cards in `MobileProductColumn.tsx`

**Phase 5 (LLM Abstraction)**: 
```sql
DROP TABLE IF EXISTS public.bob_llm_config;
```
Revert bob-chat/index.ts LLM functions

**Phase 6 (API Migration)**:
```sql
DROP TABLE IF EXISTS public.bob_api_config;
DROP TABLE IF EXISTS public.bob_tenants;
```
Restore hardcoded `DEFAULT_API_CONFIG` in bob-chat/index.ts

**Phase 7 (Admin Tenants)**: Delete `TenantManager.tsx`, remove tab from Admin.tsx

**Phase 8 (Consolidation)**: Restore deleted files from git, revert import changes

---

## Summary

### Files Created
| File | Description |
|------|-------------|
| `packages/bob-widget/src/components/SwipeableBob.tsx` | Swipeable overlay wrapper for Bob |
| `packages/bob-widget/src/components/MatrixProductLoader.tsx` | Matrix rain loading animation |
| `packages/bob-widget/src/components/ProductTile.tsx` | Full-width translucent product card |
| `src/components/TenantManager.tsx` | Multi-tenant admin component |

### Files Modified
| File | Changes |
|------|---------|
| `packages/bob-widget/src/hooks/useBobAnimation.ts` | RAF-based animation loop |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | SwipeableBob integration, full-width products |
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Matrix loader, ProductTile integration |
| `supabase/functions/bob-chat/index.ts` | LLM + API abstraction from database |
| `src/pages/Admin.tsx` | Tenants tab |
| `src/pages/Index.tsx` | Widget package imports |

### Files Deleted
| File | Reason |
|------|--------|
| `src/hooks/useBobChat.ts` | Duplicate of widget |
| `src/hooks/useBobAnimation.ts` | Duplicate of widget |
| `src/hooks/useBobStateTransitions.ts` | Duplicate of widget |
| `src/hooks/useBobAnimationData.ts` | Duplicate of widget |
| `src/hooks/useBobBackdrop.ts` | Duplicate of widget |

### Database Tables Created
| Table | Purpose |
|-------|---------|
| `bob_tenants` | Host site configurations |
| `bob_llm_config` | LLM provider settings per tenant |
| `bob_api_config` | API endpoint URLs per tenant |

---

## Implementation Notes for Lovable AI

When implementing this document:

1. **Work phase by phase** - Complete each phase fully before starting the next
2. **Run verification checks** - After each phase, manually verify all listed items
3. **Preserve CARFIX functionality** - Every phase must maintain working chat
4. **Create database tables FIRST** - Before code changes that depend on them
5. **Deploy edge functions** - After any changes to `supabase/functions/`
6. **Test incrementally** - Don't wait until the end to test
7. **Commit after each phase** - Enables easy rollback if needed

### Phase Dependencies
```
Phase 1 (Animation) ─┐
Phase 2 (Swipe)     ─┼─> Can run in parallel, no dependencies
Phase 3 (Matrix)    ─┤
Phase 4 (Tiles)     ─┘

Phase 5 (LLM)       ─┐
                     ├─> Phase 5 must complete before Phase 6
Phase 6 (API)       ─┘

Phase 7 (Admin)     ─── Depends on Phases 5 & 6 (needs tables)

Phase 8 (Cleanup)   ─── Run last after all features verified
```

---

## APPENDIX A: API Response Fixtures

> **Reference document for pricing integrity.**
> 
> Bob MUST only quote prices from these data fields. Never fabricate prices.

---

### A.1 - retrieve_parts Response (Individual Parts)

```json
{
  "success": true,
  "parts": [
    {
      "SKU": "BP-TYT-CF001",
      "Part Product Type": "BRAKE PAD KIT",
      "Brand": "CARFIX",
      "Part No": "CF-BP-1234",
      "Part Number": "CF-BP-1234",
      "Metro Retail Price": 89.99,
      "partslot_description": "FRONT BRAKE PAD KIT",
      "In Stock": "Yes"
    },
    {
      "SKU": "BP-TYT-BC002",
      "Part Product Type": "BRAKE PAD KIT", 
      "Brand": "BOSCH",
      "Part No": "0986AB1234",
      "Part Number": "0986AB1234",
      "Metro Retail Price": 129.99,
      "partslot_description": "FRONT BRAKE PAD KIT",
      "In Stock": "Yes"
    }
  ],
  "total_found": 2,
  "filter_applied": "BRAKE PAD"
}
```

**Price Field Bob MUST Use:** `Metro Retail Price` (mapped to `price` in frontend)

---

### A.2 - retrieve_service_packages Response (Service Bundles)

```json
{
  "success": true,
  "data": {
    "servicePackages": [
      {
        "id": "brake-service",
        "title": "Complete Brake Service",
        "description": "Front brake pads and rotors - everything you need",
        "from_price": 249.99,
        "bundle_discount_percentage": 0,
        "estimated_time": "2-3 hours",
        "difficulty_level": "intermediate",
        "category_count": 2,
        "partslots": [
          {
            "id": 101,
            "name": "Front Brake Pads",
            "description": "FRONT BRAKE PAD KIT",
            "products": {
              "quality_tiers": {
                "Economy": [
                  {
                    "sku": "BP-ECO-001",
                    "name": "Economy Brake Pads",
                    "brand": "CARFIX",
                    "price": 59.99,
                    "part_number": "CF-BP-ECO",
                    "is_on_sale": false
                  }
                ],
                "Standard": [
                  {
                    "sku": "BP-STD-002",
                    "name": "Standard Brake Pads",
                    "brand": "REPCO",
                    "price": 89.99,
                    "part_number": "RBC-1234",
                    "is_on_sale": false
                  }
                ],
                "Premium": [
                  {
                    "sku": "BP-PRE-003",
                    "name": "Premium Ceramic Pads",
                    "brand": "BOSCH",
                    "price": 149.99,
                    "part_number": "0986AB5678",
                    "is_on_sale": true,
                    "sale_price": 129.99,
                    "was_price": 149.99,
                    "discount_percentage": 13
                  }
                ],
                "Performance": []
              }
            }
          },
          {
            "id": 102,
            "name": "Front Brake Rotors",
            "description": "FRONT BRAKE ROTOR",
            "products": {
              "quality_tiers": {
                "Economy": [
                  {
                    "sku": "BR-ECO-001",
                    "name": "Economy Rotors Pair",
                    "brand": "CARFIX",
                    "price": 119.99,
                    "part_number": "CF-BR-ECO"
                  }
                ],
                "Standard": [
                  {
                    "sku": "BR-STD-002",
                    "name": "Standard Rotors Pair",
                    "brand": "DBA",
                    "price": 189.99,
                    "part_number": "DBA-2345"
                  }
                ],
                "Premium": [],
                "Performance": []
              }
            }
          }
        ],
        "valueTiers": [
          {
            "tier": "Economy",
            "totalPrice": 179.98,
            "isCarfixValue": true,
            "isBestPrice": true,
            "isPremiumChoice": false,
            "valueScore": 85
          },
          {
            "tier": "Standard", 
            "totalPrice": 279.98,
            "isCarfixValue": false,
            "isBestPrice": false,
            "isPremiumChoice": false,
            "valueScore": 72
          }
        ],
        "priceRange": {
          "min": 179.98,
          "max": 339.98
        }
      }
    ],
    "meta": {
      "vehicleId": 12345,
      "packageCount": 1,
      "processedAt": "2025-01-10T12:00:00Z",
      "version": "2.0",
      "processingTimeMs": 145
    }
  }
}
```

**Price Fields Bob Can Use:**

| Field | Where | Usage |
|-------|-------|-------|
| `from_price` | Package level | "Service starts from $249.99" |
| `price` | Part level | "BOSCH pads are $149.99" |
| `sale_price` | Part level (when `is_on_sale: true`) | "On sale for $129.99" |
| `was_price` | Part level (when `is_on_sale: true`) | "Was $149.99" |
| `totalPrice` | valueTiers | "Economy tier total $179.98" |
| `priceRange.min/max` | Package level | "Prices from $179 to $340" |

**Fields Bob MUST NEVER Fabricate:**
- Any dollar amount not in these fields
- Savings calculations (unless `bundle_discount_percentage > 0`)
- Comparisons to "online" or "other shop" prices

---

### A.3 - lookup_vehicle Response

```json
{
  "success": true,
  "vehicle": {
    "id": 12345,
    "rego": "ABC123",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2015,
    "variant": "GX",
    "vehicle_name_nz": "Toyota Corolla GX 1.8L",
    "engine_size": "1.8L",
    "fuel_type": "petrol",
    "cc_rating": 1800,
    "vin": "JTDBU4EE7E9123456",
    "engine_no": "2ZR-FE"
  }
}
```

**Note:** No pricing data in vehicle response - this is for identification only.

---

### A.4 - search_general_products Response

```json
{
  "success": true,
  "products": [
    {
      "name": "Tire Shine Spray 500ml",
      "sku": "TS-001",
      "price": 12.99,
      "in_stock": true
    },
    {
      "name": "Windscreen Wash 2L Concentrate",
      "sku": "WW-002", 
      "price": 8.99,
      "in_stock": true
    }
  ],
  "total_found": 2
}
```

**Price Field:** `price`

---

### A.5 - add_to_cart Request/Response

**Request (what Bob sends):**
```json
{
  "action": "add_to_cart",
  "user_email": "customer@example.com",
  "items": [
    {
      "product_id": "BP-STD-002",
      "product_name": "Standard Brake Pads",
      "quantity": 1,
      "unit_price": 89.99,
      "vehicle_id": "12345"
    }
  ]
}
```

**Critical:** `unit_price` MUST match the `price` field from retrieve_parts/service_packages response.

---

### Pricing Quick Reference Table

| API Call | Price Field | Example Value | Bob Says |
|----------|-------------|---------------|----------|
| retrieve_parts | `Metro Retail Price` | 89.99 | "$89.99" |
| service_packages (package) | `from_price` | 249.99 | "starts from $249.99" |
| service_packages (part) | `price` | 149.99 | "$149.99" |
| service_packages (sale) | `sale_price` | 129.99 | "on sale for $129.99" |
| service_packages (tier) | `totalPrice` | 179.98 | "Economy tier is $179.98" |
| general_products | `price` | 12.99 | "$12.99" |

---

### What Bob CANNOT Say (No Data Source)

| Phrase | Why Forbidden |
|--------|---------------|
| "You'll save $50 on the bundle" | `bundle_discount_percentage` is 0 |
| "Normally costs $X online" | No external price data |
| "I'll do you a deal at $X" | Bob doesn't set prices |
| "Roughly about $X" | Must quote exact API price |
| "That's around $X-ish" | Must quote exact API price |
| "Usually these go for..." | Implies knowledge outside API |
| "Cheaper than buying separately" | Unless API confirms discount |

---

## APPENDIX B: Pricing Integrity Rules for bob-chat

> **System prompt additions to enforce pricing integrity.**

Add to the bob-chat system prompt:

```
PRICING RULES (CRITICAL - NEVER VIOLATE):
1. Every price you quote MUST come from the tool result data
2. Service package prices: use `from_price` field or tier totals
3. Part prices: use `price` field from retrieve_parts (mapped from Metro Retail Price)
4. If no price or price is 0: say "POA" (Price On Application)
5. NEVER claim bundle savings unless bundle_discount_percentage > 0
6. NEVER reference online prices or other shop prices
7. NEVER estimate or round prices

VALUE SELLING APPROACH:
When suggesting service packages over individual parts:
- Focus on LABOUR convenience ("while you're in there")
- Focus on PREVENTION ("before it starts grinding")  
- Focus on COMPLETENESS ("sorts you out properly")
- Do NOT focus on price savings (we don't discount bundles currently)
- Respect customer choice if they just want the single part

EXAMPLE SALES SCRIPTS (No Fake Savings):

BRAKES:
Customer: "I need new brake pads"
Bob: "Sweet as, mate. While you've got the wheels off and brakes apart, 
it's really easy to slap on new rotors at the same time - saves doing 
the job twice, ya know? Got a brake service kit here starting from 
$[from_price from API]. Want me to show you the options?"

OIL CHANGE:
Customer: "Need an oil filter"
Bob: "No worries. While you're under there draining the sump anyway, 
makes sense to do the air filter too - takes about 30 seconds to swap out. 
Got a full service kit starting at $[from_price from API] that covers 
oil filter, air filter, and cabin filter. Worth a look?"

FILTERS:
Customer: "Just need the air filter"
Bob: "Easy done. Quick tip though - most people forget the cabin filter 
until the aircon starts smelling funky. Since you're doing the air filter 
anyway, the cabin filter's a piece of piss to change. Filter bundle 
from $[from_price from API] sorts you out. What do you reckon?"

TONE: Helpful mate at the shop, not a used car salesman.
- Explain the logic (labour/prevention)
- Give the option
- Respect their choice
- Use Kiwi expressions naturally
- If they say "just the pads" → "Sweet as, no worries"
```

---

*Document Version: 1.1*
*Last Updated: 2026-01-10*
*Author: Bob v3.0 Rebuild Team*
