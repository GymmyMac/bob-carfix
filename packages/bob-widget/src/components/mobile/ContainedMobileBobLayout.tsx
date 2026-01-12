import React, { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { ContainedChatDrawer } from "./ContainedChatDrawer";
import { ProductDetailView } from "./ProductDetailView";
import type { Message } from "../../types/message";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { Vehicle } from "../../types/vehicle";

type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';
type ViewState = 'products' | 'productDetail';

interface ContainedMobileBobLayoutProps {
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

/**
 * ContainedMobileBobLayout - Immersive layout that fits within a parent container
 * Uses position: absolute instead of fixed, so it respects parent boundaries.
 * Ideal for embedding Bob in a page with header/footer.
 */
export const ContainedMobileBobLayout: React.FC<ContainedMobileBobLayoutProps> = ({
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
  onAddToCart,
  onNavigateToProductPage,
  vehicle,
  onChangeVehicle,
  bobOffset = 0,
  bobScale = 100
}) => {
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  const [currentView, setCurrentView] = useState<ViewState>('products');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
  // Dynamic Bob scale based on state (reduced base values for direct database control):
  // - Welcome state (center, no products): 100% base
  // - Showing products (left position): 70% base
  // - Product detail view: 50% base
  const getBaseUIScale = () => {
    if (currentView === 'productDetail') return 70;  // 40% larger
    if (bobPosition === 'center' && !hasProducts) return 140; // Welcome state - 40% larger
    return 98; // Showing products - 40% larger
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

  // Handle product click - navigate to product page or show detail view
  const handleProductClick = (product: Product) => {
    // If navigation callback is provided, use it to navigate to real product page
    if (onNavigateToProductPage) {
      onNavigateToProductPage(product);
      // Also call parent callback if provided
      onProductClick?.(product);
      return;
    }
    
    // Fallback: show internal detail view
    setSelectedProduct(product);
    setCurrentView('productDetail');
    onProductClick?.(product);
  };

  // Handle back to products
  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setCurrentView('products');
  };

  const showProductColumn = panelState !== 'hidden' && currentView === 'products';
  
  // Background blurs when products are showing
  const shouldBlurBackground = panelState !== 'hidden';

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      style={{
        touchAction: 'manipulation'
      }}
    >
      {/* Background - NO overlay on Bob, only on backdrop */}
      {backdropUrl && (
        <div 
          className="absolute inset-0 z-0 transition-all duration-500 ease-out"
          style={{
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            filter: shouldBlurBackground 
              ? 'blur(8px) brightness(0.9)' 
              : 'blur(0px) brightness(1)',
            transform: 'scale(1.05)'
          }}
        />
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

      {/* Vehicle Context Bar */}
      {vehicle && currentView === 'products' && (
        <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', zIndex: 20 }}>
          <div 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              borderRadius: '8px',
              padding: '8px 12px',
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

      {/* Product Column - shown in products view */}
      <MobileProductColumn
        products={products}
        servicePackages={servicePackages}
        highlightedPartType={highlightedPartType}
        highlightedProduct={highlightedProduct}
        onProductClick={handleProductClick}
        onPackageSelect={onPackageSelect}
        isResearching={isResearching}
        visible={showProductColumn}
        counterHeightPercent={counterHeightPercent}
        hasVehicle={!!vehicle}
      />

      {/* Product Detail View - shown when customer clicks a product */}
      {currentView === 'productDetail' && selectedProduct && (
        <ProductDetailView
          product={selectedProduct}
          onBack={handleBackToProducts}
          onAddToCart={onAddToCart}
          onNavigateToProductPage={onNavigateToProductPage}
        />
      )}

      {/* Chat Drawer - Contained mode, hidden when viewing product detail */}
      {currentView === 'products' && (
        <ContainedChatDrawer
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
      )}
    </div>
  );
};
