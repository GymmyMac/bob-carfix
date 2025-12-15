import { useEffect, useState, useRef } from "react";
import { BobCharacter } from "@/components/BobCharacter";
import { ChatInterface } from "@/components/ChatInterface";
import { ProductShelf } from "@/components/ProductShelf";
import { ProductShelfLoading } from "@/components/ProductShelfLoading";
import VehicleCard from "@/components/vehicle/VehicleCard";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useBobChat } from "@/hooks/useBobChat";
import { Product, APIPart, apiPartToProduct } from "@/types/product";
import { AdminButton } from "@/components/AdminButton";
import { useBobStateTransitions } from "@/hooks/useBobStateTransitions";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";
import { Vehicle } from "@/types/vehicle";
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
  
  // Synchronized product reveal state
  const [isResearching, setIsResearching] = useState(false);
  const pendingPartsRef = useRef<Product[]>([]);

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
    onStreamStart: stateTransitions.onStreamStart,
    onStreamComplete: stateTransitions.onStreamComplete,
    onVehicleIdentified: (vehicle) => {
      setDisplayedVehicle(vehicle);
    },
    onPartsFound: (parts: APIPart[]) => {
      // Store parts but don't display yet - wait for Bob to speak
      const products = parts.map(apiPartToProduct);
      pendingPartsRef.current = products;
    },
    onResearchStart: () => {
      // Show loading state when user sends message
      setIsResearching(true);
      pendingPartsRef.current = [];
    },
    onReadyToSpeak: () => {
      // Reveal products when Bob starts speaking
      if (pendingPartsRef.current.length > 0) {
        setDisplayedParts(pendingPartsRef.current);
      }
      setIsResearching(false);
    },
    onHighlightPart: (partType: string) => {
      console.log('Highlighting part type:', partType);
      setHighlightedPartType(partType);
      // Clear highlight after 8 seconds
      setTimeout(() => setHighlightedPartType(null), 8000);
    },
    onNoPartsFound: () => {
      console.log('No parts found - clearing research state');
      setIsResearching(false);
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
      {/* Navigation Bar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <AdminButton />
      </div>

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
                clearVehicle();
              }}
              initialExpanded={true}
            />
          )}
          {isResearching ? (
            <ProductShelfLoading />
          ) : (displayedVehicle || displayedParts.length > 0) ? (
            <ProductShelf 
              products={displayedParts}
              highlightedPartType={highlightedPartType}
              onProductClick={(product) => console.log("Product clicked:", product)}
            />
          ) : null}
        </div>
      </div>

      {/* Mobile/Tablet: Stacked layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Bob + Chat - Sticky on mobile */}
        <div className="sticky top-0 z-40 bg-background">
          <div className="px-4 pt-12">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
              backdropUrl={bobBgWall}
              counterOverlayUrl={bobCounter}
              counterHeightPercent={activeBackdrop?.counter_height_percent ?? 12}
              className="max-w-sm mx-auto"
              verticalOffset={getCurrentOffset()}
              scale={getCurrentScale()}
            />
          </div>
          
          <div className="px-4 pt-2 pb-4 max-h-[35vh] overflow-y-auto">
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

        {/* Products - Scrolls below Bob */}
        <div className="flex-1 py-8 px-4 flex flex-col gap-6 overflow-y-auto">
          {displayedVehicle && (
            <VehicleCard
              vehicle={displayedVehicle}
              onShopParts={(vehicle) => console.log("Shop parts for:", vehicle)}
              onChangeVehicle={() => {
                setDisplayedVehicle(null);
                setDisplayedParts([]);
                clearVehicle();
              }}
              initialExpanded={true}
            />
          )}
          {isResearching ? (
            <ProductShelfLoading />
          ) : (displayedVehicle || displayedParts.length > 0) ? (
            <ProductShelf 
              products={displayedParts}
              highlightedPartType={highlightedPartType}
              onProductClick={(product) => console.log("Product clicked:", product)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Index;
