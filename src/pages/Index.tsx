import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { BobCharacter } from "@/components/BobCharacter";
import { ChatInterface } from "@/components/ChatInterface";
import { ProductShelf } from "@/components/ProductShelf";
import { ProductShelfLoading } from "@/components/ProductShelfLoading";
import VehicleCard from "@/components/vehicle/VehicleCard";
import { ServicePackagesSection } from "@/components/ServicePackagesSection";
import { ServicePackageDetailDialog } from "@/components/ServicePackageDetailDialog";
import { ProductConfirmDialog } from "@/components/ProductConfirmDialog";
import { MobileBobLayout } from "@/components/mobile/MobileBobLayout";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useBobChat, HighlightedProduct } from "@/hooks/useBobChat";
import { useSessionHandoff } from "@/hooks/useSessionHandoff";
import { Product, APIPart, apiPartToProduct } from "@/types/product";

import { useBobStateTransitions } from "@/hooks/useBobStateTransitions";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";
import { Vehicle } from "@/types/vehicle";
import { ServicePackage } from "@/types/servicePackage";
import bobBgWall from "@/assets/bob-bg-wall.png";
import bobCounter from "@/assets/bob-counter.png";

const Index = () => {
  const { 
    animationState, 
    setAnimationState, 
    getCurrentImage, 
    getCurrentOffset,
    getCurrentScale,
    manualMode,
    setManualMode
  } = useBobAnimation();
  
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
  
  // Track request source to prevent auto-fetch from overwriting user requests
  const requestIdRef = useRef(0);
  const productSourceRef = useRef<'auto' | 'user' | null>(null);
  
  // Synchronized service packages reveal state
  const [displayedPackages, setDisplayedPackages] = useState<ServicePackage[]>([]);
  const pendingPackagesRef = useRef<ServicePackage[]>([]);
  
  // Track if we have multiple vehicle matches but no confirmed vehicle yet
  const [hasMultipleMatches, setHasMultipleMatches] = useState(false);
  
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
    clearVehicle
  } = useBobChat({ 
    setAnimationState, 
    manualMode,
    talkingState: getTalkingState() || "talk",
    thinkingState: getThinkingState() || "research",
    completeState: getCompleteState() || "complete",
    idleState: getIdleState() || "idle",
    listenState: getListenState() || "talk_pause",
    // Session handoff - pass initial vehicle and customer email
    initialVehicle: sessionData?.vehicle,
    customerEmail: sessionData?.user_email,
    onStreamStart: stateTransitions.onStreamStart,
    onStreamComplete: stateTransitions.onStreamComplete,
    onVehicleIdentified: (vehicle) => {
      setDisplayedVehicle(vehicle);
      // Vehicle is now confirmed - clear placeholder state
      setHasMultipleMatches(false);
      // Clear displayed placeholder packages - but DON'T clear pendingPackagesRef
      // Real packages arrive via SSE BEFORE vehicle_identified event
      setDisplayedPackages([]);
    },
    onMultipleVehiclesFound: () => {
      // Multiple matches found but not yet confirmed - show placeholders
      setHasMultipleMatches(true);
    },
    onPartsFound: (parts: APIPart[], isAutoFetch?: boolean) => {
      // Prevent auto-fetch from overwriting user request parts
      if (isAutoFetch && productSourceRef.current === 'user') {
        console.log('[Index] Ignoring auto-fetch parts - user request in progress');
        return;
      }
      
      const products = parts.map(apiPartToProduct);
      console.log('[Index] Parts received:', { count: products.length, isAutoFetch, source: productSourceRef.current });
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
      console.log("Service packages received from bob-chat:", packages.length);
      pendingPackagesRef.current = packages;
      // If this is from auto-fetch (no user message), display immediately
      if (sessionData?.vehicle) {
        setDisplayedPackages(packages);
      }
    },
    onResearchStart: () => {
      // User is sending a message - mark as user source and increment request ID
      requestIdRef.current += 1;
      productSourceRef.current = 'user';
      setIsResearching(true);
      pendingPartsRef.current = [];
      // Clear highlight when user sends new message
      setHighlightedPartType(null);
      setHighlightedProduct(null);
    },
    onReadyToSpeak: () => {
      // Reveal products and service packages when Bob starts speaking
      if (pendingPartsRef.current.length > 0) {
        setDisplayedParts(pendingPartsRef.current);
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
    },
    onCartUpdated: (items) => {
      const itemNames = items.map(i => i.productName).join(', ');
      toast.success(`Added to cart: ${itemNames}`);
    },
    onAutoFetchComplete: () => {
      console.log('Auto-fetch complete - products should be displayed');
    }
  });
  
  // Safety timeout - if researching for more than 30 seconds, clear it
  useEffect(() => {
    if (isResearching) {
      const timeout = setTimeout(() => {
        console.warn('Research timeout - clearing stuck state');
        setIsResearching(false);
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [isResearching]);
  
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

  return (
    <div className="min-h-screen bg-background">

      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Bob + Chat Area (Left) - STICKY */}
        <div className="w-[40%] h-screen sticky top-0 flex flex-col border-r border-border bg-background">
          <div className="pt-8 flex-shrink-0">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
              backdropUrl={bobBgWall}
              counterOverlayUrl={bobCounter}
              counterHeightPercent={activeBackdrop?.counter_height_percent ?? 12}
              verticalOffset={getCurrentOffset()}
              scale={getCurrentScale()}
            />
          </div>
          
          <div className="px-6 pb-8 pt-2 flex-1 min-h-0 flex flex-col overflow-hidden">
            <ChatInterface
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
          </div>
        </div>

        {/* Vehicle/Product Area (Right) - SCROLLABLE */}
        <div className="w-[60%] bg-background p-6 overflow-y-auto flex flex-col gap-6">
          {displayedVehicle && (
            <VehicleCard
              vehicle={displayedVehicle}
              onShopParts={(vehicle) => console.log("Shop parts for:", vehicle)}
              onChangeVehicle={() => {
                setDisplayedVehicle(null);
                setDisplayedParts([]);
                setDisplayedPackages([]);
                pendingPackagesRef.current = [];
                clearVehicle();
              }}
              initialExpanded={true}
            />
          )}
          {/* Service Packages - Above Product Shelf - Synchronized reveal */}
          {/* Show placeholders when multiple matches but no confirmed vehicle */}
          {hasMultipleMatches && !displayedVehicle && (
            <ServicePackagesSection
              packages={[]}
              isLoading={false}
              showPlaceholders={true}
              vehicleUnconfirmed={true}
            />
          )}
          {/* Show real packages when vehicle confirmed and packages available */}
          {displayedVehicle && displayedPackages.length > 0 && !isResearching && (
            <ServicePackagesSection
              packages={displayedPackages}
              isLoading={false}
              onPackageSelect={(pkg) => setSelectedPackage(pkg)}
            />
          )}
          {isResearching ? (
            <ProductShelfLoading />
          ) : (displayedVehicle || displayedParts.length > 0) ? (
            <ProductShelf 
              products={displayedParts}
              highlightedPartType={highlightedPartType}
              highlightedProduct={highlightedProduct}
              onProductClick={(product) => setConfirmProduct(product)}
            />
          ) : null}
        </div>
      </div>

      {/* Mobile/Tablet: Immersive full-screen layout */}
      <div className="lg:hidden">
        <MobileBobLayout
          currentImage={getCurrentImage()}
          animationState={animationState}
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
            clearVehicle();
          }}
        />
      </div>

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
          // Build message to send to Bob
          const qtyText = quantity > 1 ? `${quantity} of the` : 'the';
          const productDesc = product.brand 
            ? `${product.brand} ${product.name}` 
            : product.name;
          setInput(`Add ${qtyText} ${productDesc} to my cart`);
          // Trigger send after a brief delay to allow state update
          setTimeout(() => {
            handleSend();
          }, 100);
        }}
      />
    </div>
  );
};

export default Index;
