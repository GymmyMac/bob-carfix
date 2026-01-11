import React, { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { useViewportSize } from "../../hooks/useViewportSize";
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
}

/**
 * MobileBobLayoutCore - Bob character, backdrop, and products WITHOUT the chat drawer.
 * The chat drawer is rendered separately outside SwipeableBob to avoid CSS transform
 * stacking context issues with position: fixed.
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
  bobScale = 100
}) => {
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  const viewportSize = useViewportSize();
  
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
  const getBaseUIScale = () => {
    switch (viewportSize) {
      case 'desktop': return 130;  // Increased from 100 - Bob needs to be larger on desktop
      case 'tablet': return 150;   // Slight increase
      case 'mobile': return 200;
      default: return 200;
    }
  };
  const baseUIScale = getBaseUIScale();
  const finalBobScale = (baseUIScale * bobScale) / 100;
  
  useEffect(() => {
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      setPanelState('loading');
      
      if (bobPosition === 'center') {
        setBobPosition('left');
      }
    } else if (hasProducts && panelState !== 'visible') {
      if (bobPosition === 'center') {
        setBobPosition('left');
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
  }, [hasProducts, isResearching, panelState, bobPosition]);

  const showProductColumn = panelState !== 'hidden';

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'manipulation'
      }}
    >
      {/* Background - Clean backdrop, no scaling/tiling */}
      {backdropUrl && (
        <img 
          src={backdropUrl}
          alt="Shop backdrop"
          className="absolute inset-0 z-0 w-full h-full object-cover object-center"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Bob Character */}
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

      {/* Product Column */}
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
