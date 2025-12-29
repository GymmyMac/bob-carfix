import React, { useState, useEffect } from "react";
import { useBobContext } from "../BobProvider";
import { useBobChat } from "../hooks/useBobChat";
import { useBobAnimation } from "../hooks/useBobAnimation";
import { useBobBackdrop } from "../hooks/useBobBackdrop";
import { BobCharacter } from "./BobCharacter";
import { ChatInterface } from "./ChatInterface";
import { MobileBobLayout } from "./mobile/MobileBobLayout";
import { ContainedMobileBobLayout } from "./mobile/ContainedMobileBobLayout";
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
  scale = 100
}) => {
  const { callbacks } = useBobContext();
  
  // Use the full animation system
  const {
    animationState,
    setAnimationState,
    getCurrentImage,
    availableStates,
    isLoading: animationLoading
  } = useBobAnimation();

  // Load backdrop from database
  const { activeBackdrop } = useBobBackdrop();

  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [highlightedPartType, setHighlightedPartType] = useState<string | null>(null);
  const [highlightedProduct, setHighlightedProduct] = useState<HighlightedProduct | null>(null);
  const [isResearching, setIsResearching] = useState(false);

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

  // Wire up callbacks to update local state
  useEffect(() => {
    const originalOnPartsFound = callbacks.onPartsFound;
    const originalOnPackagesFound = callbacks.onServicePackagesFound;

    callbacks.onPartsFound = (parts: unknown[]) => {
      setIsResearching(false);
      const mappedProducts: Product[] = (parts as any[]).map((p, idx) => ({
        id: p.SKU || p.sku || `part-${idx}`,
        name: p["Part Product Type"] || p.partslot_description || 'Unknown Part',
        brand: p.Brand || p.brand,
        price: p["Metro Retail Price"] || p.price || 0,
        sku: p.SKU || p.sku,
        partNumber: p["Part Number"] || p.part_number,
        partslotDescription: p["Part Product Type"] || p.partslot_description,
        image_url: p.image_url
      }));
      setProducts(mappedProducts);
      originalOnPartsFound?.(parts);
    };

    callbacks.onServicePackagesFound = (packages: unknown[]) => {
      setServicePackages(packages as ServicePackage[]);
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

  // Mobile/fullscreen variant - full viewport takeover
  if (variant === "mobile" || variant === "fullscreen") {
    return (
      <MobileBobLayout
        currentImage={currentImage}
        animationState={animationState}
        backdropUrl={backdropUrl}
        counterOverlayUrl={counterOverlayUrl}
        counterHeightPercent={counterHeightPercent}
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
        onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
        isResearching={isResearching}
        vehicle={bobChat.identifiedVehicle}
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
          onPackageSelect={(pkg) => console.log('[BobWidget] Package selected:', pkg)}
          isResearching={isResearching}
          vehicle={bobChat.identifiedVehicle}
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
          verticalOffset={verticalOffset}
          scale={scale}
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
