import React, { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { MobileChatDrawer } from "./MobileChatDrawer";
import type { Message } from "../../types/message";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { Vehicle } from "../../types/vehicle";

type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';

interface MobileBobLayoutProps {
  // Bob animation
  currentImage: string;
  animationState: string;
  backdropUrl?: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  
  // Chat
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeaking?: boolean;
  
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

export const MobileBobLayout: React.FC<MobileBobLayoutProps> = ({
  currentImage,
  animationState,
  backdropUrl,
  counterOverlayUrl,
  counterHeightPercent = 22,
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  onKeyPress,
  onInputFocus,
  onInputBlur,
  chatEndRef,
  isMuted,
  onToggleMute,
  isSpeaking,
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
  
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
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
      className="fixed inset-0 overflow-hidden"
      style={{
        height: '100dvh',
        touchAction: 'manipulation'
      }}
    >
      {/* Blurred Background */}
      {backdropUrl && (
        <>
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${backdropUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              filter: 'blur(12px) brightness(0.7)',
              transform: 'scale(1.1)'
            }}
          />
          
          <div 
            className="absolute inset-0 z-[1]"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.6) 100%)'
            }}
          />
        </>
      )}

      {/* Bob Character */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={(200 * bobScale) / 100}
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

      {/* Chat Drawer */}
      <MobileChatDrawer
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={onSend}
        onKeyPress={onKeyPress}
        onInputFocus={onInputFocus}
        onInputBlur={onInputBlur}
        chatEndRef={chatEndRef}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        isSpeaking={isSpeaking}
      />
    </div>
  );
};
