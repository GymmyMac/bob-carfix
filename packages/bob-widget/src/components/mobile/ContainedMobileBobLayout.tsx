import React, { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn, type VariantCard } from "./MobileProductColumn";
import { ContainedChatDrawer } from "./ContainedChatDrawer";
import { ProductDetailView } from "./ProductDetailView";
import { ServicePackageDetailView } from "./ServicePackageDetailView";
import type { Message } from "../../types/message";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import type { Vehicle } from "../../types/vehicle";

type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';
type ViewState = 'products' | 'productDetail' | 'packageDetail';

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

  // NEW: Variant selection cards (vehicle disambiguation)
  pendingVariants?: VariantCard[];
  pendingVariantMake?: string;
  pendingVariantModel?: string;
  onVariantSelect?: (variant: VariantCard) => void;
  
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
  pendingVariants,
  pendingVariantMake,
  pendingVariantModel,
  onVariantSelect,
  bobOffset = 0,
  bobScale = 100
}) => {
  const [bobPosition, setBobPosition] = useState<'center' | 'partial-left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  const [currentView, setCurrentView] = useState<ViewState>('products');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  const hasVariants = (pendingVariants?.length ?? 0) > 0;
  const hasContent = hasProducts || hasVariants;
  
  // Dynamic Bob scale based on state (reduced base values for direct database control):
  // - Welcome state (center, no products): 100% base
  // - Showing products (left position): 70% base
  // - Product detail view: 50% base
  const getBaseUIScale = () => {
    if (currentView === 'productDetail') return 70;  // 40% larger
    if (bobPosition === 'center' && !hasContent) return 140; // Welcome state - 40% larger
    return 98; // Showing products - 40% larger
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
    setSelectedPackage(null);
    setCurrentView('products');
  };

  // Handle package click - navigate to package detail view
  const handlePackageClick = (pkg: ServicePackage) => {
    console.log('[ContainedMobileBobLayout] Package selected:', pkg.title);
    setSelectedPackage(pkg);
    setCurrentView('packageDetail');
    onPackageSelect?.(pkg);
  };

  const showProductColumn = panelState !== 'hidden' && currentView === 'products';
  
  // Background blurs when products are showing
  const shouldBlurBackground = panelState !== 'hidden';

  return (
    <div 
      className="absolute inset-0"
      style={{
        overflow: 'clip',
        isolation: 'isolate',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background - v3.1.10: Config-driven blur via CSS variable */}
      {backdropUrl && (
        <div 
          className="absolute inset-0 z-0 transition-all duration-500 ease-out"
          style={{
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            filter: shouldBlurBackground 
              ? 'blur(var(--bob-blur-intensity, 0px)) brightness(0.95)' 
              : 'none',
            transform: shouldBlurBackground ? 'scale(1.02)' : 'scale(1)',
            WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
          } as React.CSSProperties}
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

      {/* Vehicle Context Bar REMOVED - vehicle info now shown in shelf header only */}

      {/* Product Column - shown in products view */}
      <MobileProductColumn
        products={products}
        servicePackages={servicePackages}
        highlightedPartType={highlightedPartType}
        highlightedProduct={highlightedProduct}
        onProductClick={handleProductClick}
        onPackageSelect={handlePackageClick}
        isResearching={isResearching}
        visible={showProductColumn}
        counterHeightPercent={counterHeightPercent}
        hasVehicle={!!vehicle}
        vehicleMakeModel={vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : undefined}
        pendingVariants={pendingVariants}
        pendingVariantMake={pendingVariantMake}
        pendingVariantModel={pendingVariantModel}
        onVariantSelect={onVariantSelect}
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

      {/* Service Package Detail View - shown when customer clicks a package */}
      {currentView === 'packageDetail' && selectedPackage && (
        <ServicePackageDetailView
          package={selectedPackage}
          onBack={handleBackToProducts}
          onNavigateToProductPage={(sku) => {
            // Navigate to product page using SKU
            const product = products.find(p => p.sku === sku);
            if (product && onNavigateToProductPage) {
              onNavigateToProductPage(product);
            }
          }}
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
          counterHeightPercent={counterHeightPercent}
        />
      )}
    </div>
  );
};
