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
  onChangeVehicle
}) => {
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  const [currentView, setCurrentView] = useState<ViewState>('products');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
  // Dynamic Bob scale: 50% smaller when viewing product detail
  const bobScale = currentView === 'productDetail' ? 65 : 130;
  
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
      {/* Blurred Background */}
      {backdropUrl && (
        <>
          <div 
            className="absolute inset-0 z-0 transition-all duration-500 ease-out"
            style={{
              backgroundImage: `url(${backdropUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              filter: shouldBlurBackground 
                ? 'blur(12px) brightness(0.7)' 
                : 'blur(0px) brightness(1)',
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

      {/* Bob Character - scales down 50% when viewing product detail */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        scale={bobScale}
        position="left"
      />

      {/* Vehicle Context Bar */}
      {vehicle && currentView === 'products' && (
        <div className="absolute top-2 left-2 right-2 z-20">
          <div 
            className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 shadow-lg flex items-center justify-between"
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
