import React, { useState, useEffect, useCallback } from "react";
import { MobileBobCharacter, type BobPosition } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { useViewportSize } from "../../hooks/useViewportSize";
import { usePositionFactors } from "../../hooks/usePositionFactors";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { Vehicle } from "../../types/vehicle";

// Variant card type for vehicle selection UI
export interface VariantCard {
  vehicle_id: number;
  optionNumber: number;
  displayTitle: string;
  displaySubtitle: string;
  characterization: string;
  kw?: number | null;
  cc?: number | null;
  ccDisplay?: string | null;
  fuelType?: string | null;
  engineCode?: string | null;
  make: string;
  model: string;
}

type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';

interface MobileBobLayoutCoreProps {
  // Bob animation
  currentImage: string;
  animationState: string;
  backdropUrl?: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  
  // Products & Packages
  products: Product[];
  servicePackages: ServicePackage[];
  highlightedPartType?: string | null;
  highlightedProduct?: HighlightedProduct | null;
  onProductClick?: (product: Product) => void;
  onPackageSelect?: (pkg: ServicePackage) => void;
  isResearching?: boolean;
  onAddToCart?: (product: Product) => void;
  onNavigateToProductPage?: (product: Product) => void;
  
  // Vehicle
  vehicle?: Vehicle | null;
  onChangeVehicle?: () => void;
  
  // Bob positioning from database
  bobOffset?: number;
  bobScale?: number;
  
  // Theatrical entrance - Bob fades in after shop loads
  bobHasArrived?: boolean;
  
  // External position control (from SwipeableBob)
  externalBobPosition?: BobPosition;
  onBobPositionChange?: (position: BobPosition) => void;
  
  // NEW: Variant selection props
  pendingVariants?: VariantCard[];
  pendingVariantMake?: string;
  pendingVariantModel?: string;
  onVariantSelect?: (variant: VariantCard) => void;
}

/**
 * MobileBobLayoutCore - Bob character, backdrop, and products with 3-position system.
 * 
 * Bob Positions:
 * - center: Welcome/idle state, no products
 * - partial-left: Products visible, Bob partially off-screen
 * - hidden: User swiped, full product view
 */
export const MobileBobLayoutCore: React.FC<MobileBobLayoutCoreProps> = ({
  currentImage,
  animationState,
  backdropUrl,
  counterOverlayUrl,
  counterHeightPercent = 22,
  products,
  servicePackages,
  highlightedPartType,
  highlightedProduct,
  onProductClick,
  onPackageSelect,
  isResearching,
  vehicle,
  onChangeVehicle,
  bobOffset = 0,
  bobScale = 100,
  bobHasArrived = true,
  externalBobPosition,
  onBobPositionChange,
  // NEW: Variant selection props
  pendingVariants,
  pendingVariantMake,
  pendingVariantModel,
  onVariantSelect
}) => {
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  const viewportSize = useViewportSize();
  const factors = usePositionFactors();
  
  // 3-position state: center, partial-left, hidden
  const [internalBobPosition, setInternalBobPosition] = useState<BobPosition>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  // Use external position if provided, otherwise internal
  const bobPosition = externalBobPosition ?? internalBobPosition;
  const setBobPosition = useCallback((pos: BobPosition) => {
    setInternalBobPosition(pos);
    onBobPositionChange?.(pos);
  }, [onBobPositionChange]);
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  const hasVariants = (pendingVariants?.length ?? 0) > 0;
  const hasContent = hasProducts || hasVariants;
  
  // Responsive Bob scale
  // Base scale reduced so database scale of 100% = reasonable size
  const getBaseUIScale = () => {
    switch (viewportSize) {
      case 'desktop': return 80 * factors.uiScale;
      case 'tablet': return 90 * factors.uiScale;
      case 'mobile': return 140;  // 40% larger for mobile
      default: return 140;
    }
  };
  const baseUIScale = getBaseUIScale();
  const finalBobScale = (baseUIScale * bobScale) / 100;
  
  // Automatic position transitions based on state
  // Now also triggers when variant cards need to be shown
  useEffect(() => {
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      // If we have variant cards showing, keep panel visible — don't drop to 'loading'
      if (hasVariants) {
        // Already showing variants — stay visible, keep Bob partial-left
        if (bobPosition === 'center') setBobPosition('partial-left');
        return;
      }
      setPanelState('loading');
      
      // Move to partial-left when researching starts
      if (bobPosition === 'center') {
        setBobPosition('partial-left');
      }
    } else if (hasContent && panelState !== 'visible') {
      if (bobPosition === 'center') {
        setBobPosition('partial-left');
        setPanelState('transitioning');
        
        const timer = setTimeout(() => {
          setPanelState('visible');
        }, 400);
        
        return () => clearTimeout(timer);
      } else {
        setPanelState('visible');
      }
    } else if (!hasContent && !isResearching && panelState !== 'hidden') {
      // Only hide if there are no variants pending either
      if (!hasVariants) {
        setPanelState('hidden');
        setBobPosition('center');
      }
    }
  }, [hasContent, hasVariants, isResearching, panelState, bobPosition, setBobPosition]);

  const showProductColumn = panelState !== 'hidden' || hasVariants;
  
  // Calculate blur intensity based on product visibility
  const shouldBlur = showProductColumn && hasContent;

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'manipulation',
        // CRITICAL: Create single stacking context for deterministic z-index
        isolation: 'isolate',
      }}
    >
      {/* Background - v3.1.10: Config-driven blur via CSS variable */}
      {backdropUrl && (
        <>
          <img 
            src={backdropUrl}
            alt="Shop backdrop"
            className="absolute inset-0 z-0 w-full h-full object-cover object-center transition-all duration-500"
            style={{ 
              pointerEvents: 'none',
              filter: shouldBlur ? 'blur(var(--bob-blur-intensity, 0px))' : 'none',
              transform: shouldBlur ? 'scale(1.02)' : 'scale(1)',
              WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
            } as React.CSSProperties}
            draggable={false}
          />
          {/* Overlay when products shown - uses CSS variable for opacity */}
          <div 
            className="absolute inset-0 z-[1] transition-opacity duration-500 pointer-events-none"
            style={{ 
              background: `rgba(0, 0, 0, var(--bob-overlay-opacity, 0.1))`,
              opacity: shouldBlur ? 1 : 0,
            }}
          />
        </>
      )}

      {/* Bob Character with 3-position system and theatrical entrance */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={finalBobScale}
        position={bobPosition}
        verticalOffset={bobOffset}
        hasArrived={bobHasArrived}
      />

      {/* Vehicle Context Bar REMOVED - vehicle info now shown in shelf header only */}

      {/* Product Column - 80% width with responsive scaling */}
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
        pendingVariants={pendingVariants}
        pendingVariantMake={pendingVariantMake}
        pendingVariantModel={pendingVariantModel}
        onVariantSelect={onVariantSelect}
      />
    </div>
  );
};
