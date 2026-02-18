import React, { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn, type VariantCard } from "./MobileProductColumn";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { useViewportSize } from "../../hooks/useViewportSize";
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
  /** Called when a quick-reply CTA button is tapped — fires onNavigate(url), no chat message sent */
  onQuickReply?: (url: string) => void;
  /** Called when PTT is tapped while Bob is speaking — immediately stops audio */
  onInterrupt?: () => void;
  
  // Vehicle
  vehicle?: Vehicle | null;
  onChangeVehicle?: () => void;

  // NEW: Variant selection cards (vehicle disambiguation)
  pendingVariants?: VariantCard[];
  pendingVariantMake?: string;
  pendingVariantModel?: string;
  onVariantSelect?: (variant: VariantCard) => void;
  
  // Bob positioning from database
  bobOffset?: number;
  bobScale?: number;
  
  /** 
   * Use container-relative positioning instead of fixed viewport.
   * Set to true when Bob is embedded in a host site with headers/footers.
   * @default false
   */
  embedded?: boolean;
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
  onQuickReply,
  onInterrupt,
  vehicle,
  onChangeVehicle,
  pendingVariants,
  pendingVariantMake,
  pendingVariantModel,
  onVariantSelect,
  bobOffset = 0,
  bobScale = 100,
  embedded = false
}) => {
  // Debug logging
  console.log('[MobileBobLayout] Rendering with:', {
    currentImage: currentImage?.substring(0, 50) || 'EMPTY',
    backdropUrl: backdropUrl?.substring(0, 50) || 'NONE',
    counterOverlayUrl: counterOverlayUrl?.substring(0, 50) || 'NONE'
  });
  
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  const viewportSize = useViewportSize();
  
  const [bobPosition, setBobPosition] = useState<'center' | 'partial-left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  const hasVariants = (pendingVariants?.length ?? 0) > 0;
  const hasContent = hasProducts || hasVariants;
  
  // ============================================================================
  // BOB v2.2 - REDUCED BASE SCALE (database scale has direct effect)
  // ============================================================================
  // Base scale reduced so database scale of 100% = reasonable default size
  // Admin can now adjust scale meaningfully (e.g., 80% = smaller, 120% = larger)
  const getBaseUIScale = () => {
    switch (viewportSize) {
      case 'desktop': return 70;
      case 'tablet': return 80;
      case 'mobile': return 140;  // 40% larger for mobile
      default: return 140;
    }
  };
  const baseUIScale = getBaseUIScale();
  const finalBobScale = (baseUIScale * bobScale) / 100;
  
  useEffect(() => {
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      setPanelState('loading');
      
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
      setPanelState('hidden');
      setBobPosition('center');
    }
  }, [hasContent, isResearching, panelState, bobPosition]);

  const showProductColumn = panelState !== 'hidden';

  return (
    <div 
      className={embedded ? "absolute inset-0 overflow-hidden" : "fixed inset-0 overflow-hidden"}
      style={{
        height: embedded ? '100%' : '100dvh',
        touchAction: 'manipulation'
      }}
    >
      {/* Background - v3.1.10: Config-driven blur via CSS variable (default: none) */}
      {backdropUrl && (
        <>
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${backdropUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              // Use CSS variable for blur - defaults to 0 (no blur) for CARFIX
              filter: 'blur(var(--bob-blur-intensity, 0px)) brightness(0.95)',
              transform: 'scale(1.02)' // Minimal scale to prevent edge artifacts
            }}
          />
          
          {/* Light overlay - uses CSS variable for opacity */}
          <div 
            className="absolute inset-0 z-[1]"
            style={{
              background: `rgba(0, 0, 0, var(--bob-overlay-opacity, 0.1))`
            }}
          />
        </>
      )}

      {/* Bob Character - scales based on state */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={finalBobScale}
        position={bobPosition}
        verticalOffset={bobOffset}
      />

      {/* Vehicle Context Bar REMOVED - vehicle info now shown in shelf header only */}

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
        pendingVariants={pendingVariants}
        pendingVariantMake={pendingVariantMake}
        pendingVariantModel={pendingVariantModel}
        onVariantSelect={onVariantSelect}
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
        onAddToCart={onProductClick}
        onProductClick={onProductClick}
        onQuickReply={onQuickReply}
        onInterrupt={onInterrupt}
        counterHeightPercent={counterHeightPercent}
      />
    </div>
  );
};
