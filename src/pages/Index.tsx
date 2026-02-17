import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { ServicePackageDetailDialog } from "@/components/ServicePackageDetailDialog";
import { ProductConfirmDialog } from "@/components/ProductConfirmDialog";
import { MobileBobLayoutCore } from "@bob-widget/components/mobile/MobileBobLayoutCore";
import { MobileChatDrawer } from "@bob-widget/components/mobile/MobileChatDrawer";
import { SwipeableBob } from "@bob-widget/components/SwipeableBob";
import { MatrixProductLoader, LoaderPhase } from "@bob-widget/components/MatrixProductLoader";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useBobChat, HighlightedProduct } from "@/hooks/useBobChat";
import { useSessionHandoff } from "@/hooks/useSessionHandoff";
import { Product, APIPart, apiPartToProduct } from "@/types/product";
import { useBobStateTransitions } from "@/hooks/useBobStateTransitions";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";
import { Vehicle, VariantCard } from "@/types/vehicle";
import { ServicePackage } from "@/types/servicePackage";
import bobBgWall from "@/assets/bob-bg-wall.png";
import bobCounter from "@/assets/bob-counter.png";

// No placeholder - Bob stays invisible until animation data loads

const Index = () => {
  // Shared isSpeaking state for animation sync
  const [isSpeakingForAnimation, setIsSpeakingForAnimation] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  
  // Theatrical entrance - Bob "arrives" only after shop AND data are ready
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  
  // Start minimum theatrical delay timer (shop needs time to render)
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setMinDelayPassed(true);
    }, 300);
    return () => clearTimeout(delayTimer);
  }, []);

  // Bob arrives when BOTH conditions are met:
  // 1. Minimum delay passed (shop backdrop rendered)
  // 2. Animation data is ready (has valid images)
  const bobHasArrived = minDelayPassed && isDataReady;
  
  const { 
    animationState, 
    setAnimationState, 
    getCurrentImage, 
    getCurrentOffset,
    getCurrentScale,
    manualMode,
    setManualMode,
    isLoading: animationLoading
  } = useBobAnimation({ isSpeaking: isSpeakingForAnimation });
  
  // Mark data ready once we have animation data (no longer blocks render)
  useEffect(() => {
    if (!animationLoading && animationState && getCurrentImage()) {
      setIsDataReady(true);
    }
  }, [animationLoading, animationState, getCurrentImage]);
  
  // Only show Bob's image once data is ready - he's invisible until then
  const currentBobImage = isDataReady ? (getCurrentImage() || '') : '';
  
  // Get backdrop data
  const { activeBackdrop } = useBobBackdrop();
  
  // Session handoff - check for ?session=TOKEN in URL
  const { sessionData, isLoading: sessionLoading, error: sessionError } = useSessionHandoff();
  
  // Get dynamic state keys and state data from database configuration
  const { 
    states,
    loading,
    getTalkingState, 
    getThinkingState, 
    getCompleteState, 
    getIdleState,
    getListenState 
  } = useBobAnimationConfig();
  
  // State for identified vehicle and parts
  const [displayedVehicle, setDisplayedVehicle] = useState<Vehicle | null>(null);
  const [displayedParts, setDisplayedParts] = useState<Product[]>([]);
  const [highlightedPartType, setHighlightedPartType] = useState<string | null>(null);
  const [highlightedProduct, setHighlightedProduct] = useState<HighlightedProduct | null>(null);
  
  // Synchronized product reveal state
  const [isResearching, setIsResearching] = useState(false);
  const pendingPartsRef = useRef<Product[]>([]);
  
  // Matrix loader phase control
  const [loaderPhase, setLoaderPhase] = useState<LoaderPhase>('hidden');
  
  // Track request source to prevent auto-fetch from overwriting user requests
  const requestIdRef = useRef(0);
  const productSourceRef = useRef<'auto' | 'user' | null>(null);
  
  // Synchronized service packages reveal state
  const [displayedPackages, setDisplayedPackages] = useState<ServicePackage[]>([]);
  const pendingPackagesRef = useRef<ServicePackage[]>([]);
  
  // Track if we have multiple vehicle matches but no confirmed vehicle yet
  const [hasMultipleMatches, setHasMultipleMatches] = useState(false);
  
  // NEW: Pending variant cards for selection UI
  const [pendingVariants, setPendingVariants] = useState<VariantCard[]>([]);
  const [pendingVariantMake, setPendingVariantMake] = useState<string>('');
  const [pendingVariantModel, setPendingVariantModel] = useState<string>('');
  
  // Selected service package for detail dialog
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  
  // Product confirmation dialog state
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);

  // Initialize state transition system
  const stateTransitions = useBobStateTransitions({
    states,
    setAnimationState,
    manualMode
  });
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSend,
    handleKeyPress,
    handleInputFocus,
    handleInputBlur,
    chatEndRef,
    clearMessages,
    isMuted,
    toggleMute,
    isSpeaking,
    identifiedVehicle,
    clearVehicle,
    stopSpeech,
    sendDirectMessage,
  } = useBobChat({
    setAnimationState, 
    manualMode,
    talkingState: getTalkingState() || "talk",
    thinkingState: getThinkingState() || "research",
    completeState: getCompleteState() || "complete",
    idleState: getIdleState() || "idle",
    listenState: getListenState() || "talk_pause",
    // Wire state transitions through centralized hook
    onStreamStart: stateTransitions.onStreamStart,
    onStreamComplete: stateTransitions.onStreamComplete,
    onResearchStart: () => {
      console.log('[Index] Research started - triggering state transition');
      // User is sending a message - mark as user source and increment request ID
      requestIdRef.current += 1;
      productSourceRef.current = 'user';
      stateTransitions.onUserInput();
      setIsResearching(true);
      setLoaderPhase('researching');
      pendingPartsRef.current = [];
      setHighlightedPartType(null);
      setHighlightedProduct(null);
      // NOTE: Do NOT clear pendingVariants here - keep cards visible while Bob is speaking
      // Variants are only cleared when vehicle_identified event is received
    },
    onVehicleIdentified: (vehicle) => {
      setDisplayedVehicle(vehicle);
      // Vehicle is now confirmed - clear placeholder state
      setHasMultipleMatches(false);
      // Clear variant cards NOW that we have a confirmed vehicle
      setPendingVariants([]);
      setPendingVariantMake('');
      setPendingVariantModel('');
      // Clear displayed placeholder packages - but DON'T clear pendingPackagesRef
      // Real packages arrive via SSE BEFORE vehicle_identified event
      setDisplayedPackages([]);
    },
    onMultipleVehiclesFound: () => {
      // Multiple matches found but not yet confirmed - show placeholders
      setHasMultipleMatches(true);
    },
    // NEW: Handle variant selection cards for UI
    onVariantSelectionRequired: (variants, make, model) => {
      console.log('[Index] Variant selection required:', variants.length, 'cards for', make, model);
      setPendingVariants(variants);
      setPendingVariantMake(make);
      setPendingVariantModel(model);
    },
    onPartsFound: (parts: APIPart[], isAutoFetch?: boolean) => {
      // Prevent auto-fetch from overwriting user request parts
      if (isAutoFetch && productSourceRef.current === 'user') {
        console.log('[Index] Ignoring auto-fetch parts - user request in progress');
        return;
      }
      
      // Debug logging only in development
      if (import.meta.env.DEV) {
        console.log('[Index] Parts received:', parts.length, 'items');
      }
      
      const products = parts.map(apiPartToProduct);
      
      pendingPartsRef.current = products;
      
      // Mark source and display
      if (isAutoFetch) {
        productSourceRef.current = 'auto';
        // Display immediately for auto-fetch
        if (sessionData?.vehicle) {
          console.log('[Index] Setting displayedParts from auto-fetch:', products.length);
          setDisplayedParts(products);
        }
      }
    },
    onServicePackagesFound: (packages: ServicePackage[]) => {
      // Store service packages but don't display yet - wait for Bob to speak (unless auto-fetch)
      // ✅ PARITY DEBUG: Detailed logging to verify clean payload arrival
      console.log("[Index] Service packages received:", {
        count: packages.length,
        packages: packages.map(p => ({
          id: p.id,
          title: p.title,
          from_price: p.from_price,
          hasPreparedTiers: !!p.preparedTiers,
          preparedTiersCount: p.preparedTiers?.length || 0,
          hasPartslots: !!(p as any).partslots,  // Should be FALSE after fix
          firstTier: p.preparedTiers?.[0] ? {
            tierName: p.preparedTiers[0].tierName,
            totalPrice: p.preparedTiers[0].totalPrice,
            productCount: p.preparedTiers[0].productCount,
            brands: p.preparedTiers[0].brands?.map(b => b.fullName || b.name),
          } : null
        }))
      });
      pendingPackagesRef.current = packages;
      // If this is from auto-fetch (no user message), display immediately
      if (sessionData?.vehicle) {
        setDisplayedPackages(packages);
      }
    },
    onReadyToSpeak: () => {
      // Reveal products and service packages when Bob starts speaking
      if (pendingPartsRef.current.length > 0) {
        setDisplayedParts(pendingPartsRef.current);
        setLoaderPhase('success');
      } else {
        setLoaderPhase('hidden');
      }
      if (pendingPackagesRef.current.length > 0) {
        setDisplayedPackages(pendingPackagesRef.current);
      }
      setIsResearching(false);
    },
    onHighlightPart: (partType: string) => {
      console.log('[Index] Highlighting part type:', partType);
      setHighlightedPartType(partType);
      // Don't auto-clear - highlight persists until next highlight or user message
    },
    onHighlightProduct: (product: HighlightedProduct) => {
      console.log('Spotlighting product:', product);
      setHighlightedProduct(product);
      // Clear spotlight after 10 seconds
      setTimeout(() => setHighlightedProduct(null), 10000);
    },
    onNoPartsFound: () => {
      console.log('No parts found - clearing research state');
      setIsResearching(false);
      setLoaderPhase('hidden');
    },
    onCartUpdated: (items) => {
      const itemNames = items.map(i => i.productName).join(', ');
      toast.success(`Added to cart: ${itemNames}`);
    },
    onAutoFetchComplete: () => {
      console.log('Auto-fetch complete - products should be displayed');
    }
  });
  
  // Sync isSpeaking to animation hook for talk animation lock
  useEffect(() => {
    setIsSpeakingForAnimation(isSpeaking);
  }, [isSpeaking]);
  
  // Safety timeout - if researching for more than 30 seconds, clear it AND the loader
  useEffect(() => {
    if (isResearching) {
      const timeout = setTimeout(() => {
        setIsResearching(false);
        setLoaderPhase('hidden');
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [isResearching]);
  
  // Guard: ensure loaderPhase resets when research ends
  useEffect(() => {
    if (!isResearching && (loaderPhase === 'researching' || loaderPhase === 'loading')) {
      setLoaderPhase('hidden');
    }
  }, [isResearching, loaderPhase]);
  
  // Initialize page load state transition - wait for states to load
  useEffect(() => {
    if (!loading && states.length > 0) {
      stateTransitions.initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, states.length]); // Intentionally exclude stateTransitions to prevent re-init

  // Pre-populate vehicle display from session data
  useEffect(() => {
    if (sessionData?.vehicle && !displayedVehicle) {
      console.log('Pre-populating vehicle from session:', sessionData.vehicle);
      setDisplayedVehicle(sessionData.vehicle);
    }
  }, [sessionData]);

  // Expose controls to AdminPanel via window object
  useEffect(() => {
    (window as any).bobAnimationControls = {
      animationState,
      setAnimationState,
      getCurrentImage,
      manualMode,
      setManualMode
    };
    (window as any).bobChatControls = {
      clearMessages
    };
  }, [animationState, getCurrentImage, manualMode, setAnimationState, setManualMode, clearMessages]);

  // NO LOADING SPINNER - Bob is shown immediately with placeholder image

  return (
    <div className="min-h-screen min-w-full bg-background">
      {/* SwipeableBob wrapper - allows users to swipe Bob off-screen */}
      <SwipeableBob isSpeaking={isSpeaking}>
        {/* Matrix Product Loader - z-10 to stay BEHIND Bob (z-60) */}
        <MatrixProductLoader
          phase={loaderPhase}
          onComplete={() => setLoaderPhase('hidden')}
        />
        
        {/* Bob character, backdrop, products - Uses placeholder until data ready */}
        <MobileBobLayoutCore
          currentImage={currentBobImage}
          animationState={animationState || 'idle'}
          backdropUrl={activeBackdrop?.image_url || bobBgWall}
          counterOverlayUrl={bobCounter}
          products={displayedParts}
          servicePackages={displayedPackages}
          highlightedPartType={highlightedPartType}
          highlightedProduct={highlightedProduct}
          onProductClick={(product) => setConfirmProduct(product)}
          onPackageSelect={(pkg) => setSelectedPackage(pkg)}
          isResearching={isResearching}
          vehicle={displayedVehicle}
          onChangeVehicle={() => {
            setDisplayedVehicle(null);
            setDisplayedParts([]);
            setDisplayedPackages([]);
            pendingPackagesRef.current = [];
            setPendingVariants([]);
            clearVehicle();
          }}
          bobHasArrived={bobHasArrived}
          // NEW: Variant selection props
          pendingVariants={pendingVariants}
          pendingVariantMake={pendingVariantMake}
          pendingVariantModel={pendingVariantModel}
          onVariantSelect={(variant) => {
            console.log('[Index] Variant selected:', variant.optionNumber, variant.displayTitle);
            // INTERRUPT Bob immediately - stop speech and trigger onEnd so animation resets
            stopSpeech();
            // Send directly without going through input state (avoids stale closure bug)
            sendDirectMessage(`Option ${variant.optionNumber}`);
          }}
        />
      </SwipeableBob>

      {/* Chat Drawer - OUTSIDE SwipeableBob to avoid CSS transform breaking position: fixed */}
      <MobileChatDrawer
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onInputFocus={handleInputFocus}
        onInputBlur={handleInputBlur}
        chatEndRef={chatEndRef}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isSpeaking={isSpeaking}
      />

      {/* Service Package Detail Dialog */}
      <ServicePackageDetailDialog
        package_={selectedPackage}
        open={!!selectedPackage}
        onOpenChange={(open) => !open && setSelectedPackage(null)}
      />

      {/* Product Confirmation Dialog */}
      <ProductConfirmDialog
        product={confirmProduct}
        open={!!confirmProduct}
        onOpenChange={(open) => !open && setConfirmProduct(null)}
        onConfirm={(product, quantity) => {
          const qtyText = quantity > 1 ? `${quantity} of the` : 'the';
          const productDesc = product.brand 
            ? `${product.brand} ${product.name}` 
            : product.name;
          setInput(`Add ${qtyText} ${productDesc} to my cart`);
          setTimeout(() => {
            handleSend();
          }, 100);
        }}
      />
    </div>
  );
};

export default Index;
