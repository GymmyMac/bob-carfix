import { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { Message } from "@/hooks/useBobChat";
import { Product } from "@/types/product";
import { ServicePackage } from "@/types/servicePackage";
import { Vehicle } from "@/types/vehicle";
import { HighlightedProduct } from "@/hooks/useBobChat";
import bobBgWall from "@/assets/bob-bg-wall.png";

// Panel visibility state machine to prevent dead zones
type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';

interface MobileBobLayoutProps {
  // Bob animation
  currentImage: string;
  animationState: string;
  
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
  
  // Vehicle
  vehicle?: Vehicle | null;
  onChangeVehicle?: () => void;
}

export const MobileBobLayout = ({
  currentImage,
  animationState,
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
  vehicle,
  onChangeVehicle
}: MobileBobLayoutProps) => {
  // Detect if we're embedded in an iframe (CARFIX context)
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  
  // Bob position state
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  
  // Panel state machine - eliminates the 400ms visibility dead zone
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
  // State machine for panel visibility
  useEffect(() => {
    console.log('[MobileBobLayout] State check:', { 
      isResearching, 
      hasProducts, 
      panelState, 
      bobPosition,
      productCount: products.length,
      packageCount: servicePackages.length
    });
    
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      // Research started - show loading immediately
      console.log('[MobileBobLayout] → loading state');
      setPanelState('loading');
      
      // Move Bob left if not already
      if (bobPosition === 'center') {
        setBobPosition('left');
      }
    } else if (hasProducts && panelState !== 'visible') {
      // Products arrived
      if (bobPosition === 'center') {
        // Need to slide Bob first
        console.log('[MobileBobLayout] → transitioning state (sliding Bob)');
        setBobPosition('left');
        setPanelState('transitioning');
        
        // After Bob's slide animation, show products
        const timer = setTimeout(() => {
          console.log('[MobileBobLayout] → visible state (after slide)');
          setPanelState('visible');
        }, 400);
        
        return () => clearTimeout(timer);
      } else {
        // Bob already left, show products immediately
        console.log('[MobileBobLayout] → visible state (Bob already left)');
        setPanelState('visible');
      }
    } else if (!hasProducts && !isResearching && panelState !== 'hidden') {
      // No products and not researching - hide panel and reset Bob
      console.log('[MobileBobLayout] → hidden state');
      setPanelState('hidden');
      setBobPosition('center');
    }
  }, [hasProducts, isResearching, panelState, bobPosition, products.length, servicePackages.length]);

  // Determine if product column should be visible
  // visible during: loading, transitioning, or visible states
  const showProductColumn = panelState !== 'hidden';

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        height: '100dvh', // Dynamic viewport height for mobile browsers
        touchAction: 'manipulation'
      }}
    >
      {/* Layer 1: Blurred Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bobBgWall})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          filter: 'blur(12px) brightness(0.7)',
          transform: 'scale(1.1)' // Prevent blur edge artifacts
        }}
      />
      
      {/* Gradient overlay for depth */}
      <div 
        className="absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(to bottom, hsla(var(--background) / 0.3) 0%, hsla(var(--background) / 0.6) 100%)'
        }}
      />

      {/* Layer 2: Bob Character - Bottom left, large with counter */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterHeightPercent={22}
        scale={200}
        position={bobPosition}
      />

      {/* Vehicle Context Bar - Top left (hidden when embedded in iframe) */}
      {vehicle && !isEmbedded && (
        <div className="absolute top-2 left-2 right-2 z-20">
          <div 
            className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 
                       border border-border shadow-lg flex items-center justify-between"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 4px) + 8px)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.rego && (
                <p className="text-[10px] text-muted-foreground">
                  {vehicle.rego}
                </p>
              )}
            </div>
            {onChangeVehicle && (
              <button
                onClick={onChangeVehicle}
                className="text-xs text-primary hover:underline ml-2 shrink-0"
              >
                Change
              </button>
            )}
          </div>
        </div>
      )}

      {/* Layer 3: Floating Product Column - Right side */}
      <MobileProductColumn
        products={products}
        servicePackages={servicePackages}
        highlightedPartType={highlightedPartType}
        highlightedProduct={highlightedProduct}
        onProductClick={onProductClick}
        onPackageSelect={onPackageSelect}
        isResearching={isResearching}
        visible={showProductColumn}
        counterHeightPercent={22}
      />

      {/* Layer 4: Collapsible Chat Drawer - Bottom */}
      <MobileChatDrawer
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
    </div>
  );
};
