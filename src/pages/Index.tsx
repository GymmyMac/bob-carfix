import { useEffect } from "react";
import { BobCharacter } from "@/components/BobCharacter";
import { ChatInterface } from "@/components/ChatInterface";
import { ProductShelf } from "@/components/ProductShelf";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useBobChat } from "@/hooks/useBobChat";
import { PLACEHOLDER_PRODUCTS } from "@/types/product";
import { AdminButton } from "@/components/AdminButton";
import { useBobStateTransitions } from "@/hooks/useBobStateTransitions";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";

const Index = () => {
  const { 
    animationState, 
    setAnimationState, 
    getCurrentImage, 
    getCurrentOffset,
    setTalkSpeed,
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
    getIdleState 
  } = useBobAnimationConfig();
  
  // Initialize state transition system
  const stateTransitions = useBobStateTransitions({
    states,
    setAnimationState,
    setTalkSpeed,
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
    isSpeaking
  } = useBobChat({ 
    setAnimationState, 
    setTalkSpeed, 
    manualMode,
    talkingState: getTalkingState() || "talk",
    thinkingState: getThinkingState() || "research",
    completeState: getCompleteState() || "complete",
    idleState: getIdleState() || "idle",
    onStreamStart: stateTransitions.onStreamStart,
    onStreamComplete: stateTransitions.onStreamComplete
  });
  
  // Initialize page load state transition - wait for states to load
  useEffect(() => {
    if (!loading && states.length > 0) {
      stateTransitions.initialize();
    }
  }, [loading, states.length, stateTransitions]);

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
      <div className="hidden lg:grid lg:grid-cols-[40%_60%] min-h-screen">
        {/* Bob + Chat Area (Left) */}
        <div className="flex flex-col border-r border-border">
          <div className="pt-8 flex-shrink-0">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
              backdropUrl={activeBackdrop?.image_url}
              counterOverlayUrl={activeBackdrop?.counter_overlay_url ?? undefined}
              counterHeightPercent={activeBackdrop?.counter_height_percent ?? 12}
              verticalOffset={getCurrentOffset()}
            />
          </div>
          
          <div className="px-6 pb-8 pt-2 flex-1 min-h-0 flex flex-col">
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

        {/* Product Shelf Area (Right) */}
        <div className="bg-background">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>

      {/* Mobile/Tablet: Stacked layout */}
      <div className="lg:hidden">
        <div className="px-4">
          <div className="pt-12">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
              backdropUrl={activeBackdrop?.image_url}
              counterOverlayUrl={activeBackdrop?.counter_overlay_url ?? undefined}
              counterHeightPercent={activeBackdrop?.counter_height_percent ?? 12}
              className="max-w-sm mx-auto"
              verticalOffset={getCurrentOffset()}
            />
          </div>
          
          <div className="pt-2 pb-8 flex-1 min-h-0 flex flex-col">
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

        <div className="py-8">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
