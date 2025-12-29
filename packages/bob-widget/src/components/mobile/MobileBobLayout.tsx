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
  
  // Vehicle
  vehicle?: Vehicle | null;
  onChangeVehicle?: () => void;
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
  onChangeVehicle
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
        scale={200}
        position={bobPosition}
      />

      {/* Vehicle Context Bar */}
      {vehicle && !isEmbedded && (
        <div className="absolute top-2 left-2 right-2 z-20">
          <div 
            className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 shadow-lg flex items-center justify-between"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 4px) + 8px)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.rego && (
                <p className="text-[10px] text-gray-500">{vehicle.rego}</p>
              )}
            </div>
            {onChangeVehicle && (
              <button
                onClick={onChangeVehicle}
                className="text-xs text-blue-600 hover:underline ml-2 shrink-0"
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
