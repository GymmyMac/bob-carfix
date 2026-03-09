import React, { useState, useEffect, useRef } from "react";
import { useRef as useReactRef, useCallback } from "react";
import { useBobContext } from "../BobProvider";
import { useBobChat } from "../hooks/useBobChat";
import { useBobAnimation } from "../hooks/useBobAnimation";
import { useBobBackdrop } from "../hooks/useBobBackdrop";
import { BobCharacter } from "./BobCharacter";
import { ChatInterface } from "./ChatInterface";
import { MobileBobLayout } from "./mobile/MobileBobLayout";
import { ContainedMobileBobLayout } from "./mobile/ContainedMobileBobLayout";
import type { VariantCard } from "./mobile/MobileProductColumn";
import type { Product, ServicePackage } from "../types";
import type { HighlightedProduct } from "../types/message";
export type BobVariant = "inline" | "floating" | "fullscreen" | "mobile";

interface BobProps {
  variant?: BobVariant;
  initialState?: string;
  showChat?: boolean;
  className?: string;
  backdropUrl?: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  defaultBobImage?: string;
  verticalOffset?: number;
  scale?: number;
  /** Session token for pre-authenticated sessions (vehicle/user context) */
  sessionToken?: string;
  /** 
   * Use container-relative positioning instead of fixed viewport.
   * Set to true when Bob is embedded in a host site with headers/footers.
   * Only applies to mobile/fullscreen variants.
   * @default false
   */
  embedded?: boolean;
}

