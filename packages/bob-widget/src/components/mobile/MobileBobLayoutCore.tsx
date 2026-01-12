import React, { useState, useEffect, useCallback } from "react";
import { MobileBobCharacter, type BobPosition } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { useViewportSize } from "../../hooks/useViewportSize";
import { usePositionFactors } from "../../hooks/usePositionFactors";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { Vehicle } from "../../types/vehicle";

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
  
  // External position control (from SwipeableBob)
  externalBobPosition?: BobPosition;
  onBobPositionChange?: (position: BobPosition) => void;
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
  externalBobPosition,
  onBobPositionChange
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
  
  // Responsive Bob scale
  // Base scale reduced so database scale of 100% = reasonable size
  const getBaseUIScale = () => {
    switch (viewportSize) {
      case 'desktop': return 80 * factors.uiScale;
      case 'tablet': return 90 * factors.uiScale;
      case 'mobile': return 100;
      default: return 100;
    }
  };
  const baseUIScale = getBaseUIScale();
  const finalBobScale = (baseUIScale * bobScale) / 100;
  
  // Automatic position transitions based on state
  useEffect(() => {
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      setPanelState('loading');
      
      // Move to partial-left when researching starts
      if (bobPosition === 'center') {
        setBobPosition('partial-left');
      }
    } else if (hasProducts && panelState !== 'visible') {
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
    } else if (!hasProducts && !isResearching && panelState !== 'hidden') {
      setPanelState('hidden');
      setBobPosition('center');
    }
  }, [hasProducts, isResearching, panelState, bobPosition, setBobPosition]);

  const showProductColumn = panelState !== 'hidden';
  
  // Calculate blur intensity based on product visibility
  const shouldBlur = showProductColumn && hasProducts;

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'manipulation'
      }}
    >
      {/* Background with conditional blur when products shown */}
      {backdropUrl && (
        <>
          <img 
            src={backdropUrl}
            alt="Shop backdrop"
            className="absolute inset-0 z-0 w-full h-full object-cover object-center transition-all duration-500"
            style={{ 
              pointerEvents: 'none',
              filter: shouldBlur ? 'blur(8px)' : 'none',
              transform: shouldBlur ? 'scale(1.02)' : 'scale(1)', // Prevent blur edge artifacts
            }}
          />
          {/* Dark overlay when products shown for better contrast */}
          <div 
            className="absolute inset-0 z-[1] transition-opacity duration-500 pointer-events-none"
            style={{ 
              background: 'rgba(0, 0, 0, 0.15)',
              opacity: shouldBlur ? 1 : 0,
            }}
          />
        </>
      )}

      {/* Bob Character with 3-position system */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={finalBobScale}
        position={bobPosition}
        verticalOffset={bobOffset}
      />

      {/* Vehicle Context Bar */}
      {vehicle && !isEmbedded && (
        <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', zIndex: 20 }}>
          <div 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              borderRadius: '8px',
              padding: '8px 12px',
              paddingTop: 'calc(env(safe-area-inset-top, 4px) + 8px)',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.rego && (
                <p style={{ fontSize: '10px', color: '#6b7280' }}>{vehicle.rego}</p>
              )}
            </div>
            {onChangeVehicle && (
              <button
                onClick={onChangeVehicle}
                style={{
                  fontSize: '12px',
                  color: '#2563eb',
                  marginLeft: '8px',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 'unset',
                  minWidth: 'unset'
                }}
              >
                Change
              </button>
            )}
          </div>
        </div>
      )}

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
      />
    </div>
  );
};
