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
          // v3.2.1: Robust field extraction with multiple fallbacks - NEVER undefined
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
      console.log('[Bob] Products mapped:', mappedProducts.length, 'items');
      console.log('[Bob] First partslotDescriptions:', 
        [...new Set(mappedProducts.slice(0, 10).map(p => p.partslotDescription))]);
      setProducts(mappedProducts);
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

      // Clear any previous variant selection UI when a new request starts
      setPendingVariants([]);
      setPendingVariantMake("");
      setPendingVariantModel("");
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
    // Hide the list immediately for feedback; backend will confirm vehicle soon after.
    setPendingVariants([]);

    // Send a deterministic selection message the backend matcher understands.
    bobChat.setInput(`Option ${variantOption.optionNumber}`);
    setTimeout(() => {
      bobChat.handleSend();
    }, 80);
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
        onAddToCart={(product) => callbacks.onAddToCart?.({
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          sku: product.sku,
          brand: product.brand
        })}
        onNavigateToProductPage={(product) => callbacks.onNavigateToProductPage?.(product)}
        onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
        isResearching={isResearching}
        vehicle={bobChat.identifiedVehicle}
        pendingVariants={pendingVariants}
        pendingVariantMake={pendingVariantMake}
        pendingVariantModel={pendingVariantModel}
        onVariantSelect={handleVariantSelect}
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
          onAddToCart={(product) => callbacks.onAddToCart?.({
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            sku: product.sku,
            brand: product.brand
          })}
          onNavigateToProductPage={(product) => callbacks.onNavigateToProductPage?.(product)}
          onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
          isResearching={isResearching}
          vehicle={bobChat.identifiedVehicle}
          pendingVariants={pendingVariants}
          pendingVariantMake={pendingVariantMake}
          pendingVariantModel={pendingVariantModel}
          onVariantSelect={handleVariantSelect}
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