export const Bob: React.FC<BobProps> = ({
  variant = "inline",
  initialState = "idle",
  showChat = true,
  className = "",
  backdropUrl: propBackdropUrl,
  counterOverlayUrl: propCounterUrl,
  counterHeightPercent: propCounterHeight,
  defaultBobImage,
  verticalOffset = 0,
  scale = 100,
  sessionToken,
  embedded = false
}) => {
  const { callbacks } = useBobContext();
  
  // Track speaking state for animation sync (will be set after bobChat is initialized)
  const [isSpeakingForAnimation, setIsSpeakingForAnimation] = useState(false);
  
  // Use the full animation system - pass isSpeaking to sync mouth animation with speech
  const {
    animationState,
    setAnimationState,
    getCurrentImage,
    getCurrentOffset,
    getCurrentScale,
    availableStates
  } = useBobAnimation({ isSpeaking: isSpeakingForAnimation });

  // Load backdrop from database
  const { activeBackdrop } = useBobBackdrop();

  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [highlightedPartType, setHighlightedPartType] = useState<string | null>(null);
  const [highlightedProduct, setHighlightedProduct] = useState<HighlightedProduct | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [scrollToCategory, setScrollToCategory] = useState<string | null>(null);

  // v3.2.9: Maintain a ref of current shelf category names for post-stream scroll matching
  const shelfCategoriesRef = useRef<Set<string>>(new Set());

  // Keep shelfCategoriesRef in sync with products
  useEffect(() => {
    const categories = new Set(products.map(p => p.partslotDescription || 'Other Parts').filter(Boolean));
    shelfCategoriesRef.current = categories;
  }, [products]);

  // Also include service package titles as scrollable categories
  useEffect(() => {
    if (servicePackages.length > 0) {
      const current = new Set(shelfCategoriesRef.current);
      servicePackages.forEach(pkg => {
        if (pkg.title) current.add(pkg.title);
      });
      shelfCategoriesRef.current = current;
    }
  }, [servicePackages]);

  // Vehicle variant selection (when multiple matches returned)
  const [pendingVariants, setPendingVariants] = useState<VariantCard[]>([]);
  const [pendingVariantMake, setPendingVariantMake] = useState<string>("");
  const [pendingVariantModel, setPendingVariantModel] = useState<string>("");

  // ============= STABILIZED CALLBACK REFS (Regression Prevention) =============
  // These refs ensure callback handlers maintain stable references across re-renders,
  // preventing state loss when products/packages are received via SSE events.
  // See: .lovable/plan.md - "Layer 4: Architectural Fixes - Fix 1"
  const handlePartsFoundRef = useRef<((parts: unknown[]) => void) | null>(null);
  const handlePackagesFoundRef = useRef<((packages: unknown[]) => void) | null>(null);

  // Initialize stable handlers once (empty deps)
  useEffect(() => {
    handlePartsFoundRef.current = (parts: unknown[]) => {
      setIsResearching(false);
      
      // If empty array, clear products
      if (!parts || parts.length === 0) {
        console.log('[Bob] Clearing products (empty array received)');
        setProducts([]);
        return;
      }
      
      // v3.2.1: Debug logging - show actual field names from API
      const firstPart = (parts as any[])[0];
      console.log('[Bob] First part raw keys:', Object.keys(firstPart));
      
      const mappedProducts: Product[] = (parts as any[]).map((p, idx) => {
        const brand = p.Brand || p.brand || '';
        return {
          id: p.SKU || p.sku || `part-${idx}`,
          name: p["Part Product Type"] || p.partslot_description || p.name || 'Unknown Part',
          brand,
          price: p["Metro Retail Price"] || p.price || 0,
          sku: p.SKU || p.sku,
          partNumber: p["Part Number"] || p.part_number || null,
          partslotDescription: 
            p["Part Product Type"] || 
            p.partslot_description || 
            p.partslotDescription ||
            p.part_type ||
            p.category ||
            'General Parts',
          image_url: p.image_url || ((p.SKU || p.sku) ? `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${(p.SKU || p.sku)}.jpg` : undefined),
          webDescription: p["Web Part Description"] || p.web_description || null,
          brandDescription: p["Brand Description"] || p.brand_description || null,
          perCarQty: p["Per Car Qty"] || p.per_car_qty || 1,
          volume: p.volume || null,
          viscosity: p.viscosity || null,
          brandImageUrl: brand ? `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images/${brand.replace(/\s+/g, '')}.jpg` : undefined,
        };
      });

      // v3.2.7: Merge new products with existing shelf instead of replacing
      setProducts(prev => {
        // Build set of existing SKUs
        const existingSkus = new Set(prev.map(p => p.sku).filter(Boolean));
        // Build set of existing categories for scroll detection
        const existingCategories = new Set(prev.map(p => p.partslotDescription || 'Other Parts'));
        
        // Deduplicate new products internally AND against existing shelf
        const seen = new Set<string>();
        const newUniqueProducts = mappedProducts.filter(p => {
          if (!p.sku || seen.has(p.sku) || existingSkus.has(p.sku)) return false;
          seen.add(p.sku);
          return true;
        });
        
        console.log('[Bob] Products mapped:', mappedProducts.length, '-> new unique:', newUniqueProducts.length, '-> existing:', prev.length);
        
        // Find first new category to scroll to
        if (newUniqueProducts.length > 0 && prev.length > 0) {
          const firstNewCategory = newUniqueProducts.find(
            p => !existingCategories.has(p.partslotDescription || 'Other Parts')
          )?.partslotDescription;
          if (firstNewCategory) {
            // Use setTimeout to ensure state update completes before scroll triggers
            setTimeout(() => setScrollToCategory(firstNewCategory), 100);
          }
        }
        
        return [...prev, ...newUniqueProducts];
      });
    };
    
    handlePackagesFoundRef.current = (packages: unknown[]) => {
      // If empty array, clear packages
      if (!packages || packages.length === 0) {
        console.log('[Bob] Clearing service packages (empty array received)');
        setServicePackages([]);
        return;
      }
      
      console.log('[Bob] Service packages received via stable ref:', (packages as any[]).length);
      setServicePackages(packages as ServicePackage[]);
    };
  }, []); // Empty deps - only run once on mount

  // Chat hook with full integration
  const bobChat = useBobChat({
    setAnimationState,
    manualMode: false,
    onReadyToSpeak: () => {
      console.log('[BobWidget] Ready to speak');
    },
    onStreamComplete: () => {
      setAnimationState(availableStates.find(s => s.includes('idle')) || 'idle');
    },
    onResearchStart: () => {
      setIsResearching(true);
      // NOTE: Do NOT clear pendingVariants here - variant cards must stay visible
      // while Bob processes the selection. They are cleared only when identifiedVehicle is set.
    },
    onVariantSelectionRequired: (variants, make, model) => {
      // Stop the loading state so the shelf can show the selection cards
      setIsResearching(false);
      setPendingVariants(variants);
      setPendingVariantMake(make);
      setPendingVariantModel(model);
    },
    onHighlightPart: (partType) => {
      setHighlightedPartType(partType);
      setTimeout(() => setHighlightedPartType(null), 8000);
    },
    onHighlightProduct: (product) => {
      setHighlightedProduct(product);
      setTimeout(() => setHighlightedProduct(null), 8000);
    },
    onAutoFetchComplete: () => {
      setIsResearching(false);
    }
  });

  // Clear pending variant selection when vehicle is confirmed (tap OR voice)
  useEffect(() => {
    if (!bobChat.identifiedVehicle) return;
    setPendingVariants([]);
    setPendingVariantMake("");
    setPendingVariantModel("");
  }, [bobChat.identifiedVehicle?.vehicle_id, bobChat.identifiedVehicle?.id]);

  const handleVariantSelect = (variantOption: VariantCard) => {
    // Keep variant cards visible until vehicle_identified SSE fires (cleared in useEffect above).
    // Use sendDirectMessage which bypasses isLoading and stops speech immediately.
    bobChat.sendDirectMessage(`Option ${variantOption.optionNumber}`);
  };

  // Sync isSpeaking from bobChat to animation hook
  useEffect(() => {
    setIsSpeakingForAnimation(bobChat.isSpeaking);
  }, [bobChat.isSpeaking]);

  // Wire up callbacks to update local state using STABLE refs
  // This prevents callback recreation on every render which was causing state loss
  useEffect(() => {
    const originalOnPartsFound = callbacks.onPartsFound;
    const originalOnPackagesFound = callbacks.onServicePackagesFound;

    callbacks.onPartsFound = (parts: unknown[]) => {
      handlePartsFoundRef.current?.(parts);
      originalOnPartsFound?.(parts);
    };

    callbacks.onServicePackagesFound = (packages: unknown[]) => {
      handlePackagesFoundRef.current?.(packages);
      originalOnPackagesFound?.(packages);
    };

    return () => {
      callbacks.onPartsFound = originalOnPartsFound;
      callbacks.onServicePackagesFound = originalOnPackagesFound;
    };
  }, [callbacks]);

  // Resolve backdrop URLs
  const backdropUrl = propBackdropUrl || activeBackdrop?.image_url;
  const counterOverlayUrl = propCounterUrl || activeBackdrop?.counter_overlay_url || undefined;
  const counterHeightPercent = propCounterHeight || activeBackdrop?.counter_height_percent || 12;

  const currentImage = getCurrentImage() || defaultBobImage || "";
  
  // Get database-driven offset and scale values
  const dbOffset = getCurrentOffset();
  const dbScale = getCurrentScale();

  // Mobile/fullscreen variant - full viewport takeover
  if (variant === "mobile" || variant === "fullscreen") {
    return (
      <MobileBobLayout
        currentImage={currentImage}
        animationState={animationState}
        backdropUrl={backdropUrl}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
        bobOffset={dbOffset}
        bobScale={dbScale}
        embedded={embedded}
        messages={bobChat.messages}
        input={bobChat.input}
        setInput={bobChat.setInput}
        isLoading={bobChat.isLoading}
        onSend={bobChat.handleSend}
        onKeyPress={bobChat.handleKeyPress}
        onInputFocus={bobChat.handleInputFocus}
        onInputBlur={bobChat.handleInputBlur}
        chatEndRef={bobChat.chatEndRef}
        isMuted={bobChat.isMuted}
        onToggleMute={bobChat.toggleMute}
        isSpeaking={bobChat.isSpeaking}
        products={products}
        servicePackages={servicePackages}
        highlightedPartType={highlightedPartType}
        highlightedProduct={highlightedProduct}
        scrollToCategory={scrollToCategory}
        onScrollToCategoryComplete={() => setScrollToCategory(null)}
        onAddToCart={(productOrProducts) => {
          const items = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];
          items.forEach(product => {
            callbacks.onAddToCart?.({
              product_id: product.id,
              product_name: product.name,
              quantity: product.quantity || 1,
              unit_price: product.price,
              sku: product.sku,
              brand: product.brand,
              image_url: product.image_url,
            });
          });
        }}
        onNavigateToProductPage={(product) => callbacks.onNavigateToProductPage?.(product)}
        onQuickReply={(url) => callbacks.onNavigateToProductPage?.({ url } as any)}
        onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
        isResearching={isResearching}
        vehicle={bobChat.identifiedVehicle}
        pendingVariants={pendingVariants}
        pendingVariantMake={pendingVariantMake}
        pendingVariantModel={pendingVariantModel}
        onVariantSelect={handleVariantSelect}
        onInterrupt={bobChat.stopAllAudio}
      />
    );
  }

  // Inline variant with chat - immersive contained experience
  if (variant === "inline" && showChat) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <ContainedMobileBobLayout
          currentImage={currentImage}
          animationState={animationState}
          backdropUrl={backdropUrl}
          counterOverlayUrl={counterOverlayUrl}
          counterHeightPercent={counterHeightPercent}
          bobOffset={dbOffset}
          bobScale={dbScale}
          messages={bobChat.messages}
          input={bobChat.input}
          setInput={bobChat.setInput}
          isLoading={bobChat.isLoading}
          onSend={bobChat.handleSend}
          onKeyPress={bobChat.handleKeyPress}
          onInputFocus={bobChat.handleInputFocus}
          onInputBlur={bobChat.handleInputBlur}
          chatEndRef={bobChat.chatEndRef}
          isMuted={bobChat.isMuted}
          onToggleMute={bobChat.toggleMute}
          isSpeaking={bobChat.isSpeaking}
          products={products}
          servicePackages={servicePackages}
          highlightedPartType={highlightedPartType}
          highlightedProduct={highlightedProduct}
          scrollToCategory={scrollToCategory}
          onScrollToCategoryComplete={() => setScrollToCategory(null)}
          onAddToCart={(productOrProducts) => {
            const items = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];
            items.forEach(product => {
              callbacks.onAddToCart?.({
                product_id: product.id,
                product_name: product.name,
                quantity: product.quantity || 1,
                unit_price: product.price,
                sku: product.sku,
                brand: product.brand,
                image_url: product.image_url,
              });
            });
          }}
          onNavigateToProductPage={(product) => callbacks.onNavigateToProductPage?.(product)}
          onQuickReply={(url) => callbacks.onNavigateToProductPage?.({ url } as any)}
          onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
          isResearching={isResearching}
          vehicle={bobChat.identifiedVehicle}
          pendingVariants={pendingVariants}
          pendingVariantMake={pendingVariantMake}
          pendingVariantModel={pendingVariantModel}
          onVariantSelect={handleVariantSelect}
          onInterrupt={bobChat.stopAllAudio}
        />
      </div>
    );
  }

  // Desktop/floating variants - legacy layout
  const variantClasses = {
    inline: "",
    floating: "fixed bottom-4 right-4 w-96 z-50 shadow-2xl rounded-lg overflow-hidden"
  };

  return (
    <div className={`${variantClasses[variant as keyof typeof variantClasses] || ''} ${className}`}>
      {currentImage && (
        <BobCharacter
          currentImage={currentImage}
          animationState={animationState}
          backdropUrl={backdropUrl}
          counterOverlayUrl={counterOverlayUrl}
          counterHeightPercent={counterHeightPercent}
          verticalOffset={dbOffset}
          scale={dbScale}
        />
      )}
      
      {showChat && (
        <ChatInterface
          messages={bobChat.messages}
          input={bobChat.input}
          setInput={bobChat.setInput}
          isLoading={bobChat.isLoading}
          onSend={bobChat.handleSend}
          onKeyPress={bobChat.handleKeyPress}
          onInputFocus={bobChat.handleInputFocus}
          onInputBlur={bobChat.handleInputBlur}
          chatEndRef={bobChat.chatEndRef}
          isMuted={bobChat.isMuted}
          onToggleMute={bobChat.toggleMute}
          isSpeaking={bobChat.isSpeaking}
        />
      )}
    </div>
  );
};
